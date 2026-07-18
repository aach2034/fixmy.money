import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseWithAdapter, compareReports, type NormalizedReport } from '@/lib/creditReport/adapters';
import { safeNormalizeText, type SupportedProvider } from '@/lib/creditReport/parser';

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      importId,
      clientId,
      provider = 'unknown',
      textContent,
      importMethod = 'upload',
    } = body;

    if (!importId || !clientId || !textContent) {
      return NextResponse.json({ error: 'importId, clientId, and textContent are required' }, { status: 400 });
    }

    // ── Validate import record belongs to this user ───────────────────────────
    const { data: importRecord } = await supabase
      .from('credit_report_imports')
      .select('*')
      .eq('id', importId)
      .eq('owner_id', user.id)
      .single();

    if (!importRecord) {
      return NextResponse.json({ error: 'Import record not found' }, { status: 404 });
    }

    // ── Unicode normalization ─────────────────────────────────────────────────
    const normalizedText = safeNormalizeText(textContent);
    const unicodeWarnings = textContent.length - normalizedText.length > 100 ? 1 : 0;

    // ── Run provider adapter ──────────────────────────────────────────────────
    const providerKey = provider as SupportedProvider;
    const parsed: NormalizedReport = parseWithAdapter(normalizedText, providerKey);

    // ── Determine import status ───────────────────────────────────────────────
    const isLowConfidence = parsed.sectionConfidence.overall < 40;
    const importStatus = isLowConfidence ? 'needs_review' : 'parsed';

    // ── Check for previous snapshot (re-import) ───────────────────────────────
    const { data: previousSnapshot } = await supabase
      .from('credit_report_snapshots')
      .select('*')
      .eq('client_id', clientId)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let comparison = null;
    if (previousSnapshot?.snapshot_data) {
      try {
        const prevReport = previousSnapshot.snapshot_data as NormalizedReport;
        comparison = compareReports(prevReport, parsed, parsed.sectionConfidence.accounts > 50);
      } catch {
        // comparison is optional — don't fail the parse
      }
    }

    // ── Save parsed report to parsed_credit_reports ───────────────────────────
    const { data: parsedReport, error: saveError } = await supabase
      .from('parsed_credit_reports')
      .insert({
        owner_id: user.id,
        client_id: clientId,
        provider: parsed.detectedProvider,
        provider_confidence: parsed.providerConfidence,
        parser_version: parsed.parserVersion,
        overall_confidence: parsed.sectionConfidence.overall,
        sections_parsed: Object.keys(parsed.sectionConfidence).filter(
          k => (parsed.sectionConfidence as any)[k] > 0
        ),
        sections_missed: parsed.unsupportedSections,
        warnings: parsed.warnings,
        personal_info: parsed.clientInfo,
        scores: parsed.scores,
        accounts_count: parsed.accounts.length,
        negative_count: parsed.accounts.filter(a => a.isNegative).length,
        collections_count: parsed.collections.length,
        inquiries_count: parsed.inquiries.length,
        public_records_count: parsed.publicRecords.length,
        raw_text: normalizedText.slice(0, 50000), // cap stored raw text
        file_name: importRecord.file_name,
        file_type: importRecord.file_type,
        status: importStatus,
        import_method: importMethod,
        all_inquiries: parsed.inquiries,
        public_records: parsed.publicRecords,
        section_confidence: parsed.sectionConfidence,
        all_accounts: parsed.accounts,
        report_date: parsed.reportDate,
        importing_user_id: user.id,
      })
      .select()
      .single();

    if (saveError) {
      console.error('[ParseReport] Failed to save parsed report:', saveError.message);
      return NextResponse.json({ error: 'Failed to save parsed report' }, { status: 500 });
    }

    // ── Update import record ──────────────────────────────────────────────────
    await supabase
      .from('credit_report_imports')
      .update({
        detected_provider: parsed.detectedProvider,
        provider_confidence: parsed.providerConfidence,
        parser_adapter: parsed.adapterUsed,
        parser_version: parsed.parserVersion,
        import_status: importStatus,
        sections_detected: Object.keys(parsed.sectionConfidence),
        accounts_parsed: parsed.accountsParsed,
        accounts_rejected: parsed.accountsRejected,
        negative_count: parsed.accounts.filter(a => a.isNegative).length,
        unicode_warnings: unicodeWarnings,
        parsed_report_id: parsedReport.id,
        diagnostic_log: {
          importId,
          clientId,
          selectedProvider: provider,
          detectedProvider: parsed.detectedProvider,
          adapterUsed: parsed.adapterUsed,
          parserVersion: parsed.parserVersion,
          sectionsDetected: Object.keys(parsed.sectionConfidence),
          accountCountByBureau: parsed.accounts.reduce((acc: Record<string, number>, a) => {
            acc[a.bureau] = (acc[a.bureau] || 0) + 1;
            return acc;
          }, {}),
          potentiallyNegativeCount: parsed.accounts.filter(a => a.isNegative).length,
          duplicateMatches: 0,
          unmatchedRecords: parsed.accountsRejected,
          unicodeNormalizationWarnings: unicodeWarnings,
          warnings: parsed.warnings.map(w => ({ section: w.section, severity: w.severity })),
        },
      })
      .eq('id', importId)
      .eq('owner_id', user.id);

    // ── Diagnostic log ────────────────────────────────────────────────────────
    console.log('[ParseReport] Parse complete', {
      importId,
      clientId,
      selectedProvider: provider,
      detectedProvider: parsed.detectedProvider,
      providerConfidence: parsed.providerConfidence,
      adapterUsed: parsed.adapterUsed,
      accountsParsed: parsed.accountsParsed,
      negativeCount: parsed.accounts.filter(a => a.isNegative).length,
      overallConfidence: parsed.sectionConfidence.overall,
      importStatus,
      hasComparison: !!comparison,
    });

    return NextResponse.json({
      success: true,
      parsedReportId: parsedReport.id,
      parsed,
      comparison,
      importStatus,
      isLowConfidence,
    });
  } catch (err: any) {
    console.error('[ParseReport] Unexpected error:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Parse failed' }, { status: 500 });
  }
}
