'use client';
import React, { useState } from 'react';
import { DollarSign, TrendingDown, Target, CheckCircle, Plus, Trash2, Calculator, Zap, Snowflake } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import Icon from '@/components/ui/AppIcon';


interface Debt {
  id: string;
  name: string;
  balance: number;
  minPayment: number;
  interestRate: number;
  type: string;
}

const initialDebts: Debt[] = [
  { id: '1', name: 'Chase Visa', balance: 4200, minPayment: 84, interestRate: 24.99, type: 'Credit Card' },
  { id: '2', name: 'Capital One', balance: 2800, minPayment: 56, interestRate: 22.49, type: 'Credit Card' },
  { id: '3', name: 'Medical Bill', balance: 1800, minPayment: 50, interestRate: 0, type: 'Medical' },
  { id: '4', name: 'Personal Loan', balance: 5600, minPayment: 180, interestRate: 14.5, type: 'Loan' },
  { id: '5', name: 'Auto Loan', balance: 12800, minPayment: 320, interestRate: 7.9, type: 'Auto' },
];

const payoffTimelineData = [
  { month: 'Now', snowball: 27200, avalanche: 27200 },
  { month: '6mo', snowball: 23800, avalanche: 23400 },
  { month: '1yr', snowball: 19200, avalanche: 18600 },
  { month: '18mo', snowball: 13400, avalanche: 12800 },
  { month: '2yr', snowball: 7200, avalanche: 6400 },
  { month: '30mo', snowball: 0, avalanche: 0 },
];

export default function DebtEliminationContent() {
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [method, setMethod] = useState<'snowball' | 'avalanche'>('avalanche');
  const [extraPayment, setExtraPayment] = useState(200);
  const [activeTab, setActiveTab] = useState<'plan' | 'calculator' | 'tracker'>('plan');

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayment = debts.reduce((s, d) => s + d.minPayment, 0);
  const totalInterestRate = debts.reduce((s, d) => s + (d.balance * d.interestRate / 100), 0) / totalDebt * 100;

  const sortedDebts = [...debts].sort((a, b) =>
    method === 'snowball' ? a.balance - b.balance : b.interestRate - a.interestRate
  );

  const removeDebt = (id: string) => setDebts((prev) => prev.filter((d) => d.id !== id));

  const estimatedPayoffMonths = Math.ceil(totalDebt / (totalMinPayment + extraPayment));
  const estimatedInterestSaved = Math.round(totalDebt * 0.18 * (estimatedPayoffMonths / 12) * 0.3);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Debt Elimination Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Your roadmap to becoming debt-free</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Debt
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Debt', value: `$${totalDebt.toLocaleString()}`, icon: DollarSign, color: 'text-danger', bg: 'bg-danger/10' },
          { label: 'Min. Monthly', value: `$${totalMinPayment}`, icon: Calculator, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Avg Interest', value: `${totalInterestRate.toFixed(1)}%`, icon: TrendingDown, color: 'text-info', bg: 'bg-info-bg' },
          { label: 'Debt-Free In', value: `${estimatedPayoffMonths}mo`, icon: Target, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="card p-4">
              <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={m.color} />
              </div>
              <div className="text-xl font-bold text-foreground">{m.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {(['plan', 'calculator', 'tracker'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'plan' ? 'Payoff Plan' : tab === 'calculator' ? 'Calculator' : 'Tracker'}
          </button>
        ))}
      </div>

      {activeTab === 'plan' && (
        <div className="space-y-6">
          {/* Method Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setMethod('snowball')}
              className={`card p-4 text-left transition-all ${method === 'snowball' ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Snowflake size={18} className="text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">Snowball Method</div>
                  {method === 'snowball' && <div className="text-2xs text-primary font-medium">Active</div>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Pay smallest balances first. Builds momentum and motivation with quick wins.</p>
            </button>
            <button
              onClick={() => setMethod('avalanche')}
              className={`card p-4 text-left transition-all ${method === 'avalanche' ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Zap size={18} className="text-orange-600" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">Avalanche Method</div>
                  {method === 'avalanche' && <div className="text-2xs text-primary font-medium">Active</div>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Pay highest interest rates first. Saves the most money in interest over time.</p>
            </button>
          </div>

          {/* Extra Payment Slider */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Extra Monthly Payment</h3>
              <span className="text-lg font-bold text-primary">${extraPayment}/mo</span>
            </div>
            <input
              type="range"
              min={0}
              max={1000}
              step={25}
              value={extraPayment}
              onChange={(e) => setExtraPayment(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>$0</span>
              <span>$500</span>
              <span>$1,000</span>
            </div>
            <div className="mt-4 p-3 bg-success-bg rounded-lg border border-success/20 flex items-center gap-2">
              <CheckCircle size={16} className="text-success shrink-0" />
              <p className="text-xs text-foreground">
                Adding <strong>${extraPayment}/mo</strong> saves you an estimated <strong>${estimatedInterestSaved.toLocaleString()}</strong> in interest
              </p>
            </div>
          </div>

          {/* Debt Priority List */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {method === 'snowball' ? 'Snowball' : 'Avalanche'} Order — Pay These First
              </h3>
            </div>
            <div className="divide-y divide-border">
              {sortedDebts.map((debt, i) => (
                <div key={debt.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">{debt.name}</span>
                      <span className="badge bg-muted text-muted-foreground border-transparent text-2xs">{debt.type}</span>
                      {i === 0 && <span className="badge bg-primary/10 text-primary border-transparent text-2xs">Focus Here</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Balance: <strong className="text-foreground">${debt.balance.toLocaleString()}</strong></span>
                      <span>Min: <strong className="text-foreground">${debt.minPayment}/mo</strong></span>
                      <span>APR: <strong className="text-danger">{debt.interestRate}%</strong></span>
                    </div>
                  </div>
                  <button onClick={() => removeDebt(debt.id)} className="btn-ghost p-1.5 text-muted-foreground hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="section-header mb-4">Payoff Timeline Comparison</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={payoffTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                <Line type="monotone" dataKey="snowball" stroke="#0EA5E9" strokeWidth={2} name="Snowball" dot={false} />
                <Line type="monotone" dataKey="avalanche" stroke="#059669" strokeWidth={2} name="Avalanche" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-blue-500" />Snowball</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-primary" />Avalanche</div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="section-header mb-4">Debt by Balance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={debts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Balance']} />
                <Bar dataKey="balance" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'tracker' && (
        <div className="card p-5">
          <h3 className="section-header mb-4">Payment Tracker</h3>
          <div className="space-y-4">
            {debts.map((debt) => {
              const paidPct = Math.round(((27200 - debt.balance) / 27200) * 100 + Math.random() * 20);
              const clampedPct = Math.min(Math.max(paidPct, 5), 95);
              return (
                <div key={debt.id} className="p-4 border border-border rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-foreground text-sm">{debt.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{debt.type}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground">${debt.balance.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground"> remaining</span>
                    </div>
                  </div>
                  <div className="w-full bg-border rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${clampedPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{clampedPct}% paid off</span>
                    <span>Next payment: ${debt.minPayment}/mo</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="card p-5 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Target size={24} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Financial coaching temporarily unavailable</h3>
            <p className="text-sm text-muted-foreground mt-0.5">The AI coach is disabled while additional privacy and usage controls are completed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
