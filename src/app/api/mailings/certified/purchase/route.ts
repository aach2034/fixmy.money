import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  assertNoDuplicateCertifiedMailing,
  createProviderLabelId,
  createTestCertifiedTrackingNumber,
  getCertifiedMailSetupStatus,
  quoteCertifiedMailing,
} from '@/lib/mailing/certifiedMailing';
import { loadCertifiedMailingContext, parseLetterSource } from '@/lib/mailing/certifiedMailingRecords';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  assertLettersMailable,
  authorizeLetterClient,
  markLettersMailed,
} from '@/lib/disputes/serverLetterOperations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const letterSource = parseLetterSource(body?.letterSource);
    const letterId = String(body?.letterId ?? '').trim();
    if (!letterSource || !letterId) {
      return NextResponse.json({ error: 'letterId and letterSource are required.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const { context, error, status } = await loadCertifiedMailingContext({
      supabase,
      userId: user.id,
      letterId,
      letterSource,
      returnReceiptElectronic: body?.returnReceiptElectronic === true,
    });
    if (!context) return NextResponse.json({ error }, { status });
    if (!context.letter.client_id) {
      return NextResponse.json({ error: 'This letter is not linked to a client profile.' }, { status: 422 });
    }
    const admin = getAdminClient();
    const authorization = await authorizeLetterClient({
      admin,
      actorUserId: user.id,
      clientId: context.letter.client_id,
    });
    await assertLettersMailable({
      admin,
      authorization,
      source: letterSource,
      letterIds: [letterId],
    });

    const column = letterSource === 'generated_dispute_letters' ? 'generated_dispute_letter_id' : 'dispute_letter_id';
    const { data: existing } = await supabase
      .from('certified_mailings')
      .select('id, status, tracking_number')
      .eq(column, letterId)
      .maybeSingle();
    assertNoDuplicateCertifiedMailing(existing as { tracking_number?: string | null; status?: string | null } | null);

    const setup = getCertifiedMailSetupStatus();
    const quote = quoteCertifiedMailing(context.draft);
    if (!quote.available || setup.mode !== 'test') {
      return NextResponse.json({
        error: 'USPS certified mail is not fully configured for live purchase.',
        setupRequired: quote.setupRequired,
      }, { status: 503 });
    }

    const trackingNumber = createTestCertifiedTrackingNumber({
      idempotencyKey: context.idempotencyKey,
      bureau: context.draft.bureau,
    });

    const insertPayload = {
      owner_id: context.letter.owner_id,
      client_id: context.letter.client_id,
      dispute_letter_id: letterSource === 'dispute_letters' ? letterId : null,
      generated_dispute_letter_id: letterSource === 'generated_dispute_letters' ? letterId : null,
      dispute_round_id: context.letter.round_id ?? null,
      bureau: context.draft.bureau,
      provider: 'usps',
      service_type: 'certified_mail',
      return_receipt_electronic: context.draft.returnReceiptElectronic,
      status: 'label_created',
      tracking_number: trackingNumber,
      amount_paid_cents: quote.amountCents,
      currency: quote.currency,
      sender_address: context.draft.senderAddress,
      destination_address: context.draft.destinationAddress,
      provider_request_id: context.idempotencyKey,
      provider_label_id: createProviderLabelId(),
      mailed_at: new Date().toISOString(),
    };

    const { data: mailing, error: insertError } = await supabase
      .from('certified_mailings')
      .insert(insertPayload)
      .select('*')
      .single();
    if (insertError) throw insertError;

    try {
      await markLettersMailed({
        admin,
        authorization,
        source: letterSource,
        letterIds: [letterId],
      });
    } catch (statusError) {
      const { error: cleanupError } = await admin
        .from('certified_mailings')
        .delete()
        .eq('id', mailing.id)
        .eq('owner_id', authorization.workspaceOwnerId)
        .eq('client_id', authorization.clientId);
      if (cleanupError) {
        console.error('[CertifiedMailing] Status failure compensation failed', { mailingId: mailing.id });
      }
      throw statusError;
    }

    return NextResponse.json({ mailing });
  } catch (err: any) {
    const message = err?.message ?? 'Could not purchase certified mailing.';
    const status = message.includes('already exists') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
