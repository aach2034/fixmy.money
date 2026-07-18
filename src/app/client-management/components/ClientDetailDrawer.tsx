'use client';
import React, { useState } from 'react';
import { X, Mail, Phone, FileText, CheckCircle2, Brain, Sparkles, AlertTriangle, TrendingUp, Calendar, Shield, ChevronRight, Plus, User, Upload, RefreshCw } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import ImportWizard from '@/components/ImportWizard';

interface Client {
  id: string; name: string; email: string; phone: string;
  enrolledDate: string; caseStage: string; activeDisputes: number;
  itemsDeleted: number; subscriptionStatus: string; plan: string;
  lastActivity: string; nextTaskDue: string; nextTaskLabel: string;
  assignedStaff: string; bureaus: string[]; score: number;
  reportAnalyzed?: boolean;
}

const TIMELINE = [
  { id: 'tl-001', date: 'Jun 1, 2026', event: 'Equifax response received', detail: '2 items deleted, 1 verified', type: 'success' },
  { id: 'tl-002', date: 'May 15, 2026', event: 'Letter sent to Equifax', detail: 'Round 2 — 3 items disputed', type: 'info' },
  { id: 'tl-003', date: 'Apr 28, 2026', event: 'TransUnion letter sent', detail: 'Round 1 — 4 items disputed', type: 'info' },
  { id: 'tl-004', date: 'Apr 14, 2026', event: 'Experian response received', detail: '3 items deleted successfully', type: 'success' },
  { id: 'tl-005', date: 'Mar 14, 2026', event: 'Client enrolled', detail: 'Starter plan · Keisha James assigned', type: 'neutral' },
];

const AI_RISK_FACTORS = [
  { label: 'High utilization ratio', severity: 'high' },
  { label: 'Multiple collection accounts', severity: 'high' },
  { label: 'Recent late payments', severity: 'medium' },
  { label: 'Short credit history', severity: 'low' },
];

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

const TABS = ['Overview', 'Disputes', 'AI Analysis', 'Notes', 'Billing'] as const;
type Tab = typeof TABS[number];

export default function ClientDetailDrawer({ client, onClose }: { client: Client; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const initials = client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex justify-end fade-in" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border-l border-slate-200 w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">

        {/* ── PROFILE HEADER ── */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors z-10">
            <X size={18} className="text-white/70" />
          </button>
          <div className="flex items-start gap-4 relative">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white">{client.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusBadge status={client.caseStage as 'active'} />
                <span className="text-xs text-blue-200">{client.plan} Plan</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-300 flex items-center gap-1"><Mail size={11} /> {client.email}</span>
              </div>
            </div>
          </div>
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Credit Score', value: client.score || '—', icon: TrendingUp, color: 'text-blue-300' },
              { label: 'Disputes', value: client.activeDisputes, icon: Shield, color: 'text-violet-300' },
              { label: 'Items Removed', value: client.itemsDeleted, icon: CheckCircle2, color: 'text-emerald-300' },
            ].map(kpi => {
              const KpiIcon = kpi.icon;
              return (
                <div key={kpi.label} className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm border border-white/10">
                  <KpiIcon size={14} className={`${kpi.color} mx-auto mb-1`} />
                  <p className="text-base font-bold text-white">{kpi.value}</p>
                  <p className="text-xs text-slate-400">{kpi.label}</p>
                </div>
              );
            })}
          </div>

          {/* ── Import / Audit Credit Report action ── */}
          <div className="mt-4 relative">
            <button
              onClick={() => setShowImportWizard(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                {client.reportAnalyzed ? (
                  <RefreshCw size={16} className="text-blue-300" />
                ) : (
                  <Upload size={16} className="text-blue-300" />
                )}
                <span className="text-sm font-semibold text-white">
                  {client.reportAnalyzed ? 'Re-import Updated Report' : 'Import / Audit Credit Report'}
                </span>
              </div>
              <ChevronRight size={14} className="text-white/60 group-hover:translate-x-1 transition-transform" />
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
              {t === 'AI Analysis' && <span className="ml-1 text-xs font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">AI</span>}
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
              {[
                { id: 'di-001', bureau: 'EQ', item: 'Collections — Midland Credit Mgmt', status: 'Awaiting Response', round: 2, amount: '$2,340', priority: 'high' },
                { id: 'di-002', bureau: 'EX', item: 'Late Payment — Chase Sapphire', status: 'Letter Sent', round: 1, amount: '90 days late', priority: 'medium' },
                { id: 'di-003', bureau: 'TU', item: 'Charge-Off — Capital One', status: 'Identified', round: 1, amount: '$1,890', priority: 'high' },
              ].map(d => (
                <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all">
                  <div className="flex items-start gap-3">
                    <span className={`badge text-xs shrink-0 ${d.bureau === 'EQ' ? 'bureau-eq' : d.bureau === 'EX' ? 'bureau-ex' : 'bureau-tu'}`}>{d.bureau}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{d.item}</p>
                      <p className="text-xs text-slate-500">{d.amount} · Round {d.round}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${d.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{d.priority}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-500">{d.status}</span>
                    <Link href={`/dispute-letter-management?client=${client.id}`} className="text-xs font-semibold text-blue-600 hover:underline">
                      Generate Letter →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI ANALYSIS */}
          {activeTab === 'AI Analysis' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-100 rounded-2xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Brain size={18} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">AI Credit Summary</p>
                    <p className="text-xs text-slate-500">Powered by FixMy AI</p>
                  </div>
                  <span className="ml-auto text-xs font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">AI</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  This client has <strong>3 high-priority dispute opportunities</strong> across all three bureaus. The collections account from Midland Credit Management is the highest-impact item — successful removal could improve their score by an estimated <strong>40-60 points</strong>. Recommend prioritizing Equifax round 2 response this week.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Risk Factors</p>
                <div className="space-y-2">
                  {AI_RISK_FACTORS.map(rf => (
                    <div key={rf.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <AlertTriangle size={14} className={rf.severity === 'high' ? 'text-red-500' : rf.severity === 'medium' ? 'text-amber-500' : 'text-slate-400'} />
                      <span className="text-sm text-slate-700 flex-1">{rf.label}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[rf.severity]}`}>{rf.severity}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href={`/ai-dispute-analyzer?client=${client.id}`} className="flex items-center justify-between p-4 bg-blue-600 rounded-2xl text-white hover:bg-blue-700 transition-colors group">
                <div className="flex items-center gap-3">
                  <Sparkles size={18} />
                  <div>
                    <p className="text-sm font-bold">Run Full AI Analysis</p>
                    <p className="text-xs text-blue-200">Generate complete action plan</p>
                  </div>
                </div>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
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
              {[
                { id: 'n1', author: 'Keisha James', date: 'Jun 1, 2026', text: 'Client called to confirm Equifax response received. Very happy with 2 deletions. Wants to proceed with round 3 for remaining items.' },
                { id: 'n2', author: 'Marcus Reed', date: 'May 15, 2026', text: 'Sent round 2 letters to Equifax. Client confirmed receipt of all documents. Follow up in 30 days.' },
              ].map(note => (
                <div key={note.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-900">{note.author}</p>
                    <p className="text-xs text-slate-400">{note.date}</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{note.text}</p>
                </div>
              ))}
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
                  <p>Next billing: Jul 1, 2026</p>
                  <p>Enrolled: {client.enrolledDate}</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice History</p>
              {[
                { id: 'inv-001', date: 'Jun 1, 2026', amount: '$99.00', status: 'paid' },
                { id: 'inv-002', date: 'May 1, 2026', amount: '$99.00', status: 'paid' },
                { id: 'inv-003', date: 'Apr 1, 2026', amount: '$99.00', status: 'paid' },
              ].map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{inv.amount}</p>
                    <p className="text-xs text-slate-400">{inv.date}</p>
                  </div>
                  <StatusBadge status={inv.status as 'paid'} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="border-t border-slate-200 p-4 flex gap-2 bg-slate-50">
          <Link href={`/dispute-letter-management?client=${client.id}`} className="flex-1 btn-primary py-2.5 text-center text-sm rounded-xl flex items-center justify-center gap-2">
            <FileText size={14} />
            Generate Letter
          </Link>
          <Link href={`/ai-dispute-analyzer?client=${client.id}`} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 transition-colors">
            <Brain size={14} />
            AI Analysis
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