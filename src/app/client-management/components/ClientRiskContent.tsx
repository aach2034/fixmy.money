'use client';
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, MessageSquare, CreditCard, FileText, Filter } from 'lucide-react';

type RiskLevel = 'green' | 'yellow' | 'red';

interface RiskFactor {
  label: string;
  value: boolean;
  weight: number;
}

interface RiskClient {
  id: string;
  name: string;
  email: string;
  plan: string;
  score: number;
  riskLevel: RiskLevel;
  riskScore: number;
  lastContact: string;
  missedPayments: number;
  failedAppointments: number;
  stalledDisputes: number;
  daysSinceContact: number;
  factors: RiskFactor[];
  assignedStaff: string;
}

const riskClients: RiskClient[] = [
  {
    id: 'rc-001', name: 'Shaniqua Davis', email: 'shaniqua.d@hotmail.com', plan: 'Starter', score: 544,
    riskLevel: 'red', riskScore: 87, lastContact: '7 days ago', missedPayments: 1, failedAppointments: 2,
    stalledDisputes: 1, daysSinceContact: 7, assignedStaff: 'Marcus Reed',
    factors: [
      { label: 'Overdue payment', value: true, weight: 30 },
      { label: 'No contact 7+ days', value: true, weight: 25 },
      { label: 'Failed appointment', value: true, weight: 20 },
      { label: 'Stalled dispute', value: true, weight: 12 },
    ],
  },
  {
    id: 'rc-002', name: 'Tyler Nguyen', email: 'tyler.n@outlook.com', plan: 'Starter', score: 511,
    riskLevel: 'red', riskScore: 94, lastContact: '21 days ago', missedPayments: 2, failedAppointments: 1,
    stalledDisputes: 0, daysSinceContact: 21, assignedStaff: 'Marcus Reed',
    factors: [
      { label: 'Overdue payment', value: true, weight: 30 },
      { label: 'No contact 21+ days', value: true, weight: 25 },
      { label: 'Failed appointment', value: true, weight: 20 },
      { label: 'Multiple missed payments', value: true, weight: 19 },
    ],
  },
  {
    id: 'rc-003', name: 'Jermaine Patterson', email: 'j.patterson@gmail.com', plan: 'Starter', score: 498,
    riskLevel: 'yellow', riskScore: 52, lastContact: '5 days ago', missedPayments: 0, failedAppointments: 0,
    stalledDisputes: 0, daysSinceContact: 5, assignedStaff: 'Marcus Reed',
    factors: [
      { label: 'No contact 5+ days', value: true, weight: 25 },
      { label: 'Lead not converted', value: true, weight: 15 },
      { label: 'Overdue payment', value: false, weight: 30 },
      { label: 'Stalled dispute', value: false, weight: 12 },
    ],
  },
  {
    id: 'rc-004', name: 'Tanisha Brooks', email: 'tanisha.b@gmail.com', plan: 'Starter', score: 521,
    riskLevel: 'yellow', riskScore: 38, lastContact: '2 days ago', missedPayments: 0, failedAppointments: 0,
    stalledDisputes: 0, daysSinceContact: 2, assignedStaff: 'Keisha James',
    factors: [
      { label: 'No disputes started', value: true, weight: 20 },
      { label: 'Onboarding incomplete', value: true, weight: 18 },
      { label: 'Overdue payment', value: false, weight: 30 },
      { label: 'Failed appointment', value: false, weight: 20 },
    ],
  },
  {
    id: 'rc-005', name: 'Darnell Washington', email: 'darnell.w@gmail.com', plan: 'Growth', score: 582,
    riskLevel: 'green', riskScore: 18, lastContact: '1 hour ago', missedPayments: 0, failedAppointments: 0,
    stalledDisputes: 0, daysSinceContact: 0, assignedStaff: 'Keisha James',
    factors: [
      { label: 'Overdue payment', value: false, weight: 30 },
      { label: 'No contact 7+ days', value: false, weight: 25 },
      { label: 'Failed appointment', value: false, weight: 20 },
      { label: 'Stalled dispute', value: false, weight: 12 },
    ],
  },
  {
    id: 'rc-006', name: 'Priya Nambiar', email: 'priya.n@outlook.com', plan: 'Growth', score: 614,
    riskLevel: 'green', riskScore: 12, lastContact: '3 hours ago', missedPayments: 0, failedAppointments: 0,
    stalledDisputes: 0, daysSinceContact: 0, assignedStaff: 'Marcus Reed',
    factors: [
      { label: 'Overdue payment', value: false, weight: 30 },
      { label: 'No contact 7+ days', value: false, weight: 25 },
      { label: 'Failed appointment', value: false, weight: 20 },
      { label: 'Stalled dispute', value: false, weight: 12 },
    ],
  },
  {
    id: 'rc-007', name: 'Roberto Fuentes', email: 'rfuentes@gmail.com', plan: 'Growth', score: 697,
    riskLevel: 'green', riskScore: 8, lastContact: 'Yesterday', missedPayments: 0, failedAppointments: 0,
    stalledDisputes: 0, daysSinceContact: 1, assignedStaff: 'Marcus Reed',
    factors: [
      { label: 'Overdue payment', value: false, weight: 30 },
      { label: 'No contact 7+ days', value: false, weight: 25 },
      { label: 'Failed appointment', value: false, weight: 20 },
      { label: 'Stalled dispute', value: false, weight: 12 },
    ],
  },
];

const riskConfig = {
  green: { label: 'Low Risk', bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', dot: 'bg-success', bar: 'bg-success' },
  yellow: { label: 'Medium Risk', bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20', dot: 'bg-warning', bar: 'bg-warning' },
  red: { label: 'High Risk', bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/20', dot: 'bg-danger', bar: 'bg-danger' },
};

export default function ClientRiskContent() {
  const [filter, setFilter] = useState<'all' | RiskLevel>('all');

  const filtered = filter === 'all' ? riskClients : riskClients.filter(c => c.riskLevel === filter);
  const redCount = riskClients.filter(c => c.riskLevel === 'red').length;
  const yellowCount = riskClients.filter(c => c.riskLevel === 'yellow').length;
  const greenCount = riskClients.filter(c => c.riskLevel === 'green').length;

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Client Risk Scoring</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-powered risk assessment based on payment, communication, and dispute activity</p>
        </div>
      </div>

      {/* Risk Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { level: 'red' as RiskLevel, count: redCount, label: 'High Risk', icon: AlertTriangle },
          { level: 'yellow' as RiskLevel, count: yellowCount, label: 'Medium Risk', icon: Clock },
          { level: 'green' as RiskLevel, count: greenCount, label: 'Low Risk', icon: CheckCircle2 },
        ].map((s) => {
          const cfg = riskConfig[s.level];
          const SIcon = s.icon;
          return (
            <button
              key={s.level}
              onClick={() => setFilter(filter === s.level ? 'all' : s.level)}
              className={`card p-5 text-left transition-all ${filter === s.level ? `${cfg.bg} ${cfg.border} border-2` : 'hover:bg-muted/30'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                  <SIcon size={18} className={cfg.text} />
                </div>
                <div>
                  <p className={`text-2xl font-black ${cfg.text}`}>{s.count}</p>
                  <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Showing:</span>
        <span className="text-xs font-semibold text-foreground">{filter === 'all' ? 'All clients' : riskConfig[filter].label}</span>
        {filter !== 'all' && (
          <button onClick={() => setFilter('all')} className="text-xs text-primary hover:underline ml-1">Clear</button>
        )}
      </div>

      {/* Client Risk Cards */}
      <div className="space-y-3">
        {filtered.map((client) => {
          const cfg = riskConfig[client.riskLevel];
          const activeFactors = client.factors.filter(f => f.value);
          return (
            <div key={client.id} className={`card p-5 border ${cfg.border}`}>
              <div className="flex items-start gap-4">
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center ${cfg.text} text-sm font-bold shrink-0`}>
                    {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.plan} · Score: {client.score}</p>
                  </div>
                </div>

                {/* Risk Score */}
                <div className="text-right shrink-0">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.text} text-xs font-bold`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Risk score: <span className={`font-bold ${cfg.text}`}>{client.riskScore}/100</span></p>
                </div>
              </div>

              {/* Risk Bar */}
              <div className="mt-3 mb-3">
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${cfg.bar} transition-all duration-700`} style={{ width: `${client.riskScore}%` }} />
                </div>
              </div>

              {/* Risk Factors */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[
                  { icon: CreditCard, label: `${client.missedPayments} missed payment${client.missedPayments !== 1 ? 's' : ''}`, active: client.missedPayments > 0 },
                  { icon: MessageSquare, label: `Last contact: ${client.lastContact}`, active: client.daysSinceContact >= 7 },
                  { icon: Clock, label: `${client.failedAppointments} failed appt${client.failedAppointments !== 1 ? 's' : ''}`, active: client.failedAppointments > 0 },
                  { icon: FileText, label: `${client.stalledDisputes} stalled dispute${client.stalledDisputes !== 1 ? 's' : ''}`, active: client.stalledDisputes > 0 },
                ].map((factor, i) => {
                  const FIcon = factor.icon;
                  return (
                    <div key={`factor-${i}`} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${factor.active ? 'bg-danger/5 text-danger' : 'bg-muted text-muted-foreground'}`}>
                      <FIcon size={11} className="shrink-0" />
                      <span className="truncate">{factor.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              {activeFactors.length > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">{activeFactors.length} risk factor{activeFactors.length !== 1 ? 's' : ''} detected</span>
                  <button className="ml-auto btn-secondary text-xs py-1 px-3">Send Follow-up</button>
                  <button className={`text-xs py-1 px-3 rounded-lg font-semibold ${cfg.bg} ${cfg.text} hover:opacity-80 transition-opacity`}>View Profile</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
