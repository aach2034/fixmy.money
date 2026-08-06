import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { parseCreditReport } from '@/lib/creditReport/parser';

const PROTECTED_STATUSES = new Set(['sent', 'waiting_for_response', 'updated', 'verified', 'closed']);

export async function POST(request: NextRequest) {
  const sessionClient = await createServerClient();
  const { data: { user: sessionUser } } = await sessionClient.auth.getUser();

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  let user = sessionUser;
  if (!user) {
    const sitesEmail = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
    if (sitesEmail) {
      const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      user = usersPage?.users.find(candidate => candidate.email?.toLowerCase() === sitesEmail) ?? null;
    }
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = request.headers.get('content-type') ?? '';
  const body = contentType.includes('application/x-www-form-urlencoded')
    ? Object.fromEntries(await request.formData())
    : await request.json().catch(() => ({}));
  const submittedIds = Array.isArray(body.reportIds)
    ? body.reportIds
    : typeof body.reportIds === 'string'
      ? body.reportIds.split(',')
      : [];
  const reportIds = [...new Set(submittedIds.filter((id: unknown): id is string => typeof id === 'string'))].slice(0, 5);
  if (reportIds.length === 0) return NextResponse.json({ error: 'reportIds are required' }, { status: 400 });

  const { data: reports, error: reportsError } = await admin
    .from('parsed_credit_reports')
    .select('id, owner_id, client_id, raw_text')
    .in('id', reportIds)
    .eq('owner_id', user.id);
  if (reportsError) return NextResponse.json({ error: reportsError.message }, { status: 500 });
  if ((reports ?? []).length !== reportIds.length) {
    return NextResponse.json({ error: 'One or more reports were not found or access was denied' }, { status: 403 });
  }

  const results = [];
  for (const report of reports ?? []) {
    const { data: oldItems, error: itemsError } = await admin
      .from('negative_items')
      .select('*')
      .eq('report_id', report.id)
      .eq('owner_id', user.id);
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });
    const ids = (oldItems ?? []).map(item => item.id);
    if ((oldItems ?? []).some(item => PROTECTED_STATUSES.has(item.dispute_status))) {
      return NextResponse.json({ error: `Report ${report.id} contains protected dispute items` }, { status: 409 });
    }
    if (ids.length > 0) {
      const { count, error: linksError } = await admin
        .from('dispute_round_items')
        .select('id', { count: 'exact', head: true })
        .in('negative_item_id', ids);
      if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });
      if ((count ?? 0) > 0) return NextResponse.json({ error: `Report ${report.id} is linked to a dispute round` }, { status: 409 });
    }

    const parsed = parseCreditReport(report.raw_text ?? '', 'myscoreiq');
    const accountRows = parsed.accounts.map(item => ({
      owner_id: user.id,
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
    const inquiryRows = parsed.inquiries.filter(item => item.type === 'hard').map(item => ({
      owner_id: user.id,
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

    const { error: deleteError } = await admin.from('negative_items').delete().eq('report_id', report.id).eq('owner_id', user.id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    const { error: insertError } = await admin.from('negative_items').insert(replacementRows);
    if (insertError) {
      if ((oldItems ?? []).length > 0) await admin.from('negative_items').insert(oldItems!);
      return NextResponse.json({ error: `Reparse failed and original items were restored: ${insertError.message}` }, { status: 500 });
    }

    const { error: updateError } = await admin.from('parsed_credit_reports').update({
      accounts_count: parsed.accounts.length,
      negative_count: parsed.negativeAccounts.length,
      collections_count: parsed.collections.length,
      inquiries_count: parsed.inquiries.length,
      scores: parsed.scores,
      parser_version: '2.1.0',
      updated_at: new Date().toISOString(),
    }).eq('id', report.id).eq('owner_id', user.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    results.push({
      reportId: report.id,
      oldItems: oldItems?.length ?? 0,
      newItems: replacementRows.length,
      accounts: parsed.accounts.length,
      scores: parsed.scores,
      bureaus: Object.fromEntries(['TransUnion', 'Experian', 'Equifax'].map(bureau => [
        bureau,
        parsed.accounts.filter(item => item.bureau === bureau).length,
      ])),
    });
  }

  return NextResponse.json({ success: true, results });
}
