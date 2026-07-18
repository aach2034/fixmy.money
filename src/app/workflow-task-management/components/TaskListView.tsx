'use client';
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, CheckCircle2, Circle, Clock, AlertTriangle, MoreHorizontal } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';

interface Task {
  id: string; title: string; type: string; client: string;
  priority: 'High' | 'Medium' | 'Low'; dueDate: string;
  assignee: string; assigneeInitials: string;
  status: 'pending' | 'inprogress' | 'overdue' | 'completed';
  bureau?: string;
}

const tasks: Task[] = [
  { id: 'ltask-001', title: 'Pull 3-bureau credit report', type: 'Client Onboarding', client: 'Tanisha Brooks', priority: 'High', dueDate: 'Jun 3, 2026', assignee: 'Keisha James', assigneeInitials: 'KJ', status: 'pending' },
  { id: 'ltask-002', title: 'Review Equifax response', type: 'Bureau Response Review', client: 'Darnell Washington', priority: 'High', dueDate: 'Jun 4, 2026', assignee: 'Keisha James', assigneeInitials: 'KJ', status: 'inprogress', bureau: 'EQ' },
  { id: 'ltask-003', title: 'Follow up on Equifax 30-day deadline', type: 'Dispute Follow-Up', client: 'Devon Clarke', priority: 'High', dueDate: 'May 30, 2026', assignee: 'Marcus Reed', assigneeInitials: 'MR', status: 'overdue', bureau: 'EQ' },
  { id: 'ltask-004', title: 'Collect overdue payment — $49', type: 'Billing Follow-Up', client: 'Shaniqua Davis', priority: 'High', dueDate: 'May 28, 2026', assignee: 'Marcus Reed', assigneeInitials: 'MR', status: 'overdue' },
  { id: 'ltask-005', title: 'Send TransUnion round 2 letter', type: 'Dispute Follow-Up', client: 'Priya Nambiar', priority: 'High', dueDate: 'Jun 4, 2026', assignee: 'Marcus Reed', assigneeInitials: 'MR', status: 'inprogress', bureau: 'TU' },
  { id: 'ltask-006', title: 'Send Experian round 1 letter', type: 'Dispute Follow-Up', client: 'Adriana Morales', priority: 'Medium', dueDate: 'Jun 1, 2026', assignee: 'Keisha James', assigneeInitials: 'KJ', status: 'completed', bureau: 'EX' },
  { id: 'ltask-007', title: 'Close case — all items resolved', type: 'Case Closure', client: 'Keisha Thornton', priority: 'Low', dueDate: 'May 30, 2026', assignee: 'Keisha James', assigneeInitials: 'KJ', status: 'completed' },
  { id: 'ltask-008', title: 'Draft Equifax round 3 letter', type: 'Letter Generation', client: 'Roberto Fuentes', priority: 'Medium', dueDate: 'Jun 5, 2026', assignee: 'Marcus Reed', assigneeInitials: 'MR', status: 'pending', bureau: 'EQ' },
];

const priorityClasses: Record<string, string> = { High: 'priority-high', Medium: 'priority-medium', Low: 'priority-low' };
const bureauClasses: Record<string, string> = { EQ: 'bureau-eq', EX: 'bureau-ex', TU: 'bureau-tu' };
type SortField = 'title' | 'client' | 'dueDate' | 'priority' | 'status';

export default function TaskListView({ search, priorityFilter }: { search: string; priorityFilter: string }) {
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = tasks
    .filter(t => {
      if (search && !t.client.toLowerCase().includes(search.toLowerCase()) && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const av = a[sortField] as string;
      const bv = b[sortField] as string;
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 inline-flex flex-col">
      <ChevronUp size={10} className={sortField === field && sortDir === 'asc' ? 'text-primary' : 'text-muted-foreground/40'} />
      <ChevronDown size={10} className={sortField === field && sortDir === 'desc' ? 'text-primary' : 'text-muted-foreground/40'} />
    </span>
  );

  const statusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle2 size={16} className="text-success" />;
    if (s === 'inprogress') return <Clock size={16} className="text-primary" />;
    if (s === 'overdue') return <AlertTriangle size={16} className="text-danger" />;
    return <Circle size={16} className="text-muted-foreground" />;
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="table-header w-8"></th>
              <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('title')}>
                <span className="flex items-center">Task <SortIcon field="title" /></span>
              </th>
              <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('client')}>
                <span className="flex items-center">Client <SortIcon field="client" /></span>
              </th>
              <th className="table-header">Type</th>
              <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('priority')}>
                <span className="flex items-center">Priority <SortIcon field="priority" /></span>
              </th>
              <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('dueDate')}>
                <span className="flex items-center">Due Date <SortIcon field="dueDate" /></span>
              </th>
              <th className="table-header">Assignee</th>
              <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('status')}>
                <span className="flex items-center">Status <SortIcon field="status" /></span>
              </th>
              <th className="table-header w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(task => (
              <tr key={task.id} className={`border-b border-border row-hover ${task.status === 'overdue' ? 'bg-danger/[0.02]' : ''}`}>
                <td className="table-cell">{statusIcon(task.status)}</td>
                <td className="table-cell">
                  <p className="font-semibold text-sm text-foreground">{task.title}</p>
                  {task.bureau && (
                    <span className={`badge ${bureauClasses[task.bureau]} text-2xs mt-0.5`}>{task.bureau}</span>
                  )}
                </td>
                <td className="table-cell text-sm text-muted-foreground">{task.client}</td>
                <td className="table-cell">
                  <span className="text-xs font-medium text-muted-foreground">{task.type}</span>
                </td>
                <td className="table-cell">
                  <span className={`badge ${priorityClasses[task.priority]}`}>{task.priority}</span>
                </td>
                <td className="table-cell">
                  <span className={`text-sm font-medium ${task.status === 'overdue' ? 'text-danger' : 'text-foreground'}`}>{task.dueDate}</span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xs font-bold">
                      {task.assigneeInitials}
                    </div>
                    <span className="text-xs text-muted-foreground">{task.assignee.split(' ')[0]}</span>
                  </div>
                </td>
                <td className="table-cell">
                  <StatusBadge status={task.status} />
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toast.success(`Task "${task.title}" marked complete`)}
                      className="p-1.5 hover:bg-success/10 rounded-lg transition-colors"
                      title="Mark as complete"
                    >
                      <CheckCircle2 size={14} className="text-muted-foreground hover:text-success" />
                    </button>
                    <button className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="More options">
                      <MoreHorizontal size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}