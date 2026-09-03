'use client';
import React, { useEffect, useState } from 'react';
import { X, Mail, Phone, FileText, CheckCircle2, AlertTriangle, TrendingUp, Calendar, Shield, ChevronRight, Plus, User, Upload, RefreshCw } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import ImportWizard from '@/components/ImportWizard';
import { createClient } from '@/lib/supabase/client';
import { formatMissingMailingAddressError, normalizeClientMailingAddress, toCanonicalMailingAddressUpdate } from '@/lib/disputes/letterSender';
import { toast } from 'sonner';

interface Client {
  id: string; name: string; email: string; phone: string;
  enrolledDate: string; caseStage: string; activeDisputes: number;
  itemsDeleted: number; subscriptionStatus: string; plan: string;
  lastActivity: string; nextTaskDue: string; nextTaskLabel: string;
  assignedStaff: string; bureaus: string[]; score: number;
  reportAnalyzed?: boolean;
  address: string; city: string; state: string; zip: string;
}

const TIMELINE: Array<{ id: string; date: string; event: string; detail: string; type: string }> = [];
const TABS = ['Overview', 'Disputes', 'Notes', 'Billing'] as const;
type Tab = typeof TABS[number];

type ClientAddressUpdate = Pick<Client, 'id' | 'address' | 'city' | 'state' | 'zip'>;

export default function ClientDetailDrawer({ client, onClose, onClientUpdated }: { client: Client; onClose: () => void; onClientUpdated: (client: ClientAddressUpdate) => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [address, setAddress] = useState(client.address);
  const [city, setCity] = useState(client.city);
  const [state, setState] = useState(client.state);
  const [zip, setZip] = useState(client.zip);
  const [savingAddress, setSavingAddress] = useState(false);
  const [sendingPortalInvitation, setSendingPortalInvitation] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const supabase = createClient();
  const initials = client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    setAddress(client.address);
    setCity(client.city);
    setState(client.state);
    setZip(client.zip);
  }, [client]);

  const saveMailingAddress = async () => {
    const profile = { name: client.name, address, city, state, zip };
    const validationError = formatMissingMailingAddressError(profile);
    if (validationError) {
      setAddressError(validationError);
      return;
    }
    const update = toCanonicalMailingAddressUpdate(profile);
    if (!update) return;

    setSavingAddress(true);
    setAddressError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error: updateError } = await supabase
        .from('staff_clients')
        .update(update)
        .eq('id', client.id)
        ;
      if (updateError) throw updateError;

      const { data: saved, error: reloadError } = await supabase
        .from('staff_clients')
        .select('address, city, state, zip')
        .eq('id', client.id)

        .single();
      if (reloadError || !saved) throw new Error('Address saved but could not be reloaded.');
      const normalized = normalizeClientMailingAddress(saved);
      const updatedClient = { id: client.id, address: saved.address ?? '', city: saved.city ?? '', state: saved.state ?? '', zip: saved.zip ?? '' };
      setAddress(normalized.street + (normalized.line2 ? `\n${normalized.line2}` : ''));
      setCity(normalized.city);
      setState(normalized.state);
      setZip(normalized.postalCode);
      onClientUpdated(updatedClient);
      toast.success('Client mailing address saved');
    } catch (error: any) {
      setAddressError(error?.message ?? 'Could not save the mailing address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const sendPortalInvitation = async () => {
    setSendingPortalInvitation(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');
      const response = await fetch('/api/workspaces/client-invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clientId: client.id,
          email: client.email,
          clientName: client.name,
          assignedStaff: client.assignedStaff,
          clientPlan: client.plan,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.emailSent) throw new Error('Invitation email could not be sent');
      toast.success('Client portal invitation sent');
    } catch (error: any) {
      toast.error(error?.message ?? 'Could not send the client portal invitation.');
    } finally {
      setSendingPortalInvitation(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end fade-in" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border-l border-slate-200 w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">

        {/* ── PROFILE HEADER ── */}
        <div className="relative overflow-hidden border-b border-slate-200 bg-white p-6">
          <button onClick={onClose} className="absolute top-4 right-4 z-10 rounded-lg p-1.5 transition-colors hover:bg-slate-100" aria-label="Close client profile">
            <X size={18} className="text-slate-500" />
          </button>
          <div className="flex items-start gap-4 relative">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-950">{client.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusBadge status={client.caseStage as 'active'} />
                <span className="text-xs font-medium text-slate-500">{client.plan} Plan</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-600 flex items-center gap-1"><Mail size={11} /> {client.email}</span>
              </div>
            </div>
          </div>
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Credit Score', value: client.score || '—', icon: TrendingUp, color: 'text-blue-600' },
              { label: 'Disputes', value: client.activeDisputes, icon: Shield, color: 'text-teal-700' },
              { label: 'Items Removed', value: client.itemsDeleted, icon: CheckCircle2, color: 'text-emerald-600' },
            ].map(kpi => {
              const KpiIcon = kpi.icon;
              return (
                <div key={kpi.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <KpiIcon size={14} className={`${kpi.color} mx-auto mb-1`} />
                  <p className="text-base font-bold text-slate-950">{kpi.value}</p>
                  <p className="text-xs text-slate-500">{kpi.label}</p>
                </div>
              );
            })}
          </div>

          {/* ── Import / Audit Credit Report action ── */}
          <div className="mt-4 relative">
            <button
              onClick={() => setShowImportWizard(true)}
              className="group flex w-full items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 transition-colors hover:bg-green-100"
            >
              <div className="flex items-center gap-2.5">
                {client.reportAnalyzed ? (
                  <RefreshCw size={16} className="text-green-700" />
                ) : (
                  <Upload size={16} className="text-green-700" />
                )}
                <span className="text-sm font-semibold text-green-900">
                  {client.reportAnalyzed ? 'Re-import Updated Report' : 'Import / Audit Credit Report'}
                </span>
              </div>
              <ChevronRight size={14} className="text-green-700 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b border-slate-200 px-4 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* OVERVIEW */}
          {activeTab === 'Overview' && (
            <>
              {/* Contact info */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contact Information</p>
                <div className="flex items-center gap-2.5 text-sm text-slate-700">
                  <Mail size={14} className="text-slate-400 shrink-0" />
                  <span>{client.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-700">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span>{client.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-700">
                  <User size={14} className="text-slate-400 shrink-0" />
                  <span>Assigned to: {client.assignedStaff || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-700">
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                  <span>Enrolled: {client.enrolledDate}</span>
                </div>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                  disabled={sendingPortalInvitation}
                  onClick={sendPortalInvitation}
                >
                  <Mail size={13} />
                  {sendingPortalInvitation ? 'Sending invitation…' : 'Send portal invitation'}
                </button>
                <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mailing Address</p>
                  <textarea className="input-field min-h-16" aria-label="Street address" placeholder="Street address (apartment/unit optional)" value={address} onChange={event => setAddress(event.target.value)} />
                  <div className="grid grid-cols-3 gap-2">
                    <input className="input-field" aria-label="City" placeholder="City" value={city} onChange={event => setCity(event.target.value)} />
                    <input className="input-field" aria-label="State" placeholder="ST" maxLength={2} value={state} onChange={event => setState(event.target.value.toUpperCase())} />
                    <input className="input-field" aria-label="ZIP code" placeholder="ZIP" value={zip} onChange={event => setZip(event.target.value)} />
                  </div>
                  {addressError && <p className="text-xs text-red-600" role="alert">{addressError}</p>}
                  <button type="button" className="btn-primary px-3 py-2 text-xs" disabled={savingAddress} onClick={saveMailingAddress}>
                    {savingAddress ? 'Saving…' : 'Save mailing address'}
                  </button>
                </div>
              </div>

              {/* Next task */}
              {client.nextTaskLabel && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-800">Next Task Due</p>
                    <p className="text-sm text-amber-700">{client.nextTaskLabel}</p>
                    <p className="text-xs text-amber-600 mt-0.5">{client.nextTaskDue}</p>
                  </div>
                </div>
              )}

              {/* Bureaus */}
              {client.bureaus && client.bureaus.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Active Bureaus</p>
                  <div className="flex gap-2">
                    {client.bureaus.map(b => (
                      <span key={b} className={`badge text-xs ${b === 'Equifax' || b === 'EQ' ? 'bureau-eq' : b === 'Experian' || b === 'EX' ? 'bureau-ex' : 'bureau-tu'}`}>{b}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Case Timeline</p>
                <div className="relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                  <div className="space-y-4">
                    {TIMELINE.map(t => (
                      <div key={t.id} className="flex gap-3 relative">
                        <div className={`w-3.5 h-3.5 rounded-full mt-1 shrink-0 z-10 border-2 border-white ${t.type === 'success' ? 'bg-emerald-500' : t.type === 'info' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                        <div className="flex-1 pb-1">
                          <p className="text-sm font-semibold text-slate-900">{t.event}</p>
                          <p className="text-xs text-slate-500">{t.detail}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{t.date}</p>
                        </div>
                      </div>
                    ))}
                    {TIMELINE.length === 0 && <p className="text-sm text-slate-500 pl-6">No recorded case activity yet.</p>}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* DISPUTES */}
          {activeTab === 'Disputes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Dispute Items</p>
                <Link href="/dispute-letter-management" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  Generate Letter <ChevronRight size={12} />
                </Link>
              </div>
              <button
                onClick={() => setShowImportWizard(true)}
                className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-blue-300 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                <Upload size={14} />
                {client.reportAnalyzed ? 'Re-import Updated Report' : 'Import / Audit Credit Report'}
              </button>
              <Link
                href={`/clients/${client.id}/negative-items`}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:border-blue-200 transition-colors"
              >
                <span>View All Dispute Items</span>
                <ChevronRight size={12} />
              </Link>
              <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 p-4">Open the client&apos;s saved dispute items to view real report data.</p>
            </div>
          )}

          {/* NOTES */}
          {activeTab === 'Notes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Client Notes</p>
                <button className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  <Plus size={12} /> Add Note
                </button>
              </div>
              <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 p-4">No saved notes yet.</p>
            </div>
          )}

          {/* BILLING */}
          {activeTab === 'Billing' && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-slate-900">{client.plan} Plan</p>
                  <StatusBadge status={client.subscriptionStatus as 'paid'} />
                </div>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <p>Enrolled: {client.enrolledDate}</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice History</p>
              <p className="text-sm text-slate-500">No recorded invoices are available in this view.</p>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="border-t border-slate-200 p-4 flex gap-2 bg-slate-50">
          <Link href={`/dispute-letter-management?client=${client.id}`} className="w-full btn-primary py-2.5 text-center text-sm rounded-xl flex items-center justify-center gap-2">
            <FileText size={14} />
            Generate Letter
          </Link>
        </div>
      </div>

      {/* Import Wizard */}
      {showImportWizard && (
        <ImportWizard
          clientId={client.id}
          clientName={client.name}
          isReImport={client.reportAnalyzed}
          onClose={() => setShowImportWizard(false)}
          onComplete={(reportId) => {
            setShowImportWizard(false);
          }}
        />
      )}
    </div>
  );
}
