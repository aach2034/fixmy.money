'use client';
import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, Circle, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';


interface Task {
  id: string;
  title: string;
  type: string;
  client: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  assignee: string;
  assigneeInitials: string;
  status: 'pending' | 'inprogress' | 'overdue' | 'completed';
  bureau?: string;
}

const allTasks: Task[] = [
  { id: 'task-001', title: 'Pull 3-bureau credit report', type: 'Client Onboarding', client: 'Tanisha Brooks', priority: 'High', dueDate: 'Jun 3', assignee: 'Keisha James', assigneeInitials: 'KJ', status: 'pending' },
  { id: 'task-002', title: 'Send welcome packet & portal invite', type: 'Client Onboarding', client: 'Jermaine Patterson', priority: 'Medium', dueDate: 'Jun 3', assignee: 'Marcus Reed', assigneeInitials: 'MR', status: 'pending' },
  { id: 'task-003', title: 'Identify dispute items from report', type: 'Case Setup', client: 'Tanisha Brooks', priority: 'High', dueDate: 'Jun 4', assignee: 'Keisha James', assigneeInitials: 'KJ', status: 'pending' },
  { id: 'task-004', title: 'Draft Equifax round 3 letter', type: 'Letter Generation', client: 'Roberto Fuentes', priority: 'Medium', dueDate: 'Jun 5', assignee: 'Marcus Reed', assigneeInitials: 'MR', status: 'pending', bureau: 'EQ' },
  { id: 'task-005', title: 'Review Equifax response — 2 items', type: 'Bureau Response Review', client: 'Darnell Washington', priority: 'High', dueDate: 'Jun 4', assignee: 'Keisha James', assigneeInitials: 'KJ', status: 'inprogress', bureau: 'EQ' },
  { id: 'task-006', title: 'Send TransUnion round 2 letter', type: 'Dispute Follow-Up', client: 'Priya Nambiar', priority: 'High', dueDate: 'Jun 4', assignee: 'Marcus Reed', assigneeInitials: 'MR', status: 'inprogress', bureau: 'TU' },
  { id: 'task-007', title: 'Draft Experian dispute letter', type: 'Letter Generation', client: 'Devon Clarke', priority: 'Medium', dueDate: 'Jun 5', assignee: 'Marcus Reed', assigneeInitials: 'MR', status: 'inprogress', bureau: 'EX' },
  { id: 'task-008', title: 'Follow up on Equifax 30-day deadline', type: 'Dispute Follow-Up', client: 'Devon Clarke', priority: 'High', dueDate: 'May 30', assignee: 'Marcus Reed', assigneeInitials: 'MR', status: 'overdue', bureau: 'EQ' },
  { id: 'task-009', title: 'Collect overdue payment — $49', type: 'Billing Follow-Up', client: 'Shaniqua Davis', priority: 'High', dueDate: 'May 28', assignee: 'Marcus Reed', assigneeInitials: 'MR', status: 'overdue' },
  { id: 'task-010', title: 'Escalate TransUnion non-response', type: 'Escalation', client: 'Devon Clarke', priority: 'High', dueDate: 'May 29', assignee: 'Keisha James', assigneeInitials: 'KJ', status: 'overdue', bureau: 'TU' },
  { id: 'task-011', title: 'Pull updated credit report', type: 'Case Review', client: 'Shaniqua Davis', priority: 'Medium', dueDate: 'May 27', assignee: 'Marcus Reed', assigneeInitials: 'MR', status: 'overdue' },
  { id: 'task-012', title: 'Send Experian round 1 letter', type: 'Dispute Follow-Up', client: 'Adriana Morales', priority: 'Medium', dueDate: 'Jun 1', assignee: 'Keisha James', assigneeInitials: 'KJ', status: 'completed', bureau: 'EX' },
  { id: 'task-013', title: 'Close case — all items resolved', type: 'Case Closure', client: 'Keisha Thornton', priority: 'Low', dueDate: 'May 30', assignee: 'Keisha James', assigneeInitials: 'KJ', status: 'completed' },
  { id: 'task-014', title: 'Review bureau response', type: 'Bureau Response Review', client: 'Marcus Holloway', priority: 'High', dueDate: 'Jun 1', assignee: 'Keisha James', assigneeInitials: 'KJ', status: 'completed', bureau: 'EX' },
];

const columns = [
  { id: 'col-pending', status: 'pending' as const, label: 'Pending', icon: Circle, iconColor: 'text-muted-foreground', headerBg: 'bg-muted/50', count: allTasks.filter(t => t.status === 'pending').length },
  { id: 'col-inprogress', status: 'inprogress' as const, label: 'In Progress', icon: Clock, iconColor: 'text-primary', headerBg: 'bg-primary/5', count: allTasks.filter(t => t.status === 'inprogress').length },
  { id: 'col-overdue', status: 'overdue' as const, label: 'Overdue', icon: AlertTriangle, iconColor: 'text-danger', headerBg: 'bg-danger/5', count: allTasks.filter(t => t.status === 'overdue').length },
  { id: 'col-completed', status: 'completed' as const, label: 'Completed', icon: CheckCircle2, iconColor: 'text-success', headerBg: 'bg-success/5', count: allTasks.filter(t => t.status === 'completed').length },
];

const priorityClasses: Record<string, string> = {
  High: 'priority-high',
  Medium: 'priority-medium',
  Low: 'priority-low',
};

const bureauClasses: Record<string, string> = {
  EQ: 'bureau-eq',
  EX: 'bureau-ex',
  TU: 'bureau-tu',
};

const typeColors: Record<string, string> = {
  'Client Onboarding': 'text-info',
  'Letter Generation': 'text-primary',
  'Bureau Response Review': 'text-success',
  'Dispute Follow-Up': 'text-warning',
  'Billing Follow-Up': 'text-danger',
  'Escalation': 'text-danger',
  'Case Setup': 'text-info',
  'Case Review': 'text-muted-foreground',
  'Case Closure': 'text-success',
};

export default function KanbanBoard({ search, priorityFilter }: { search: string; priorityFilter: string }) {
  const filterTasks = (tasks: Task[]) => {
    let filtered = tasks;
    if (search) filtered = filtered.filter(t => t.client.toLowerCase().includes(search.toLowerCase()) || t.title.toLowerCase().includes(search.toLowerCase()) || t.type.toLowerCase().includes(search.toLowerCase()));
    if (priorityFilter !== 'All') filtered = filtered.filter(t => t.priority === priorityFilter);
    return filtered;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {columns.map(col => {
        const Icon = col.icon;
        const colTasks = filterTasks(allTasks.filter(t => t.status === col.status));
        return (
          <div key={col.id} className="flex flex-col gap-3">
            {/* Column Header */}
            <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${col.headerBg} border border-border`}>
              <div className="flex items-center gap-2">
                <Icon size={15} className={col.iconColor} />
                <span className="text-sm font-semibold text-foreground">{col.label}</span>
              </div>
              <span className={`badge border-transparent ${col.status === 'overdue' ? 'bg-danger/15 text-danger' : col.status === 'inprogress' ? 'bg-primary/15 text-primary' : col.status === 'completed' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                {colTasks.length}
              </span>
            </div>

            {/* Task Cards */}
            <div className="space-y-2 min-h-[200px]">
              {colTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground italic">No tasks</div>
              ) : (
                colTasks.map(task => (
                  <div
                    key={task.id}
                    className={`card p-3 cursor-pointer hover:shadow-md transition-shadow duration-150 ${col.status === 'overdue' ? 'border-danger/20 bg-danger/[0.02]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-2xs font-semibold uppercase tracking-wide ${typeColors[task.type] ?? 'text-muted-foreground'}`}>
                        {task.type}
                      </span>
                      <button
                        onClick={() => toast.info(`Task options for ${task.title}`)}
                        className="p-0.5 hover:bg-muted rounded transition-colors shrink-0"
                      >
                        <MoreHorizontal size={13} className="text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug mb-2">{task.title}</p>
                    <p className="text-xs text-muted-foreground mb-3">{task.client}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`badge ${priorityClasses[task.priority]}`}>{task.priority}</span>
                        {task.bureau && (
                          <span className={`badge ${bureauClasses[task.bureau]} text-2xs`}>{task.bureau}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-medium ${col.status === 'overdue' ? 'text-danger' : 'text-muted-foreground'}`}>
                          {task.dueDate}
                        </span>
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xs font-bold" title={task.assignee}>
                          {task.assigneeInitials}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}