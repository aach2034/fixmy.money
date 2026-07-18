'use client';
import React, { useState } from 'react';
import { TrendingUp, DollarSign, CreditCard, Target, AlertCircle, CheckCircle, ArrowUpRight, ArrowDownRight, BarChart3, PiggyBank,  } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import Icon from '@/components/ui/AppIcon';


const netWorthData = [
  { month: 'Jul', value: -18500 },
  { month: 'Aug', value: -16200 },
  { month: 'Sep', value: -14800 },
  { month: 'Oct', value: -12100 },
  { month: 'Nov', value: -9400 },
  { month: 'Dec', value: -7200 },
  { month: 'Jan', value: -4800 },
];

const cashFlowData = [
  { month: 'Aug', income: 4800, expenses: 3900 },
  { month: 'Sep', income: 4800, expenses: 4200 },
  { month: 'Oct', income: 5100, expenses: 3800 },
  { month: 'Nov', income: 4800, expenses: 3600 },
  { month: 'Dec', income: 5400, expenses: 4100 },
  { month: 'Jan', income: 4800, expenses: 3500 },
];

const debtBreakdown = [
  { name: 'Credit Cards', value: 8400, color: '#DC2626' },
  { name: 'Auto Loan', value: 12800, color: '#D97706' },
  { name: 'Medical', value: 2200, color: '#7C3AED' },
  { name: 'Personal Loan', value: 5600, color: '#0EA5E9' },
];

const savingsGoals = [
  { name: 'Emergency Fund', current: 1200, target: 6000, color: '#059669' },
  { name: 'Vacation Fund', current: 450, target: 2000, color: '#0EA5E9' },
  { name: 'Down Payment', current: 3200, target: 20000, color: '#7C3AED' },
];

const metrics = [
  {
    label: 'Net Worth',
    value: '-$4,800',
    change: '+$2,400',
    positive: true,
    icon: TrendingUp,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    label: 'Total Debt',
    value: '$29,000',
    change: '-$1,800',
    positive: true,
    icon: DollarSign,
    color: 'text-danger',
    bg: 'bg-danger/10',
  },
  {
    label: 'Credit Score',
    value: '624',
    change: '+18 pts',
    positive: true,
    icon: CreditCard,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    label: 'Monthly Savings',
    value: '$1,300',
    change: '+$200',
    positive: true,
    icon: PiggyBank,
    color: 'text-success',
    bg: 'bg-success/10',
  },
];

const recommendations = [
  { type: 'warning', text: 'Credit utilization at 68% — pay down $2,100 to reach 30%', action: 'View Plan' },
  { type: 'success', text: 'Emergency fund on track — 3 months away from goal', action: 'View Goal' },
  { type: 'info', text: 'Refinancing your auto loan could save $87/month', action: 'Explore' },
  { type: 'warning', text: '2 negative items on credit report eligible for dispute', action: 'Dispute Now' },
];

export default function FinancialHealthContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'debt' | 'savings' | 'cashflow'>('overview');

  const healthScore = 72;
  const totalDebt = debtBreakdown.reduce((s, d) => s + d.value, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Health Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your complete financial picture · Updated today</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-card border border-border rounded-xl px-4 py-2 text-center">
            <div className="text-2xl font-black text-primary">{healthScore}</div>
            <div className="text-2xs text-muted-foreground uppercase tracking-wide">Health Score</div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center`}>
                  <Icon size={18} className={m.color} />
                </div>
                <span className={`text-xs font-semibold flex items-center gap-0.5 ${m.positive ? 'text-success' : 'text-danger'}`}>
                  {m.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {m.change}
                </span>
              </div>
              <div className="text-xl font-bold text-foreground">{m.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
            </div>
          );
        })}
      </div>

      {/* Health Score Bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-header">Financial Health Score</h2>
          <span className="text-sm font-semibold text-primary">Good — Keep Going!</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Poor (0)</span>
              <span>Fair (40)</span>
              <span>Good (60)</span>
              <span>Excellent (100)</span>
            </div>
            <div className="w-full bg-border rounded-full h-4 relative">
              <div
                className="h-4 rounded-full bg-gradient-to-r from-danger via-warning to-primary transition-all duration-700"
                style={{ width: `${healthScore}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-primary rounded-full shadow-md"
                style={{ left: `calc(${healthScore}% - 10px)` }}
              />
            </div>
          </div>
          <div className="text-4xl font-black text-primary w-16 text-right">{healthScore}</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Credit', score: 62, color: 'bg-warning' },
            { label: 'Debt', score: 55, color: 'bg-danger' },
            { label: 'Savings', score: 40, color: 'bg-info' },
            { label: 'Cash Flow', score: 78, color: 'bg-success' },
          ].map((s) => (
            <div key={s.label} className="bg-muted rounded-lg p-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-semibold text-foreground">{s.score}</span>
              </div>
              <div className="w-full bg-border rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${s.color}`} style={{ width: `${s.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {(['overview', 'debt', 'savings', 'cashflow'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'cashflow' ? 'Cash Flow' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Net Worth Chart */}
          <div className="card p-5">
            <h3 className="section-header mb-4">Net Worth Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={netWorthData}>
                <defs>
                  <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Net Worth']} />
                <Area type="monotone" dataKey="value" stroke="#059669" fill="url(#netWorthGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Recommendations */}
          <div className="card p-5">
            <h3 className="section-header mb-4">AI Recommendations</h3>
            <div className="space-y-3">
              {recommendations.map((r, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  r.type === 'warning' ? 'bg-warning-bg border-warning/20' :
                  r.type === 'success'? 'bg-success-bg border-success/20' : 'bg-info-bg border-info/20'
                }`}>
                  {r.type === 'warning' ? (
                    <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
                  ) : r.type === 'success' ? (
                    <CheckCircle size={16} className="text-success shrink-0 mt-0.5" />
                  ) : (
                    <BarChart3 size={16} className="text-info shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-relaxed">{r.text}</p>
                  </div>
                  <button className="text-xs font-semibold text-primary hover:underline shrink-0">{r.action}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'debt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="section-header mb-4">Debt Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={debtBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                  {debtBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {debtBreakdown.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-foreground">{d.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">${d.value.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                <span>Total Debt</span>
                <span className="text-danger">${totalDebt.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="section-header mb-4">Payoff Timeline</h3>
            <div className="space-y-4">
              {debtBreakdown.map((d) => (
                <div key={d.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-foreground font-medium">{d.name}</span>
                    <span className="text-muted-foreground">${d.value.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${(d.value / totalDebt) * 100}%`, backgroundColor: d.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Debt-Free Date</span>
              </div>
              <p className="text-2xl font-black text-primary">March 2028</p>
              <p className="text-xs text-muted-foreground mt-1">Using avalanche method at current payment rate</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'savings' && (
        <div className="card p-5">
          <h3 className="section-header mb-6">Savings Goals</h3>
          <div className="space-y-6">
            {savingsGoals.map((goal) => {
              const pct = Math.round((goal.current / goal.target) * 100);
              return (
                <div key={goal.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PiggyBank size={16} className="text-muted-foreground" />
                      <span className="font-medium text-foreground">{goal.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground">${goal.current.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground"> / ${goal.target.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-full bg-border rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: goal.color }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{pct}% complete</span>
                    <span>${(goal.target - goal.current).toLocaleString()} remaining</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'cashflow' && (
        <div className="card p-5">
          <h3 className="section-header mb-4">Monthly Cash Flow</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cashFlowData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
              <Bar dataKey="income" fill="#059669" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#DC2626" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-success-bg rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-success">$4,800</div>
              <div className="text-xs text-muted-foreground">Avg Income</div>
            </div>
            <div className="bg-danger-bg rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-danger">$3,850</div>
              <div className="text-xs text-muted-foreground">Avg Expenses</div>
            </div>
            <div className="bg-primary/5 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-primary">$950</div>
              <div className="text-xs text-muted-foreground">Avg Savings</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
