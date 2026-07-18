'use client';
import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle2, FileSearch } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UrgentItem {
  id: string;
  type: string;
  iconBg: string;
  iconColor: string;
  title: string;
  client: string;
  detail: string;
  time: string;
  timeBg: string;
  iconType: 'clock' | 'file' | 'check' | 'alert';
}

export default function UrgentActionFeed() {
  const [items, setItems] = useState<UrgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [criticalCount, setCriticalCount] = useState(0);

  useEffect(() => {
    const fetchUrgent = async () => {
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Fetch letters due soon or overdue
        const { data: letters } = await supabase
          .from('dispute_letters')
          .select('id, letter_id, client_name, bureau, items_count, days_remaining, letter_status')
          .eq('owner_id', user.id)
          .in('letter_status', ['awaiting', 'sent', 'received'])
          .order('days_remaining', { ascending: true })
          .limit(5);

        // Fetch clients with overdue tasks
        const { data: overdueClients } = await supabase
          .from('staff_clients')
          .select('id, name, next_task_label, assigned_staff')
          .eq('owner_id', user.id)
          .eq('next_task_due', 'Overdue')
          .limit(3);

        const urgentItems: UrgentItem[] = [];

        (letters ?? []).forEach(l => {
          if (l.days_remaining < 0) {
            urgentItems.push({
              id: `letter-${l.id}`,
              type: 'response-received',
              iconBg: 'bg-success/10',
              iconColor: 'text-success',
              iconType: 'file',
              title: 'Bureau response received',
              client: l.client_name,
              detail: `${l.bureau} responded — ${l.items_count} items`,
              time: 'Today',
              timeBg: 'bg-success/10 text-success',
            });
          } else if (l.days_remaining <= 3) {
            urgentItems.push({
              id: `letter-${l.id}`,
              type: 'response-due',
              iconBg: 'bg-danger/10',
              iconColor: 'text-danger',
              iconType: 'clock',
              title: `Response deadline in ${l.days_remaining} day${l.days_remaining === 1 ? '' : 's'}`,
              client: l.client_name,
              detail: `${l.bureau} letter #${l.letter_id} — ${l.items_count} items`,
              time: `${l.days_remaining}d left`,
              timeBg: 'bg-danger/10 text-danger',
            });
          } else if (l.days_remaining <= 7) {
            urgentItems.push({
              id: `letter-${l.id}`,
              type: 'response-due',
              iconBg: 'bg-warning/10',
              iconColor: 'text-warning',
              iconType: 'clock',
              title: `Response deadline in ${l.days_remaining} days`,
              client: l.client_name,
              detail: `${l.bureau} letter #${l.letter_id} — ${l.items_count} items`,
              time: `${l.days_remaining}d left`,
              timeBg: 'bg-warning/10 text-warning',
            });
          }
        });

        (overdueClients ?? []).forEach(c => {
          urgentItems.push({
            id: `client-${c.id}`,
            type: 'task-overdue',
            iconBg: 'bg-danger/10',
            iconColor: 'text-danger',
            iconType: 'alert',
            title: 'Onboarding task overdue',
            client: c.name,
            detail: `${c.next_task_label} — assigned to ${c.assigned_staff}`,
            time: '3 days overdue',
            timeBg: 'bg-danger/10 text-danger',
          });
        });

        const critical = urgentItems.filter(i => i.iconColor === 'text-danger').length;
        setCriticalCount(critical);
        setItems(urgentItems.slice(0, 5));
      } catch {
        // silently fall back to empty
      } finally {
        setLoading(false);
      }
    };
    fetchUrgent();
  }, []);

  const getIcon = (type: UrgentItem['iconType']) => {
    switch (type) {
      case 'clock': return Clock;
      case 'file': return FileSearch;
      case 'check': return CheckCircle2;
      case 'alert': return AlertTriangle;
      default: return Clock;
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-header">Urgent Actions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Deadlines and responses needing attention</p>
        </div>
        {criticalCount > 0 && (
          <span className="badge bg-danger/10 text-danger border-danger/20">{criticalCount} critical</span>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 size={28} className="text-success mb-2" />
          <p className="text-sm font-medium text-foreground">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">No urgent actions at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const ItemIcon = getIcon(item.iconType);
            return (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors duration-100 cursor-pointer">
                <div className={`w-8 h-8 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0`}>
                  <ItemIcon size={15} className={item.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs font-medium text-muted-foreground">{item.client}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                </div>
                <span className={`badge ${item.timeBg} border-transparent text-xs shrink-0`}>{item.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}