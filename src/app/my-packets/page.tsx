import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { DownloadPacketButton } from './DownloadPacketButton';

export const dynamic = 'force-dynamic';

export default async function MyPacketsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login?redirect=%2Fmy-packets');
  const { data: cycles, error } = await getAdminClient().from('consumer_service_cycles')
    .select('id,cycle_started_at,cycle_ends_at,completed_at,state')
    .eq('consumer_id', user.id).not('completed_at', 'is', null)
    .order('completed_at', { ascending: false }).limit(50);
  return <section className="mx-auto max-w-3xl px-6 py-12">
    <h1 className="text-2xl font-semibold">Your completed review packets</h1>
    <p className="mt-2 text-sm text-slate-600">Previously completed packets remain available even if future paid tools are paused.</p>
    {error ? <p className="mt-6" role="alert">Packets are temporarily unavailable.</p>
      : !cycles?.length ? <p className="mt-6">No completed packets are available yet.</p>
        : <ul className="mt-8 space-y-4">{cycles.map(cycle => <li key={cycle.id}
          className="rounded border border-slate-200 p-5">
          <p className="font-medium">Service period {new Date(cycle.cycle_started_at).toLocaleDateString('en-US')} – {new Date(cycle.cycle_ends_at).toLocaleDateString('en-US')}</p>
          <p className="mb-3 text-sm text-slate-600">Completed {new Date(cycle.completed_at).toLocaleDateString('en-US')}</p>
          <DownloadPacketButton cycleId={cycle.id} />
        </li>)}</ul>}
  </section>;
}
