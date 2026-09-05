import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { NormalizedReport } from '@/lib/creditReport/adapters';
import { stripRawReportArtifacts } from '@/lib/creditReport/aiPrivacy';
import { authorizeStaffClient, sameAuthorizedClient } from '@/lib/workspaces/authorization';

const CREDIT_BUREAUS = ['TransUnion', 'Experian', 'Equifax'];

interface TaggedItem {
  accountId: string; // adapter-generated id
  creditorName: string;
  furnisherName: string;
  bureau: string;
  bureaus: string[];
  accountNumberMasked: string;
  accountType: string;
  responsibility: string;
  dateOpened: string;
  accountStatus: string;
  balance: number | null;
  creditLimit: number | null;
  pastDue: number | null;
  dateReported: string;
  remarks: string[];
  originalCreditor: string;
  collectionAgency: string;
  isNegative: boolean;
  negativeReason: string;
  isCollection: boolean;
  isChargeOff: boolean;
  isLate: boolean;
  rawText: string;
  parserConfidence: number;
  tagStatus: 'dispute' | 'not_disputing' | 'needs_review' | 'exclude';
  disputeReason: string;
  disputeInstruction: string;
  notes: string;
}

function expandTaggedItemByBureau(item: TaggedItem): TaggedItem[] {
  const bureaus = (item.bureaus ?? []).filter(bureau => CREDIT_BUREAUS.includes(bureau));
  if (item.bureau !== 'Multiple' || bureaus.length <= 1) return [item];
  return bureaus.map(bureau => ({
    ...item,
    accountId: `${item.accountId}-${bureau}`.replace(/\s+/g, '-').toLowerCase(),
    bureau,
    bureaus: [bureau],
  }));
}

function itemsForPersistence(items: TaggedItem[]): TaggedItem[] {
  return items.flatMap(expandTaggedItemByBureau);
}

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
      parsedReportId,
      importId,
      clientId,
      taggedItems,
      allAccounts,
      parsed,
    }: {
      parsedReportId: string;
      importId: string;
      clientId: string;
      taggedItems: TaggedItem[];
      allAccounts: TaggedItem[];
      parsed: NormalizedReport;
    } = body;

    if (!parsedReportId || !clientId || !taggedItems) {
      return NextResponse.json({ error: 'parsedReportId, clientId, and taggedItems are required' }, { status: 400 });
    }

    const authorization = await authorizeStaffClient(supabase, user.id, clientId, 'write');
    if (!authorization) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 403 });
    }

    // ── Validate the report belongs to the authorized workspace/client ────────
    const { data: reportRow } = await supabase
      .from('parsed_credit_reports')
      .select('id, owner_id, client_id')
      .eq('id', parsedReportId)
      .eq('owner_id', authorization.workspaceOwnerId)
      .single();

    if (!reportRow) {
      return NextResponse.json({ error: 'Report not found or access denied' }, { status: 403 });
    }

    if (!sameAuthorizedClient(reportRow, authorization)) {
      return NextResponse.json({ error: 'Report/client mismatch' }, { status: 403 });
    }

    // ── Fetch existing negative_items for this report (dedup check) ───────────
    const { data: existingItems } = await supabase
      .from('negative_items')
      .select('id, creditor_name, account_number_masked, bureau')
      .eq('report_id', parsedReportId)
      .eq('owner_id', authorization.workspaceOwnerId)
      .eq('client_id', authorization.clientId);

    const existingKeys = new Set(
      (existingItems ?? []).map((i: any) =>
        `${i.creditor_name?.toLowerCase()}|${i.account_number_masked}|${i.bureau?.toLowerCase()}`
      )
    );

    // ── Save ALL accounts (tagged + untagged) as negative_items ───────────────
    const itemsToInsert = [];
    const disputeItemIds: string[] = [];
    let duplicatesSkipped = 0;
    const allItemsForPersistence = itemsForPersistence(allAccounts);
    const taggedItemsForPersistence = itemsForPersistence(taggedItems);

    for (const item of allItemsForPersistence) {
      const key = `${item.creditorName?.toLowerCase()}|${item.accountNumberMasked}|${item.bureau?.toLowerCase()}`;
      if (existingKeys.has(key)) {
        duplicatesSkipped++;
        continue;
      }

      const isDispute = item.tagStatus === 'dispute';
      const negCategory = item.isCollection ? 'collection' : item.isChargeOff ?'charge_off' : item.isLate ?'late_payment' : item.isNegative ?'other' :'other';

      itemsToInsert.push({
        owner_id: authorization.workspaceOwnerId,
        client_id: clientId,
        report_id: parsedReportId,
        source_import_id: parsedReportId,
        bureau: item.bureau || 'Unknown',
        creditor_name: item.creditorName,
        furnisher_name: item.furnisherName || item.creditorName,
        account_number_masked: item.accountNumberMasked,
        account_type: item.accountType,
        status: item.accountStatus,
        balance: item.balance,
        past_due: item.pastDue,
        date_opened: item.dateOpened,
        date_reported: item.dateReported,
        negative_reason: item.negativeReason,
        negative_category: negCategory,
        dispute_reason: item.disputeReason || '',
        dispute_instruction: item.disputeInstruction || '',
        dispute_status: isDispute ? 'ready' : 'draft',
        is_selected: isDispute,
        is_negative: item.isNegative,
        is_collection: item.isCollection,
        raw_text_source: '',
        parser_confidence: item.parserConfidence,
        remarks: item.remarks || [],
        bureaus_reporting: item.bureaus || [item.bureau],
        notes: item.notes || '',
        tag_status: item.tagStatus || 'unreviewed',
        tagged_at: isDispute ? new Date().toISOString() : null,
        tagged_by: isDispute ? user.id : null,
      });
    }

    // One RPC call is one Postgres transaction: items, snapshot, report status,
    // and import status either all commit or all roll back.
    const { data: transactionRows, error: transactionError } = await supabase.rpc(
      'finalize_credit_report_import_server',
      {
        p_actor_id: user.id,
        p_workspace_id: authorization.workspaceId,
        p_client_id: authorization.clientId,
        p_report_id: parsedReportId,
        p_import_id: importId || null,
        p_items: itemsToInsert,
        p_snapshot: {
          provider: parsed?.detectedProvider || 'unknown',
          report_date: parsed?.reportDate || '',
          snapshot_data: stripRawReportArtifacts(parsed || {}),
          scores: parsed?.scores || [],
          personal_info: parsed?.clientInfo || {},
          accounts_count: allItemsForPersistence.length,
          negative_count: allItemsForPersistence.filter(a => a.isNegative).length,
          tagged_count: taggedItemsForPersistence.length,
        },
      },
    );
    if (transactionError) {
      console.error('[TagAndSave] Transaction failed:', transactionError.code);
      return NextResponse.json({ error: 'Save failed; no partial import data was committed' }, { status: 500 });
    }
    const transaction = Array.isArray(transactionRows) ? transactionRows[0] : transactionRows;
    const savedCount = transaction?.saved_count ?? 0;
    const snapshot = { id: transaction?.snapshot_id };
    const { data: savedDisputes } = await supabase
      .from('negative_items')
      .select('id')
      .eq('report_id', parsedReportId)
      .eq('owner_id', authorization.workspaceOwnerId)
      .eq('client_id', authorization.clientId)
      .eq('tag_status', 'dispute');
    disputeItemIds.push(...(savedDisputes ?? []).map(row => row.id));

    // ── Diagnostic log ────────────────────────────────────────────────────────
    console.log('[TagAndSave] Save complete', {
      parsedReportId,
      importId,
      clientId,
      totalAccounts: allAccounts.length,
      savedCount,
      taggedForDispute: taggedItems.length,
      disputeItemIds: disputeItemIds.length,
      duplicatesSkipped,
      snapshotId: snapshot?.id,
    });

    return NextResponse.json({
      success: true,
      savedCount,
      taggedCount: taggedItems.length,
      disputeItemIds,
      duplicatesSkipped,
      snapshotId: snapshot?.id,
    });
  } catch (err: any) {
    console.error('[TagAndSave] Unexpected error:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Save failed' }, { status: 500 });
  }
}
