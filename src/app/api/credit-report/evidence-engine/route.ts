import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  calculateEvidenceStrength,
  detectPotentialIssues,
  normalizeCrossBureauAccounts,
} from '@/lib/disputeEngine/evidenceEngine';
import type { NormalizedAccount } from '@/lib/creditReport/adapters';

function asNormalizedAccount(row: any): NormalizedAccount {
  return {
    id: String(row.id ?? Math.random().toString(36).slice(2)),
    creditorName: row.creditorName ?? row.creditor_name ?? '',
    furnisherName: row.furnisherName ?? row.furnisher_name ?? row.creditorName ?? row.creditor_name ?? '',
    bureau: row.bureau ?? 'Unknown',
    bureaus: row.bureaus ?? row.bureaus_reporting ?? [row.bureau ?? 'Unknown'],
    accountNumberMasked: row.accountNumberMasked ?? row.account_number_masked ?? '',
    accountType: row.accountType ?? row.account_type ?? '',
    responsibility: row.responsibility ?? 'Individual',
    dateOpened: row.dateOpened ?? row.date_opened ?? '',
    accountStatus: row.accountStatus ?? row.status ?? '',
    paymentStatus: row.paymentStatus ?? row.payment_status ?? '',
    balance: row.balance ?? null,
    highBalance: row.highBalance ?? row.high_balance ?? null,
    creditLimit: row.creditLimit ?? row.credit_limit ?? null,
    pastDue: row.pastDue ?? row.past_due ?? null,
    monthlyPayment: row.monthlyPayment ?? null,
    lastPaymentDate: row.lastPaymentDate ?? row.last_payment_date ?? row.dateLastActivity ?? row.date_last_activity ?? '',
    dateReported: row.dateReported ?? row.date_reported ?? '',
    paymentHistory: row.paymentHistory ?? row.payment_history ?? '',
    remarks: row.remarks ?? [],
    originalCreditor: row.originalCreditor ?? row.original_creditor ?? '',
    collectionAgency: row.collectionAgency ?? row.collection_agency ?? '',
    isNegative: Boolean(row.isNegative ?? row.is_negative),
    negativeReason: row.negativeReason ?? row.negative_reason ?? '',
    isCollection: Boolean(row.isCollection ?? row.is_collection),
    isChargeOff: Boolean(row.isChargeOff ?? row.is_charge_off),
    isLate: Boolean(row.isLate ?? row.is_late),
    rawText: row.rawText ?? row.raw_text_source ?? '',
    parserConfidence: row.parserConfidence ?? row.parser_confidence ?? 0,
  };
}

function buildCaseNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `FM-${year}-${String(sequence).padStart(5, '0')}`;
}

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

    const { parsedReportId, clientId, importId, legacySnapshotId } = await request.json();
    if (!parsedReportId || !clientId) {
      return NextResponse.json({ error: 'parsedReportId and clientId are required' }, { status: 400 });
    }

    const { data: report, error: reportError } = await supabase
      .from('parsed_credit_reports')
      .select('id, owner_id, client_id, provider, report_date, all_accounts')
      .eq('id', parsedReportId)
      .eq('owner_id', user.id)
      .single();

    if (reportError || !report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    if (report.client_id && report.client_id !== clientId) {
      return NextResponse.json({ error: 'Report/client mismatch' }, { status: 403 });
    }

    const { data: clientRow } = await supabase
      .from('staff_clients')
      .select('id')
      .eq('id', clientId)
      .eq('owner_id', user.id)
      .single();

    if (!clientRow) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 403 });
    }

    const accounts = Array.isArray(report.all_accounts)
      ? report.all_accounts.map(asNormalizedAccount).filter((account: NormalizedAccount) => account.creditorName || account.furnisherName)
      : [];

    if (accounts.length === 0) {
      return NextResponse.json({ success: true, accounts: 0, issues: 0, cases: 0 });
    }

    const canonicalAccounts = normalizeCrossBureauAccounts(accounts);

    const { data: existingSnapshot } = await supabase
      .from('report_snapshots')
      .select('id')
      .eq('owner_id', user.id)
      .eq('parsed_report_id', parsedReportId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: reportSnapshot, error: snapshotError } = existingSnapshot
      ? { data: existingSnapshot, error: null }
      : await supabase.from('report_snapshots').insert({
        owner_id: user.id,
        client_id: clientId,
        parsed_report_id: parsedReportId,
        import_id: importId || null,
        legacy_credit_report_snapshot_id: legacySnapshotId || null,
        provider: report.provider ?? 'unknown',
        report_date: report.report_date ?? '',
        accounts_count: accounts.length,
        bureaus: [...new Set(accounts.map((account: NormalizedAccount) => account.bureau || 'Unknown'))],
        snapshot_data: { accounts: canonicalAccounts },
      })
      .select('id')
      .single();
    if (snapshotError) throw snapshotError;

    let normalizedCount = 0;
    let tradelineCount = 0;
    let issueCount = 0;
    let caseCount = 0;

    for (const canonical of canonicalAccounts) {
      const first = canonical.tradelines[0];
      const { data: creditAccount, error: accountError } = await supabase
        .from('credit_accounts')
        .upsert({
          owner_id: user.id,
          client_id: clientId,
          canonical_key: canonical.canonicalKey,
          display_name: canonical.displayName,
          creditor_name: first?.creditorName ?? canonical.displayName,
          furnisher_name: first?.furnisherName ?? canonical.displayName,
          account_number_masked: canonical.accountNumberMasked,
          account_type: canonical.accountType,
          original_creditor: canonical.originalCreditor,
          collection_agency: first?.collectionAgency ?? '',
          last_seen_snapshot_id: reportSnapshot.id,
          latest_reported_at: first?.dateReported ?? '',
          normalized_fields: canonical,
        }, { onConflict: 'owner_id,client_id,canonical_key' })
        .select('id')
        .single();
      if (accountError) throw accountError;
      normalizedCount++;

      const tradelineRows = canonical.tradelines.map(row => ({
        owner_id: user.id,
        client_id: clientId,
        credit_account_id: creditAccount.id,
        parsed_report_id: parsedReportId,
        bureau: row.bureau,
        creditor_name: row.creditorName,
        furnisher_name: row.furnisherName,
        account_number_masked: row.accountNumberMasked,
        account_type: row.accountType,
        original_creditor: row.originalCreditor,
        collection_agency: row.collectionAgency,
        account_status: row.accountStatus,
        payment_status: row.paymentStatus,
        balance: row.balance,
        credit_limit: row.creditLimit,
        past_due: row.pastDue,
        date_opened: row.dateOpened,
        date_reported: row.dateReported,
        last_payment_date: row.lastPaymentDate,
        payment_history: row.paymentHistory,
        remarks: row.remarks,
        raw_tradeline: row,
        parser_confidence: row.parserConfidence,
      }));
      if (tradelineRows.length > 0) {
        const { error: tradelineError } = await supabase.from('bureau_tradelines').insert(tradelineRows);
        if (tradelineError) throw tradelineError;
        tradelineCount += tradelineRows.length;
      }

      const issueRows = detectPotentialIssues(canonical);
      for (const issue of issueRows) {
        const { data: existingIssue } = await supabase
          .from('detected_issues')
          .select('id')
          .eq('owner_id', user.id)
          .eq('credit_account_id', creditAccount.id)
          .eq('report_snapshot_id', reportSnapshot.id)
          .eq('issue_type', issue.issueType)
          .limit(1)
          .maybeSingle();

        if (existingIssue) continue;

        const strength = calculateEvidenceStrength(issue, []);
        const { data: detectedIssue, error: issueError } = await supabase
          .from('detected_issues')
          .insert({
            owner_id: user.id,
            client_id: clientId,
            credit_account_id: creditAccount.id,
            report_snapshot_id: reportSnapshot.id,
            issue_type: issue.issueType,
            issue_label: issue.issueTitle,
            affected_bureaus: issue.affectedBureaus,
            affected_furnisher: issue.affectedFurnisher,
            reported_data: issue.reportedData,
            conflicting_data: issue.conflictingData,
            why_flagged: issue.whyFlagged,
            confidence_level: issue.confidenceLevel,
            evidence_currently_available: issue.evidenceCurrentlyAvailable,
            evidence_still_needed: issue.evidenceStillNeeded,
            evidence_strength: strength.strength,
            status: 'potential_issue',
          })
          .select('id')
          .single();
        if (issueError) throw issueError;
        issueCount++;

        const { data: existingCases } = await supabase
          .from('credit_cases')
          .select('id')
          .eq('owner_id', user.id)
          .eq('detected_issue_id', detectedIssue.id)
          .limit(1);

        if ((existingCases ?? []).length === 0) {
          const { count } = await supabase
            .from('credit_cases')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', user.id);
          const caseNumber = buildCaseNumber((count ?? 0) + 1);
          const { data: creditCase, error: caseError } = await supabase
            .from('credit_cases')
            .insert({
              owner_id: user.id,
              client_id: clientId,
              credit_account_id: creditAccount.id,
              detected_issue_id: detectedIssue.id,
              case_number: caseNumber,
              issue_summary: issue.factualBasis,
              responsible_party: issue.affectedFurnisher,
              evidence_strength: strength.strength,
              escalation_level: 1,
              case_status: 'evidence_gathering',
              recommended_next_action: strength.recommendedAction,
            })
            .select('id')
            .single();
          if (caseError) throw caseError;
          caseCount++;

          await supabase.from('case_events').insert({
            owner_id: user.id,
            client_id: clientId,
            credit_case_id: creditCase.id,
            event_type: 'potential_issue_detected',
            event_summary: issue.whyFlagged,
            event_data: { issueType: issue.issueType, affectedBureaus: issue.affectedBureaus, evidenceStrength: strength.strength },
            created_by: user.id,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      accounts: normalizedCount,
      tradelines: tradelineCount,
      issues: issueCount,
      cases: caseCount,
      reportSnapshotId: reportSnapshot.id,
    });
  } catch (err: any) {
    console.error('[EvidenceEngine] Failed:', err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? 'Evidence engine failed' }, { status: 500 });
  }
}
