'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Clock, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Task = { id: string; title: string; description: string | null; status: string; priority: string; due_date: string | null; task_type: string | null };

export default function WorkflowContent() {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { if (active) setLoading(false); return; }
      const { data, error: queryError } = await supabase
        .from('workflow_tasks')
        .select('id, title, description, status, priority, due_date, task_type')
        .eq('owner_id', auth.user.id)
        .order('due_date', { ascending: true });
      if (!active) return;
      if (queryError) setError('Workflow data could not be loaded.');
      else setTasks((data ?? []) as Task[]);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [supabase]);

  const now = new Date();
  const isComplete = (task: Task) => task.status.toLowerCase() === 'completed';
  const isOverdue = (task: Task) => !isComplete(task) && !!task.due_date && new Date(task.due_date) < now;
  const stats = [
    { label: 'Pending', value: tasks.filter(t => t.status.toLowerCase() === 'pending' && !isOverdue(t)).length, icon: Circle, color: 'text-muted-foreground' },
    { label: 'In Progress', value: tasks.filter(t => ['in_progress', 'inprogress'].includes(t.status.toLowerCase()) && !isOverdue(t)).length, icon: Clock, color: 'text-primary' },
    { label: 'Overdue', value: tasks.filter(isOverdue).length, icon: AlertTriangle, color: 'text-danger' },
    { label: 'Completed', value: tasks.filter(isComplete).length, icon: CheckCircle2, color: 'text-success' },
  ];

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Automation & Workflows</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real workflow tasks created by your account activity</p>
      </div>
      {error && <div className="card p-4 text-sm text-danger">{error}</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <Icon size={18} className={color} />
            <div><p className="text-xl font-bold tabular-nums">{loading ? '—' : value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
          </div>
        ))}
      </div>
      {!loading && tasks.length === 0 ? (
        <div className="card p-10 text-center">
          <Zap size={28} className="mx-auto text-muted-foreground mb-3" />
          <h2 className="text-base font-semibold text-foreground">No automation activity yet</h2>
          <p className="text-sm text-muted-foreground mt-1">Tasks created by real dispute and client workflows will appear here. No sample rules or tasks are shown.</p>
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {tasks.map(task => (
            <div key={task.id} className="p-4 flex items-start justify-between gap-4">
              <div><p className="text-sm font-semibold text-foreground">{task.title}</p><p className="text-xs text-muted-foreground mt-1">{task.description || task.task_type || 'Workflow task'}</p></div>
              <div className="text-right shrink-0"><span className="badge bg-muted text-muted-foreground">{isOverdue(task) ? 'overdue' : task.status.replace('_', ' ')}</span><p className="text-xs text-muted-foreground mt-2">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
