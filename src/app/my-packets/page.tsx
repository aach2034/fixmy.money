import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { DownloadPacketButton } from './DownloadPacketButton';
import { SubmitSourceForm } from './SubmitSourceForm';

export const dynamic = 'force-dynamic';

export default async function MyPacketsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login?redirect=%2Fmy-packets');
  const { data: cycles, error } = await getAdminClient().from('consumer_service_cycles')
    .select('id,cycle_started_at,cycle_ends_at,completed_at,state')
    .eq('consumer_id', user.id).not('completed_at', 'is', null)
    .order('completed_at', { ascending: false }).limit(50);
  const intakeEnabled = process.env.PERSONAL_PACKET_WORKFLOW_ENABLED === 'true';
  const { data: activeCycles, error: activeError } = intakeEnabled
    ? await getAdminClient().from('consumer_service_cycles')
      .select('id,cycle_started_at,cycle_ends_at,state')
      .eq('consumer_id', user.id).eq('state', 'active_unbilled_service')
      .order('cycle_started_at', { ascending: false }).limit(10)
    : { data: [], error: null };
  return <section className="mx-auto max-w-3xl px-6 py-12">
    {intakeEnabled && activeCycles && activeCycles.length > 0 && <div className="mb-10">
      <h2 className="text-xl font-semibold">Submit a source report for an active review</h2>
      <p className="mt-2 text-sm text-slate-600">A saved report is only source material. A packet is completed separately after the service period and review checks.</p>
      {activeCycles.map(cycle => <div key={cycle.id} className="mt-4 rounded border border-slate-200 p-5">
        <p className="font-medium">Service period {new Date(cycle.cycle_started_at).toLocaleDateString('en-US')} – {new Date(cycle.cycle_ends_at).toLocaleDateString('en-US')}</p>
        <SubmitSourceForm cycleId={cycle.id} />
      </div>)}
    </div>}
    {intakeEnabled && activeError && <p role="alert">Source submission is temporarily unavailable.</p>}
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
