'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Users, FileText, CreditCard, Shield, BarChart3, MessageSquare, BookOpen, GitBranch, ClipboardList, ArrowRight, AlertTriangle, X, ChevronRight, CheckCircle2, Eye, Download, Send } from 'lucide-react';
import {
  DEMO_AGENCY, DEMO_CLIENTS, DEMO_DISPUTES, DEMO_LETTERS,
  DEMO_DOCUMENTS, DEMO_AUDIT_LOG, DEMO_ANALYTICS, DEMO_TEAM,
  DEMO_INVOICES, DEMO_CROA_STAGES
} from '@/lib/demo/demoData';
import Icon from '@/components/ui/AppIcon';


type DemoSection =
  | 'dashboard' | 'clients' | 'client-profile' | 'credit-report' |'disputes' | 'letters' | 'documents' | 'messages' | 'croa'
  | 'billing' | 'analytics' | 'audit-log' | 'team';

const NAV_ITEMS: { id: DemoSection; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'credit-report', label: 'Credit Reports', icon: Eye },
  { id: 'disputes', label: 'Disputes', icon: Shield },
  { id: 'letters', label: 'Letters', icon: FileText },
  { id: 'documents', label: 'Documents', icon: BookOpen },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'croa', label: 'CROA Workflow', icon: GitBranch },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'audit-log', label: 'Audit Log', icon: ClipboardList },
  { id: 'team', label: 'Team', icon: Users },
];

function DemoBadge() {
  return (
    <div className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full">
      <AlertTriangle size={12} />
      Demo Data — Not Real Client Records
    </div>
  );
}

function BlockedAction({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 text-sm font-medium px-4 py-2 rounded-lg cursor-not-allowed"
        title="Disabled in demo mode"
      >
        {label}
      </button>
      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-900">Demo Mode</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              This action is disabled in demo mode. Start a $1 trial to use all features with your real clients.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShow(false)} className="flex-1 text-sm text-slate-600 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50">
                Close
              </button>
              <Link href="/sign-up-login-screen?tab=register" className="flex-1 text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-lg text-center hover:bg-blue-700">
                Sign Up for $1 Trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-blue-100 text-blue-700',
    onboarding: 'bg-amber-100 text-amber-700',
    pending: 'bg-slate-100 text-slate-600',
    pending_response: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    sent: 'bg-emerald-100 text-emerald-700',
    draft: 'bg-slate-100 text-slate-600',
    paid: 'bg-emerald-100 text-emerald-700',
    eligible: 'bg-emerald-100 text-emerald-700',
    not_started: 'bg-slate-100 text-slate-600',
  };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  );
}

// ── Section Components ──────────────────────────────────────────────────────

function DashboardSection({ onNavigate }: { onNavigate: (s: DemoSection) => void }) {
  const a = DEMO_ANALYTICS;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Agency Dashboard</h2>
        <p className="text-sm text-slate-500">{DEMO_AGENCY.name} · {DEMO_AGENCY.subtitle}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Clients', value: a.activeClients, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Disputes', value: a.totalDisputes - a.resolvedDisputes, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Items Removed', value: a.itemsRemoved, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Monthly Revenue', value: `$${a.monthlyRevenue}`, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(m => (
          <div key={m.label} className={`${m.bg} rounded-2xl p-4`}>
            <p className="text-xs font-semibold text-slate-500 mb-1">{m.label}</p>
            <p className={`text-2xl font-extrabold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="font-bold text-slate-900 mb-3 text-sm">Recent Clients</h3>
          <div className="space-y-2">
            {DEMO_CLIENTS.slice(0, 4).map(c => (
              <button key={c.id} onClick={() => onNavigate('clients')} className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg text-left">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.stage}</p>
                </div>
                <StatusBadge status={c.status} />
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="font-bold text-slate-900 mb-3 text-sm">Recent Activity</h3>
          <div className="space-y-2">
            {DEMO_AUDIT_LOG.slice(0, 4).map(log => (
              <div key={log.id} className="flex items-start gap-2 p-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{log.action}</p>
                  <p className="text-xs text-slate-400">{log.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientsSection({ onSelectClient }: { onSelectClient: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Clients</h2>
        <BlockedAction label="+ Add Client" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Stage</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">Score Δ</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DEMO_CLIENTS.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.email}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-600">{c.stage}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {c.improvement > 0 ? (
                    <span className="text-emerald-600 font-bold">+{c.improvement} pts</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => onSelectClient(c.id)} className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1">
                    View <ChevronRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClientProfileSection({ clientId }: { clientId: string }) {
  const client = DEMO_CLIENTS.find(c => c.id === clientId) || DEMO_CLIENTS[0];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">{client.name}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Client Info</h3>
          {[
            ['Email', client.email],
            ['Phone', client.phone],
            ['SSN', client.ssn],
            ['DOB', client.dob],
            ['Stage', client.stage],
            ['Start Date', client.startDate],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-slate-500">{k}</span>
              <span className="font-medium text-slate-800">{v}</span>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Credit Scores</h3>
          {client.creditScore.equifax > 0 ? (
            <div className="space-y-3">
              {[
                { bureau: 'Equifax', score: client.creditScore.equifax, initial: client.initialScore.equifax },
                { bureau: 'Experian', score: client.creditScore.experian, initial: client.initialScore.experian },
                { bureau: 'TransUnion', score: client.creditScore.transunion, initial: client.initialScore.transunion },
              ].map(b => (
                <div key={b.bureau}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{b.bureau}</span>
                    <span className="font-bold text-slate-900">{b.score} <span className="text-emerald-600 font-semibold">(+{b.score - b.initial})</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (b.score / 850) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Credit reports not yet uploaded.</p>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Summary</h3>
          {[
            ['Active Disputes', client.activeDisputes],
            ['Completed Rounds', client.completedRounds],
            ['Billing Status', client.billingStatus.replace(/_/g, ' ')],
            ['Monthly Fee', `$${client.monthlyFee}`],
          ].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between text-sm">
              <span className="text-slate-500">{k}</span>
              <span className="font-medium text-slate-800">{v}</span>
            </div>
          ))}
          <div className="pt-2 flex gap-2">
            <BlockedAction label="Send Message" />
            <BlockedAction label="Upload Doc" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DisputesSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Disputes</h2>
        <BlockedAction label="+ New Dispute" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Bureau</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">Account</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Round</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DEMO_DISPUTES.map(d => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{d.clientName}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-600">{d.bureau}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{d.account}</td>
                <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-600">Round {d.round}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LettersSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Dispute Letters</h2>
        <BlockedAction label="Generate Letter" />
      </div>
      <div className="grid gap-3">
        {DEMO_LETTERS.map(l => (
          <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 text-sm">{l.type} — {l.bureau}</p>
              <p className="text-xs text-slate-500">{l.clientName} · Round {l.round} · {l.createdDate}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={l.status} />
              <BlockedAction label="Send" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>AI Review Required:</strong> AI-generated content must be reviewed by an authorized user before it is sent, filed, or relied upon.
      </div>
    </div>
  );
}

function DocumentsSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Documents</h2>
        <BlockedAction label="Upload Document" />
      </div>
      <div className="grid gap-3">
        {DEMO_DOCUMENTS.map(d => (
          <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{d.name}</p>
                <p className="text-xs text-slate-500">{d.clientName} · {d.uploadDate} · {d.size}</p>
              </div>
            </div>
            <BlockedAction label="Download" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MessagesSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Messages</h2>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
        <MessageSquare size={40} className="text-slate-300 mx-auto mb-3" />
        <p className="font-semibold text-slate-700 mb-1">Client Messaging</p>
        <p className="text-sm text-slate-500 mb-4">Send and receive messages with clients. Sending is disabled in demo mode.</p>
        <div className="bg-slate-50 rounded-xl p-4 text-left space-y-3 max-w-md mx-auto">
          {DEMO_CLIENTS.slice(0, 3).map(c => (
            <div key={c.id} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                {c.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">Demo message thread</p>
              </div>
              <BlockedAction label="Reply" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CROASection() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">CROA Workflow — Jordan Bennett</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        FixMy.Money provides workflow, documentation, and recordkeeping tools. Each business remains responsible for complying with federal, state, and local laws. This software does not provide legal advice.
      </div>
      <div className="space-y-3">
        {DEMO_CROA_STAGES.map((stage, i) => (
          <div key={stage.stage} className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${stage.status === 'completed' ? 'border-emerald-200' : stage.status === 'in_progress' ? 'border-blue-300' : 'border-slate-200'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${stage.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : stage.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
              {stage.status === 'completed' ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-slate-900 text-sm">{stage.stage}</p>
                <StatusBadge status={stage.status} />
              </div>
              {stage.date && <p className="text-xs text-slate-500">{stage.date}</p>}
              {stage.notes && <p className="text-xs text-slate-600 mt-1">{stage.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Billing</h2>
        <BlockedAction label="Create Invoice" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-emerald-50 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">Monthly Revenue</p>
          <p className="text-2xl font-extrabold text-emerald-700">${DEMO_ANALYTICS.monthlyRevenue}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-extrabold text-blue-700">${DEMO_ANALYTICS.totalRevenue}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">Pending Invoices</p>
          <p className="text-2xl font-extrabold text-amber-700">{DEMO_INVOICES.filter(i => i.status === 'pending').length}</p>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DEMO_INVOICES.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{inv.clientName}</td>
                <td className="px-4 py-3 text-slate-700">${inv.amount}</td>
                <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{inv.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsSection() {
  const a = DEMO_ANALYTICS;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Analytics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: a.totalClients },
          { label: 'Disputes Resolved', value: a.resolvedDisputes },
          { label: 'Avg Score Improvement', value: `+${a.avgScoreImprovement} pts` },
          { label: 'Avg Time to Complete', value: a.avgTimeToCompletion },
        ].map(m => (
          <div key={m.label} className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">{m.label}</p>
            <p className="text-xl font-extrabold text-slate-900">{m.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <h3 className="font-bold text-slate-900 text-sm mb-4">Bureau Breakdown</h3>
        <div className="space-y-3">
          {a.bureauBreakdown.map(b => (
            <div key={b.bureau}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">{b.bureau}</span>
                <span className="text-slate-500">{b.resolved}/{b.disputes} resolved</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full">
                <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(b.resolved / b.disputes) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditLogSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Audit Log</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        Audit log entries are immutable. Standard users cannot edit or delete audit records.
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Timestamp</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Action</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DEMO_AUDIT_LOG.map(log => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.timestamp}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{log.user}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{log.action}</td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Team</h2>
        <BlockedAction label="Invite Member" />
      </div>
      <div className="grid gap-3">
        {DEMO_TEAM.map(m => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-700">
                {m.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{m.name}</p>
                <p className="text-xs text-slate-500">{m.email} · {m.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={m.status} />
              {m.role !== 'Owner' && <BlockedAction label="Remove" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreditReportSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Credit Report Analysis</h2>
        <BlockedAction label="Upload Report" />
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        <strong>AI Review Required:</strong> AI-generated content must be reviewed by an authorized user before it is sent, filed, or relied upon. AI output does not guarantee deletions, score increases, or bureau outcomes.
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <h3 className="font-bold text-slate-900 text-sm mb-3">Jordan Bennett — Equifax Report Analysis</h3>
        <div className="space-y-3">
          {[
            { account: 'Capital One — Acct XXXX-1234', type: 'Credit Card', balance: '$2,340', status: 'Derogatory', action: 'Dispute — Account not mine' },
            { account: 'Midland Funding — XXXX-5678', type: 'Collection', balance: '$890', status: 'Collection', action: 'Dispute — Cannot verify' },
            { account: 'Chase Sapphire — XXXX-9012', type: 'Credit Card', balance: '$0', status: 'Positive', action: 'No action needed' },
            { account: 'Synchrony Bank — XXXX-3456', type: 'Retail Card', balance: '$445', status: 'Late Payment', action: 'Dispute — Balance incorrect' },
          ].map((item, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${item.status === 'Positive' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.account}</p>
                <p className="text-xs text-slate-500">{item.type} · Balance: {item.balance}</p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-bold ${item.status === 'Positive' ? 'text-emerald-700' : 'text-red-700'}`}>{item.status}</p>
                <p className="text-xs text-slate-500">{item.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Demo Mode Component ─────────────────────────────────────────────────

export default function DemoModeContent() {
  const [activeSection, setActiveSection] = useState<DemoSection>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string>('demo-client-001');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id);
    setActiveSection('client-profile');
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardSection onNavigate={setActiveSection} />;
      case 'clients': return <ClientsSection onSelectClient={handleSelectClient} />;
      case 'client-profile': return <ClientProfileSection clientId={selectedClientId} />;
      case 'credit-report': return <CreditReportSection />;
      case 'disputes': return <DisputesSection />;
      case 'letters': return <LettersSection />;
      case 'documents': return <DocumentsSection />;
      case 'messages': return <MessagesSection />;
      case 'croa': return <CROASection />;
      case 'billing': return <BillingSection />;
      case 'analytics': return <AnalyticsSection />;
      case 'audit-log': return <AuditLogSection />;
      case 'team': return <TeamSection />;
      default: return <DashboardSection onNavigate={setActiveSection} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <h1 className="sr-only">FixMy.Money interactive product demo</h1>
      {/* Top Bar */}
      <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label={mobileNavOpen ? 'Close demo navigation' : 'Open demo navigation'}
            aria-expanded={mobileNavOpen}
          >
            <LayoutDashboard size={20} />
          </button>
          <span className="font-bold text-sm">FixMy.Money</span>
          <span className="text-slate-400 text-xs hidden sm:block">/ {DEMO_AGENCY.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <DemoBadge />
          <Link href="/sign-up-login-screen?tab=register" className="hidden sm:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
            Sign Up for $1 Trial <ArrowRight size={12} />
          </Link>
          <Link href="/" className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
            <X size={14} /> Exit Demo
          </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`bg-white border-r border-slate-200 w-56 shrink-0 flex-col hidden lg:flex`}>
          <div className="p-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900 truncate">{DEMO_AGENCY.name}</p>
            <p className="text-xs text-slate-400">{DEMO_AGENCY.subtitle}</p>
          </div>
          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = activeSection === item.id || (item.id === 'clients' && activeSection === 'client-profile');
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Icon size={16} className="shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-slate-100">
            <Link href="/sign-up-login-screen?tab=register" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2.5 rounded-lg transition-colors">
              Sign Up for $1 Trial <ArrowRight size={12} />
            </Link>
          </div>
        </aside>

        {/* Mobile Nav Overlay */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-56 bg-white border-r border-slate-200 flex flex-col">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900">{DEMO_AGENCY.name}</p>
                <button onClick={() => setMobileNavOpen(false)} aria-label="Close demo navigation">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
                {NAV_ITEMS.map(item => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveSection(item.id); setMobileNavOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Icon size={16} className="shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderSection()}
        </div>
      </div>

      {/* Persistent CTA Bar */}
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Ready to use FixMy.Money with your real clients?</p>
        <Link href="/sign-up-login-screen?tab=register" className="flex items-center gap-1.5 bg-white text-blue-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
          Sign Up for $1 Trial <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
