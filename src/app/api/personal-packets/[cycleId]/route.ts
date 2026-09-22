import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store' },
});

/** Historical packets remain readable even if future paid tools are suspended. */
export async function GET(_request: NextRequest, context: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await context.params;
  if (!UUID.test(cycleId)) return json({ error: 'not_found' }, 404);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'authentication_required' }, 401);
  const admin = getAdminClient();
  const { data: cycle, error } = await admin.from('consumer_service_cycles')
    .select('id,state,cycle_started_at,cycle_ends_at,packet_storage_path,packet_sha256,completed_at')
    .eq('id', cycleId).eq('consumer_id', user.id).maybeSingle();
  if (error || !cycle) return json({ error: 'not_found' }, 404);
  if (!cycle.packet_storage_path || !cycle.packet_sha256 || !cycle.completed_at) {
    return json({ id: cycle.id, state: cycle.state, packetAvailable: false });
  }
  if (!cycle.packet_storage_path.startsWith(`${user.id}/${cycleId}/`)) return json({ error: 'packet_unavailable' }, 503);
  const { data: signed, error: storageError } = await admin.storage
    .from('personal-review-packets').createSignedUrl(cycle.packet_storage_path, 60);
  if (storageError || !signed?.signedUrl) return json({ error: 'packet_unavailable' }, 503);
  const { error: auditError } = await admin.from('consumer_service_audit_events').insert({
    cycle_id: cycleId,
    event_type: 'packet_accessed',
    actor_id: user.id,
    actor_kind: 'system',
    evidence_ref: cycle.packet_sha256,
  });
  if (auditError) return json({ error: 'packet_unavailable' }, 503);
  return json({ id: cycle.id, state: cycle.state, packetAvailable: true,
    completedPeriodStart: cycle.cycle_started_at, completedPeriodEnd: cycle.cycle_ends_at,
    packetSha256: cycle.packet_sha256, url: signed.signedUrl });
}
