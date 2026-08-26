import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCertifiedMailSetupStatus, mapUspsTrackingStatus } from '@/lib/mailing/certifiedMailing';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mailingId: string }> }
) {
  try {
    const { mailingId } = await params;
    const body = await request.json().catch(() => ({}));
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const { data: mailing, error } = await supabase
      .from('certified_mailings')
      .select('id, owner_id, tracking_number, status')
      .eq('id', mailingId)
      .eq('owner_id', user.id)
      .single();
    if (error || !mailing) return NextResponse.json({ error: 'Certified mailing not found or access denied.' }, { status: 404 });

    const setup = getCertifiedMailSetupStatus();
    if (setup.mode !== 'test') {
      return NextResponse.json({
        error: 'USPS Tracking API is not configured.',
        setupRequired: setup.requirements,
      }, { status: 503 });
    }

    const uspsStatus = String(body?.uspsStatus ?? 'In Transit').trim();
    const status = mapUspsTrackingStatus(uspsStatus);
    const deliveredAt = status === 'delivered' ? new Date().toISOString() : null;
    const { data: updated, error: updateError } = await supabase
      .from('certified_mailings')
      .update({
        status,
        usps_status: uspsStatus,
        delivered_at: deliveredAt,
        last_tracked_at: new Date().toISOString(),
      })
      .eq('id', mailingId)
      .eq('owner_id', user.id)
      .select('*')
      .single();
    if (updateError) throw updateError;

    return NextResponse.json({ mailing: updated });
  } catch {
    return NextResponse.json({ error: 'Could not refresh USPS tracking.' }, { status: 500 });
  }
}
