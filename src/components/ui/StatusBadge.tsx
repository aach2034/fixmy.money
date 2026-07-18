import React from 'react';

type StatusType =
  | 'active' | 'enrolled' | 'lead' | 'onhold' | 'completed' | 'churned'
  | 'draft'| 'sent' | 'awaiting' | 'received' | 'escalated' | 'closed' |'paid' | 'overdue' | 'pending' | 'inprogress' | 'verified' | 'deleted'
  | 'identified' | 'updated' | 'resolved' | 'rejected' | 'in_progress';

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: { label: 'Active', className: 'status-active border-success/20' },
  enrolled: { label: 'Enrolled', className: 'status-enrolled border-primary/20' },
  lead: { label: 'Lead', className: 'status-lead border-border' },
  onhold: { label: 'On Hold', className: 'status-onhold border-warning/20' },
  completed: { label: 'Completed', className: 'status-completed border-success/20' },
  churned: { label: 'Churned', className: 'status-churned border-danger/20' },
  draft: { label: 'Draft', className: 'bg-secondary text-secondary-foreground border-border' },
  sent: { label: 'Sent', className: 'bg-info/10 text-info border-info/20' },
  awaiting: { label: 'Awaiting', className: 'status-onhold border-warning/20' },
  received: { label: 'Response Received', className: 'status-active border-success/20' },
  escalated: { label: 'Escalated', className: 'status-churned border-danger/20' },
  closed: { label: 'Closed', className: 'bg-secondary text-muted-foreground border-border' },
  paid: { label: 'Paid', className: 'status-active border-success/20' },
  overdue: { label: 'Overdue', className: 'status-churned border-danger/20' },
  pending: { label: 'Pending', className: 'status-lead border-border' },
  inprogress: { label: 'In Progress', className: 'status-enrolled border-primary/20' },
  verified: { label: 'Verified', className: 'status-onhold border-warning/20' },
  deleted: { label: 'Deleted', className: 'status-active border-success/20' },
  identified: { label: 'Identified', className: 'bg-secondary text-secondary-foreground border-border' },
  updated: { label: 'Updated', className: 'bg-info/10 text-info border-info/20' },
  resolved: { label: 'Resolved', className: 'status-active border-success/20' },
  rejected: { label: 'Rejected', className: 'status-churned border-danger/20' },
  in_progress: { label: 'In Progress', className: 'status-enrolled border-primary/20' },
};

export default function StatusBadge({ status }: { status: StatusType }) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-secondary text-secondary-foreground border-border' };
  return (
    <span className={`badge ${config.className}`}>
      {config.label}
    </span>
  );
}
