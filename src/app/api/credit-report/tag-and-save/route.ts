import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { NormalizedReport } from '@/lib/creditReport/adapters';

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

    // ── Validate ownership ────────────────────────────────────────────────────
    const { data: reportRow } = await supabase
      .from('parsed_credit_reports')
      .select('id, client_id')
      .eq('id', parsedReportId)
      .eq('owner_id', user.id)
      .single();

    if (!reportRow) {
      return NextResponse.json({ error: 'Report not found or access denied' }, { status: 403 });
    }

    // ── Fetch existing negative_items for this report (dedup check) ───────────
    const { data: existingItems } = await supabase
      .from('negative_items')
      .select('id, creditor_name, account_number_masked, bureau')
      .eq('report_id', parsedReportId)
      .eq('owner_id', user.id);

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
        owner_id: user.id,
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
        raw_text_source: (item.rawText || '').slice(0, 2000),
        parser_confidence: item.parserConfidence,
        remarks: item.remarks || [],
        bureaus_reporting: item.bureaus || [item.bureau],
        notes: item.notes || '',
        tag_status: item.tagStatus || 'unreviewed',
        tagged_at: isDispute ? new Date().toISOString() : null,
        tagged_by: isDispute ? user.id : null,
      });
    }

    let savedCount = 0;
    if (itemsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('negative_items')
        .insert(itemsToInsert)
        .select('id, tag_status');

      if (insertError) {
        console.error('[TagAndSave] Insert error:', insertError.message);
        return NextResponse.json({ error: 'Failed to save dispute items' }, { status: 500 });
      }

      savedCount = inserted?.length ?? 0;
      for (const row of (inserted ?? [])) {
        if (row.tag_status === 'dispute') disputeItemIds.push(row.id);
      }
    }

    // ── Save snapshot ─────────────────────────────────────────────────────────
    const { data: snapshot } = await supabase
      .from('credit_report_snapshots')
      .insert({
        owner_id: user.id,
        client_id: clientId,
        import_id: importId || null,
        parsed_report_id: parsedReportId,
        provider: parsed?.detectedProvider || 'unknown',
        report_date: parsed?.reportDate || '',
        snapshot_data: parsed || {},
        scores: parsed?.scores || [],
        personal_info: parsed?.clientInfo || {},
        accounts_count: allItemsForPersistence.length,
        negative_count: allItemsForPersistence.filter(a => a.isNegative).length,
        tagged_count: taggedItemsForPersistence.length,
      })
      .select()
      .single();

    // ── Update parsed_credit_reports ──────────────────────────────────────────
    await supabase
      .from('parsed_credit_reports')
      .update({
        status: 'saved',
        saved_at: new Date().toISOString(),
        tagged_count: taggedItems.length,
        snapshot_saved: true,
      })
      .eq('id', parsedReportId)
      .eq('owner_id', user.id);

    // ── Update import record ──────────────────────────────────────────────────
    if (importId) {
      await supabase
        .from('credit_report_imports')
        .update({
          import_status: 'saved',
          tagged_count: taggedItems.length,
          wizard_items_count: disputeItemIds.length,
          save_result: `Saved ${savedCount} accounts, ${taggedItems.length} tagged for dispute`,
        })
        .eq('id', importId)
        .eq('owner_id', user.id);
    }

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
