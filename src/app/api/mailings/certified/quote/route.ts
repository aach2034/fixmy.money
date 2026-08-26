import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseLetterSource, loadCertifiedMailingContext } from '@/lib/mailing/certifiedMailingRecords';
import { quoteCertifiedMailing } from '@/lib/mailing/certifiedMailing';

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

    const quote = quoteCertifiedMailing(context.draft);
    const responseStatus = quote.available ? 200 : 503;
    return NextResponse.json({ quote, idempotencyKey: context.idempotencyKey }, { status: responseStatus });
  } catch {
    return NextResponse.json({ error: 'Could not prepare certified-mail quote.' }, { status: 500 });
  }
}
