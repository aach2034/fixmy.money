import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { parseCreditReport, type ParsedCreditReport } from '@/lib/creditReport/parser';
import { isReliableInquiry } from '@/lib/creditReport/auditItems';

const PROTECTED_STATUSES = new Set(['sent', 'waiting_for_response', 'updated', 'verified', 'closed']);
const CREDIT_BUREAUS = ['TransUnion', 'Experian', 'Equifax'];
const APPROVED_MAINTENANCE_REPORTS: Record<string, string> = {
  '2693b3cc-00ae-4138-8404-ca5e418f5bca': '80dcdbd0-16d9-4324-9976-594002327bc7',
  'dc99abaa-b054-4744-83d9-3b620dc2f206': 'd52e00db-157a-4743-a3ab-90fdd94bb67d',
};

type ReparseRequestBody = {
  reportIds?: unknown;
};

function isReparseRequestBody(value: unknown): value is ReparseRequestBody {
  return typeof value === 'object' && value !== null;
}

function customerSafeError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

type ParsedAccountItem = ParsedCreditReport['accounts'][number];

function expandCanonicalAccountByBureau(account: ParsedAccountItem): ParsedAccountItem[] {
  const bureaus = (account.bureaus ?? []).filter(bureau => CREDIT_BUREAUS.includes(bureau));
  if (account.bureau !== 'Multiple' || bureaus.length <= 1) return [account];
  return bureaus.map(bureau => ({
    ...account,
    id: `${account.id}-${bureau}`.replace(/\s+/g, '-').toLowerCase(),
    bureau,
    bureaus: [bureau],
  }));
}

function accountsForPersistence(report: ParsedCreditReport): ParsedAccountItem[] {
  if (report.bureauTradelines?.length) return report.bureauTradelines;
  return report.accounts.flatMap(account => account.tradelines?.length ? account.tradelines : expandCanonicalAccountByBureau(account));
}

export async function POST(request: NextRequest) {
  const sessionClient = await createServerClient();
  const { data: { user: sessionUser } } = await sessionClient.auth.getUser();

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const maintenanceAuthorized = Boolean(
    process.env.REPARSE_MAINTENANCE_TOKEN &&
    request.headers.get('x-reparse-maintenance-token') === process.env.REPARSE_MAINTENANCE_TOKEN,
  );
  let user = sessionUser;
  if (!user) {
    const sitesEmail = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
    if (sitesEmail) {
      const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      user = usersPage?.users.find(candidate => candidate.email?.toLowerCase() === sitesEmail) ?? null;
    }
  }
  if (!user && !maintenanceAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = request.headers.get('content-type') ?? '';
  const parsedBody = contentType.includes('application/x-www-form-urlencoded')
    ? Object.fromEntries(await request.formData())
    : await request.json().catch((): ReparseRequestBody => ({}));
  const body: ReparseRequestBody = isReparseRequestBody(parsedBody) ? parsedBody : {};
  const submittedIds = Array.isArray(body.reportIds)
    ? body.reportIds
    : typeof body.reportIds === 'string'
      ? body.reportIds.split(',')
      : [];
  const reportIds = [...new Set(submittedIds.filter((id: unknown): id is string => typeof id === 'string'))].slice(0, 5);
  if (reportIds.length === 0) return NextResponse.json({ error: 'reportIds are required' }, { status: 400 });
  if (maintenanceAuthorized && !reportIds.every(id => APPROVED_MAINTENANCE_REPORTS[id])) {
    return NextResponse.json({ error: 'Maintenance repair is limited to the approved reports' }, { status: 403 });
  }

  let reportsQuery = admin
    .from('parsed_credit_reports')
    .select('id, owner_id, client_id, raw_text')
    .in('id', reportIds);
  if (!maintenanceAuthorized && user) reportsQuery = reportsQuery.eq('owner_id', user.id);
  const { data: reports, error: reportsError } = await reportsQuery;
  if (reportsError) return customerSafeError('We could not load the saved report. Please try again.');
  if ((reports ?? []).length !== reportIds.length) {
    return NextResponse.json({ error: 'One or more reports were not found or access was denied' }, { status: 403 });
  }

  const results = [];
  for (const report of reports ?? []) {
    if (maintenanceAuthorized && APPROVED_MAINTENANCE_REPORTS[report.id] !== report.owner_id) {
      return NextResponse.json({ error: `Ownership verification failed for report ${report.id}` }, { status: 403 });
    }
    const ownerId = maintenanceAuthorized ? report.owner_id : user!.id;
    const { data: oldItems, error: itemsError } = await admin
      .from('negative_items')
      .select('*')
      .eq('report_id', report.id)
      .eq('owner_id', ownerId);
    if (itemsError) return customerSafeError('We could not load the current report items. Please try again.');
    const ids = (oldItems ?? []).map(item => item.id);
    if ((oldItems ?? []).some(item => PROTECTED_STATUSES.has(item.dispute_status))) {
      return NextResponse.json({ error: `Report ${report.id} contains protected dispute items` }, { status: 409 });
    }
    if (ids.length > 0) {
      const { count, error: linksError } = await admin
        .from('dispute_round_items')
        .select('id', { count: 'exact', head: true })
        .in('negative_item_id', ids);
      if (linksError) return customerSafeError('We could not confirm whether this report is already in a dispute round. Please try again.');
      if ((count ?? 0) > 0) return NextResponse.json({ error: `Report ${report.id} is linked to a dispute round` }, { status: 409 });
    }

    const parsed = parseCreditReport(report.raw_text ?? '', 'myscoreiq');
    const accountItemsForPersistence = accountsForPersistence(parsed);
    const accountRows = accountItemsForPersistence.map(item => ({
      owner_id: ownerId,
      client_id: report.client_id,
      report_id: report.id,
      source_import_id: report.id,
      bureau: item.bureau,
      creditor_name: item.creditorName,
      furnisher_name: item.furnisherName,
      account_number_masked: item.accountNumberMasked,
      account_type: item.accountType,
      status: item.status,
      balance: item.balance,
      past_due: item.pastDue,
      date_opened: item.dateOpened,
      date_reported: item.dateReported,
      date_last_activity: item.dateLastActivity,
      negative_reason: item.negativeReason,
      negative_category: item.isCollection ? 'collection' : item.isChargeOff ? 'charge_off' : item.isLate ? 'late_payment' : 'other',
      dispute_status: 'draft',
      bureaus_reporting: item.bureaus,
      remarks: item.remarks,
      parser_confidence: item.parserConfidence,
      raw_text_source: (item.rawText ?? '').slice(0, 2000),
      is_negative: item.isNegative,
      is_collection: item.isCollection,
      is_selected: false,
      tag_status: 'unreviewed',
    }));
    const inquiryRows = parsed.inquiries.filter(item => item.type === 'hard' && isReliableInquiry({
      creditor_name: item.creditor,
      bureau: item.bureau,
      date_reported: item.date,
    })).map(item => ({
      owner_id: ownerId,
      client_id: report.client_id,
      report_id: report.id,
      source_import_id: report.id,
      bureau: item.bureau,
      creditor_name: item.creditor,
      account_type: 'Hard Inquiry',
      negative_reason: 'Hard inquiry',
      negative_category: 'hard_inquiry',
      date_reported: item.date,
      dispute_status: 'draft',
      bureaus_reporting: [item.bureau],
      is_negative: false,
      is_collection: false,
      is_selected: false,
      tag_status: 'unreviewed',
      raw_text_source: (item.rawText ?? '').slice(0, 2000),
    }));
    const replacementRows = [...accountRows, ...inquiryRows];
    if (replacementRows.length === 0) {
      return NextResponse.json({ error: `Reparse produced no items for report ${report.id}` }, { status: 422 });
    }

    const { error: deleteError } = await admin.from('negative_items').delete().eq('report_id', report.id).eq('owner_id', ownerId);
    if (deleteError) return customerSafeError('We could not replace the old parsed items. Please try again.');
    const { error: insertError } = await admin.from('negative_items').insert(replacementRows);
    if (insertError) {
      if ((oldItems ?? []).length > 0) await admin.from('negative_items').insert(oldItems!);
      return customerSafeError('The reparse failed, so we restored the original report items. Please try again.');
    }

    const { error: updateError } = await admin.from('parsed_credit_reports').update({
      accounts_count: accountItemsForPersistence.length,
      negative_count: accountItemsForPersistence.filter(item => item.isNegative).length,
      collections_count: accountItemsForPersistence.filter(item => item.isCollection).length,
      inquiries_count: parsed.inquiries.length,
      scores: parsed.scores,
      parser_version: parsed.parserVersion,
      updated_at: new Date().toISOString(),
    }).eq('id', report.id).eq('owner_id', ownerId);
    if (updateError) return customerSafeError('The items were updated, but the report summary could not be refreshed. Please try again.');

    results.push({
      reportId: report.id,
      oldItems: oldItems?.length ?? 0,
      newItems: replacementRows.length,
      accounts: accountItemsForPersistence.length,
      scores: parsed.scores,
      bureaus: Object.fromEntries(['TransUnion', 'Experian', 'Equifax'].map(bureau => [
        bureau,
        accountItemsForPersistence.filter(item => item.bureau === bureau).length,
      ])),
    });
  }

  return NextResponse.json({ success: true, results });
}
