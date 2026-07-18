import React from 'react';
import { Zap, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';

const rules = [
  {
    id: 'auto-001',
    trigger: 'Dispute letter sent to bureau',
    action: 'Create "30-day response follow-up" task — due in 25 days',
    active: true,
    category: 'Dispute Tracking',
  },
  {
    id: 'auto-002',
    trigger: 'Bureau response received',
    action: 'Create "Review bureau response" task — assign to case owner',
    active: true,
    category: 'Dispute Tracking',
  },
  {
    id: 'auto-003',
    trigger: 'Client enrolled',
    action: 'Create onboarding checklist — pull reports, welcome email, case setup',
    active: true,
    category: 'Client Onboarding',
  },
  {
    id: 'auto-004',
    trigger: 'Invoice overdue by 7 days',
    action: 'Create "Billing follow-up" task + send automated payment reminder',
    active: true,
    category: 'Billing',
  },
  {
    id: 'auto-005',
    trigger: 'No dispute activity for 45 days',
    action: 'Create "Case review" task — check for stalled cases',
    active: false,
    category: 'Case Health',
  },
  {
    id: 'auto-006',
    trigger: 'All dispute items deleted or verified',
    action: 'Create "Case closure review" task — prepare final report',
    active: true,
    category: 'Case Closure',
  },
];

const categoryColors: Record<string, string> = {
  'Dispute Tracking': 'bg-primary/10 text-primary border-primary/20',
  'Client Onboarding': 'bg-info/10 text-info border-info/20',
  'Billing': 'bg-warning/10 text-warning border-warning/20',
  'Case Health': 'bg-muted text-muted-foreground border-border',
  'Case Closure': 'bg-success/10 text-success border-success/20',
};

export default function AutomationRules() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-header flex items-center gap-2">
            <Zap size={18} className="text-primary" /> Automation Rules
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Trigger → action sequences that run automatically on case events</p>
        </div>
        <button className="btn-primary text-xs flex items-center gap-1.5">
          <Zap size={13} /> Add Rule
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-3">
        {rules.map(rule => (
          <div key={rule.id} className={`border rounded-xl p-4 flex flex-col gap-3 transition-all duration-150 ${rule.active ? 'border-border bg-card' : 'border-border bg-muted/30 opacity-60'}`}>
            <div className="flex items-start justify-between gap-2">
              <span className={`badge ${categoryColors[rule.category]} text-2xs`}>{rule.category}</span>
              <div className="shrink-0">
                {rule.active ? (
                  <ToggleRight size={20} className="text-success cursor-pointer" />
                ) : (
                  <ToggleLeft size={20} className="text-muted-foreground cursor-pointer" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-2xs font-bold text-muted-foreground">IF</span>
                </div>
                <p className="text-xs font-medium text-foreground leading-snug">{rule.trigger}</p>
              </div>
              <div className="flex items-center gap-1 pl-1">
                <ChevronRight size={12} className="text-muted-foreground" />
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap size={10} className="text-primary" />
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{rule.action}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}