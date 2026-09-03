import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseWithAdapter } from '@/lib/creditReport/adapters';
import { safeNormalizeText } from '@/lib/creditReport/parser';
import { authorizeStaffClient, type AuthorizedStaffClient } from '@/lib/workspaces/authorization';

/**
 * Adam Hamilton Report Repair
 * 
 * Finds Adam Hamilton's most recent parsed_credit_reports record,
 * re-runs it through the correct provider adapter with Unicode normalization,
 * and returns the parse review results without modifying existing dispute data.
 * 
 * This is a safe, read-only repair preview — it does NOT automatically save
 * or create dispute items. The user must review and use the import wizard to save.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Find Adam Hamilton's client record ────────────────────────────────────
    const { data: clients } = await supabase
      .from('staff_clients')
      .select('id, name')
      .ilike('name', '%adam%hamilton%')
      .limit(5);

    let adamClient: { id: string; name: string } | null = null;
    let authorization: AuthorizedStaffClient | null = null;
    for (const candidate of clients ?? []) {
      const candidateAuthorization = await authorizeStaffClient(supabase, user.id, candidate.id, 'read');
      if (candidateAuthorization) {
        adamClient = candidate;
        authorization = candidateAuthorization;
        break;
      }
    }

    if (!adamClient || !authorization) {
      return NextResponse.json({
        error: 'Adam Hamilton client record not found. Please ensure the client exists in your account.',
        errorCode: 'CLIENT_NOT_FOUND',
      }, { status: 404 });
    }

    // ── Find most recent parsed report ────────────────────────────────────────
    const { data: reports } = await supabase
      .from('parsed_credit_reports')
      .select('*')
      .eq('client_id', adamClient.id)
      .eq('owner_id', authorization.workspaceOwnerId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!reports || reports.length === 0) {
      return NextResponse.json({
        error: 'No parsed credit report found for Adam Hamilton. Please import a report first.',
        errorCode: 'NO_REPORT_FOUND',
        clientId: adamClient.id,
        clientName: adamClient.name,
      }, { status: 404 });
    }

    const report = reports[0];

    // ── Get existing negative items (to preserve them) ────────────────────────
    const { data: existingItems } = await supabase
      .from('negative_items')
      .select('id, creditor_name, account_number_masked, bureau, dispute_status, tag_status')
      .eq('client_id', adamClient.id)
      .eq('owner_id', authorization.workspaceOwnerId);

    // ── Re-run with Unicode normalization ─────────────────────────────────────
    const rawText = report.raw_text ?? '';
    const normalizedText = safeNormalizeText(rawText);
    const unicodeWarnings = rawText.length > 0 && Math.abs(rawText.length - normalizedText.length) > 50 ? 1 : 0;

    // Use stored provider, fall back to auto-detect
    const provider = (report.provider && report.provider !== 'unknown')
      ? report.provider
      : 'unknown';

    const reparsed = parseWithAdapter(normalizedText, provider as any);

    // ── Check existing TransUnion items ───────────────────────────────────────
    const tuItems = (existingItems ?? []).filter((i: any) =>
      i.bureau?.toLowerCase().includes('transunion') ||
      i.bureau?.toLowerCase() === 'tu'
    );

    const tuAccountsInReparsed = reparsed.accounts.filter(a =>
      a.bureau?.toLowerCase().includes('transunion') ||
      a.bureau?.toLowerCase() === 'tu'
    );

    // ── Diagnostic log ────────────────────────────────────────────────────────
    console.log('[AdamHamiltonRepair] Repair preview complete', {
      clientId: adamClient.id,
      reportId: report.id,
      originalProvider: report.provider,
      reparsedProvider: reparsed.detectedProvider,
      providerConfidence: reparsed.providerConfidence,
      adapterUsed: reparsed.adapterUsed,
      originalAccountCount: report.accounts_count,
      reparsedAccountCount: reparsed.accounts.length,
      reparsedNegativeCount: reparsed.accounts.filter(a => a.isNegative).length,
      tuAccountsInReparsed: tuAccountsInReparsed.length,
      existingTuItems: tuItems.length,
      unicodeWarnings,
      overallConfidence: reparsed.sectionConfidence.overall,
      warnings: reparsed.warnings.map(w => ({ section: w.section, severity: w.severity })),
    });

    return NextResponse.json({
      success: true,
      clientId: adamClient.id,
      clientName: adamClient.name,
      reportId: report.id,
      originalReport: {
        provider: report.provider,
        providerConfidence: report.provider_confidence,
        accountsCount: report.accounts_count,
        negativeCount: report.negative_count,
        overallConfidence: report.overall_confidence,
        status: report.status,
        createdAt: report.created_at,
      },
      reparsed: {
        detectedProvider: reparsed.detectedProvider,
        providerConfidence: reparsed.providerConfidence,
        adapterUsed: reparsed.adapterUsed,
        accountsParsed: reparsed.accountsParsed,
        negativeCount: reparsed.accounts.filter(a => a.isNegative).length,
        tuAccountsCount: tuAccountsInReparsed.length,
        scores: reparsed.scores,
        sectionConfidence: reparsed.sectionConfidence,
        warnings: reparsed.warnings,
        unicodeWarnings,
      },
      existingData: {
        totalNegativeItems: existingItems?.length ?? 0,
        tuItems: tuItems.length,
        preservedItems: existingItems?.length ?? 0,
      },
      instructions: [
        'Review the reparsed results above.',
        'Open Adam Hamilton\'s client profile and click "Import / Audit Credit Report".',
        'Select the same provider and re-upload or paste the report.',
        'Review and tag TransUnion dispute items.',
        'Click "Tag and Save Report" to create permanent dispute items.',
        'Continue to the Dispute Wizard to generate letters.',
      ],
    });
  } catch (err: any) {
    console.error('[AdamHamiltonRepair] Error:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Repair failed' }, { status: 500 });
  }
}
