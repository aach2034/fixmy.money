'use client';
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { week: 'Wk 1', items: 28 },
  { week: 'Wk 2', items: 41 },
  { week: 'Wk 3', items: 35 },
  { week: 'Wk 4', items: 52 },
  { week: 'Wk 5', items: 47 },
  { week: 'Wk 6', items: 63 },
  { week: 'Wk 7', items: 58 },
  { week: 'Wk 8', items: 71 },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-success font-bold mt-1">{payload[0].value} items deleted</p>
    </div>
  );
};

export default function ItemsDeletedChart() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-header">Items Deleted Trend</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Negative items successfully removed — last 8 weeks</p>
        </div>
        <span className="badge bg-success/10 text-success border-success/20">+41 this month</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="itemsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--success)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="items" stroke="var(--success)" strokeWidth={2} fill="url(#itemsGradient)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}