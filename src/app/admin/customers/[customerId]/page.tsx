import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { addAdminNote, createFollowUp, toggleFollowUp, updateCustomerClassification, updateRetentionAlert } from '@/app/admin/actions';
import { requirePlatformAdmin } from '@/lib/admin/authorization';
import { getAdminCustomerProfile } from '@/lib/admin/customerManagement';

export const metadata: Metadata = {
  title: 'Customer 360 | FixMy.Money Admin',
  robots: { index: false, follow: false },
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default async function AdminCustomerProfilePage({ params }: { params: Promise<{ customerId: string }> }) {
  await requirePlatformAdmin();
  const { customerId } = await params;
  const profile = await getAdminCustomerProfile(customerId);
  if (!profile) notFound();

  const { summary } = profile;
  const customerLabel = summary.fullName || summary.companyName || summary.email;
  const accountAgeDays = summary.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(summary.createdAt).getTime()) / 86_400_000)) : 0;

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/customers" className="text-sm font-bold text-blue-600">← Customer directory</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">Customer 360</p>
            <h1 className="mt-2 text-3xl font-black">{customerLabel}</h1>
            <p className="mt-2 text-sm text-slate-500">{summary.email} · {summary.id}</p>
          </div>
          <div className={summary.attentionLevel === 'red' ? 'rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800' : summary.attentionLevel === 'yellow' ? 'rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800' : 'rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800'}>
            <p className="text-xs font-black uppercase">Attention: {summary.attentionLevel}</p>
            <p className="mt-1 max-w-md text-sm">{summary.attentionReasons.join(' — ') || 'No current retention flags.'}</p>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ['Reports', summary.reportsImported],
            ['Negative items', summary.negativeItems],
            ['Dispute rounds', summary.disputeRounds],
            ['Letters', summary.lettersGenerated],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Identity & subscription</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><dt className="text-xs font-bold uppercase text-slate-400">Name</dt><dd className="mt-1">{summary.fullName || '—'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-slate-400">Company</dt><dd className="mt-1">{summary.companyName || '—'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-slate-400">Created</dt><dd className="mt-1">{formatDateTime(summary.createdAt)}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-slate-400">Account age</dt><dd className="mt-1">{accountAgeDays} days</dd></div>
                <div><dt className="text-xs font-bold uppercase text-slate-400">Plan</dt><dd className="mt-1">{summary.subscriptionPlan || '—'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-slate-400">Subscription status</dt><dd className="mt-1">{summary.subscriptionStatus}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-slate-400">Stripe customer</dt><dd className="mt-1">{summary.stripeCustomerId ? 'Configured' : '—'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-slate-400">Trial end</dt><dd className="mt-1">{formatDate(summary.trialEnd)}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-slate-400">Onboarding</dt><dd className="mt-1">{summary.onboardingCompleted ? 'Complete' : 'Incomplete'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-slate-400">Customer type</dt><dd className="mt-1 capitalize">{summary.customerType}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-slate-400">Contact status</dt><dd className="mt-1">{summary.doNotContact ? 'Do not contact' : 'Contact allowed'}</dd></div>
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Billing and retention signals</h2>
              <p className="mt-2 text-sm text-slate-500">Existing subscription state and stored Stripe webhook events only. Full payment credentials are not shown.</p>
              <div className="mt-4 divide-y divide-slate-100">
                {profile.billingEvents.map((event, index) => (
                  <div key={`${event.event_type}-${event.created_at}-${index}`} className="py-3">
                    <p className="font-bold">{event.event_type}</p>
                    <p className="mt-1 text-sm text-slate-500">{event.status || 'received'} · {formatDateTime(event.stripe_created_at || event.created_at)}</p>
                  </div>
                ))}
                {profile.billingEvents.length === 0 && <p className="py-4 text-sm text-slate-500">No stored billing events for this customer.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Credit reports</h2>
              <div className="mt-4 divide-y divide-slate-100">
                {profile.reports.map((report) => (
                  <div key={report.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">{report.provider || 'Unknown provider'} · {report.status || report.import_status || 'unknown'}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(report.created_at)} · {report.negative_count ?? 0} negative · {report.accounts_count ?? 0} accounts</p>
                      </div>
                      {report.client_id ? <Link href={`/clients/${report.client_id}/reports/${report.id}/review`} className="text-sm font-bold text-blue-600">Open review</Link> : null}
                    </div>
                  </div>
                ))}
                {profile.reports.length === 0 && <p className="py-4 text-sm text-slate-500">No imported reports.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Disputes and letters</h2>
              <div className="mt-4 divide-y divide-slate-100">
                {profile.disputeRounds.map((round) => (
                  <div key={round.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">{round.title || `Round ${round.round_number ?? ''}`} · {round.status}</p>
                        <p className="mt-1 text-sm text-slate-500">{round.items_count ?? 0} items · {(round.bureaus ?? []).join(', ') || 'No bureau'} · {round.letters_generated ?? 0} letters</p>
                      </div>
                      {round.client_id ? <Link href={`/clients/${round.client_id}/disputes/${round.id}`} className="text-sm font-bold text-blue-600">Open round</Link> : null}
                    </div>
                  </div>
                ))}
                {profile.disputeRounds.length === 0 && <p className="py-4 text-sm text-slate-500">No dispute rounds generated.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Journey timeline</h2>
              <div className="mt-4 space-y-4">
                {profile.timeline.map((event, index) => (
                  <div key={`${event.label}-${event.at}-${index}`} className="border-l-2 border-blue-200 pl-4">
                    <p className="font-bold">{event.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDateTime(event.at)} · {event.detail}</p>
                  </div>
                ))}
                {profile.timeline.length === 0 && <p className="text-sm text-slate-500">No timeline events available.</p>}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Classification</h2>
              <p className="mt-1 text-sm text-slate-500">Controls whether this account appears in default retention metrics.</p>
              <form action={updateCustomerClassification} className="mt-4 space-y-3">
                <input type="hidden" name="customerId" value={summary.id} />
                <select name="customerType" defaultValue={summary.customerType} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200">
                  {['real', 'internal', 'qa', 'demo', 'test'].map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input name="doNotContact" type="checkbox" defaultChecked={summary.doNotContact} className="h-4 w-4 rounded border-slate-300" />
                  Do not contact
                </label>
                <input name="classificationNote" placeholder="Optional classification note" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                <button className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Save classification</button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Retention alerts</h2>
              <div className="mt-4 space-y-3">
                {summary.attentionIssues.map((issue) => (
                  <div key={issue.key} className="rounded-xl border border-slate-100 p-3">
                    <p className="text-sm font-bold text-slate-800">{issue.label}</p>
                    <p className="mt-1 text-sm text-blue-700">Recommended action: {issue.recommendedAction}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        ['contacted', 'Contacted', 'Customer contacted from profile.'],
                        ['dismissed', 'Dismiss', 'Not actionable.'],
                        ['snoozed', 'Snooze 3d', 'Follow up later.'],
                      ].map(([status, label, reason]) => (
                        <form key={status} action={updateRetentionAlert}>
                          <input type="hidden" name="customerId" value={summary.id} />
                          <input type="hidden" name="alertKey" value={issue.key} />
                          <input type="hidden" name="status" value={status} />
                          <input type="hidden" name="reason" value={reason} />
                          <input type="hidden" name="snoozeDays" value="3" />
                          <button className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:border-blue-200 hover:text-blue-700">{label}</button>
                        </form>
                      ))}
                    </div>
                  </div>
                ))}
                {summary.attentionIssues.length === 0 && <p className="text-sm text-slate-500">No active retention alerts.</p>}
              </div>
              {profile.alertStates.length > 0 ? (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-xs font-black uppercase text-slate-400">Recent dispositions</p>
                  <div className="mt-3 space-y-2">
                    {profile.alertStates.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{alert.alert_key}</span> · {alert.status}
                        {alert.snoozed_until ? ` until ${formatDate(alert.snoozed_until)}` : ''} · {formatDateTime(alert.updated_at || alert.created_at)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Internal notes</h2>
              <form action={addAdminNote} className="mt-4 space-y-3">
                <input type="hidden" name="customerId" value={summary.id} />
                <textarea name="noteText" required rows={4} placeholder="Record an internal customer note…" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                <button className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Add note</button>
              </form>
              <div className="mt-5 space-y-3">
                {profile.notes.map((note) => (
                  <div key={note.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm text-slate-800">{note.note_text}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDateTime(note.created_at)}</p>
                  </div>
                ))}
                {profile.notes.length === 0 && <p className="text-sm text-slate-500">No admin notes yet.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Follow-ups</h2>
              <form action={createFollowUp} className="mt-4 space-y-3">
                <input type="hidden" name="customerId" value={summary.id} />
                <input name="description" required placeholder="Follow-up description" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                <input name="dueDate" required type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                <button className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Create follow-up</button>
              </form>
              <div className="mt-5 space-y-3">
                {profile.followUps.map((task) => (
                  <div key={task.id} className="rounded-xl border border-slate-100 p-3">
                    <p className={task.completed ? 'text-sm text-slate-400 line-through' : 'text-sm text-slate-800'}>{task.description}</p>
                    <p className="mt-1 text-xs text-slate-400">Due {formatDate(task.due_date)}</p>
                    <form action={toggleFollowUp} className="mt-3">
                      <input type="hidden" name="customerId" value={summary.id} />
                      <input type="hidden" name="followUpId" value={task.id} />
                      <input type="hidden" name="completed" value={String(task.completed)} />
                      <button className="text-xs font-bold text-blue-600">{task.completed ? 'Reopen' : 'Mark complete'}</button>
                    </form>
                  </div>
                ))}
                {profile.followUps.length === 0 && <p className="text-sm text-slate-500">No follow-ups yet.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Admin audit</h2>
              <div className="mt-4 space-y-3">
                {profile.adminAudit.map((entry) => (
                  <div key={entry.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-bold">{entry.action}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(entry.created_at)}</p>
                  </div>
                ))}
                {profile.adminAudit.length === 0 && <p className="text-sm text-slate-500">No admin actions recorded.</p>}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
