'use client';
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';

interface BureauDataPoint {
  month: string;
  Equifax: number;
  Experian: number;
  TransUnion: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={`tt-${p.name}`} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function DisputesByBureauChart() {
  const [data, setData] = useState<BureauDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: rows, error } = await supabase
          .from('disputes_by_bureau')
          .select('month, equifax, experian, transunion')

          .order('created_at', { ascending: true });

        if (!error && rows) {
          setData(rows.map(r => ({
            month: r.month,
            Equifax: r.equifax ?? 0,
            Experian: r.experian ?? 0,
            TransUnion: r.transunion ?? 0,
          })));
        }
      } catch {
        // silently fall back to empty
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-header">Disputes by Bureau</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Letters sent per credit bureau — last 6 months</p>
        </div>
      </div>
      {loading ? (
        <div className="h-[220px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="Equifax" fill="var(--primary)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Experian" fill="var(--warning)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="TransUnion" fill="var(--success)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}