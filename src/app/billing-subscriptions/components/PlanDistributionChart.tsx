'use client';
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'Growth', value: 74, color: 'var(--primary)' },
  { name: 'Starter', value: 43, color: 'var(--accent)' },
  { name: 'Agency', value: 30, color: 'var(--success)' },
];

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground">{payload[0].name} Plan</p>
      <p className="text-muted-foreground">{payload[0].value} clients</p>
    </div>
  );
};

export default function PlanDistributionChart() {
  return (
    <div className="card p-5 h-full">
      <div className="mb-4">
        <h3 className="section-header">Plan Distribution</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Active clients by subscription tier</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-plan-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}