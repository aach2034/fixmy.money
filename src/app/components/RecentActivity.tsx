'use client';
import React, { useEffect, useState } from 'react';
import { FileText, UserPlus, CheckCircle2, Send, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ActivityItem {
  id: string;
  iconBg: string;
  iconColor: string;
  iconType: 'send' | 'userplus' | 'check' | 'alert' | 'file';
  text: string;
  sub: string;
  time: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 172800) return 'Yesterday';
  return `${Math.floor(diff / 86400)} days ago`;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Recent letters
        const { data: letters } = await supabase
          .from('dispute_letters')
          .select('id, letter_id, client_name, bureau, items_count, letter_status, created_at, updated_at')

          .order('updated_at', { ascending: false })
          .limit(4);

        // Recent clients
        const { data: newClients } = await supabase
          .from('staff_clients')
          .select('id, name, plan, subscription_status, case_stage, created_at')

          .order('created_at', { ascending: false })
          .limit(3);

        const items: ActivityItem[] = [];

        (letters ?? []).forEach(l => {
          if (l.letter_status === 'sent') {
            items.push({
              id: `letter-sent-${l.id}`,
              iconBg: 'bg-primary/10',
              iconColor: 'text-primary',
              iconType: 'send',
              text: `Dispute letter sent to ${l.bureau}`,
              sub: `${l.client_name} — ${l.items_count} items`,
              time: timeAgo(l.updated_at ?? l.created_at),
            });
          } else if (l.letter_status === 'received' || l.letter_status === 'closed') {
            items.push({
              id: `letter-recv-${l.id}`,
              iconBg: 'bg-success/10',
              iconColor: 'text-success',
              iconType: 'check',
              text: `${l.items_count} item${l.items_count !== 1 ? 's' : ''} processed`,
              sub: `${l.client_name} — ${l.bureau} ${l.letter_status}`,
              time: timeAgo(l.updated_at ?? l.created_at),
            });
          } else if (l.letter_status === 'draft') {
            items.push({
              id: `letter-draft-${l.id}`,
              iconBg: 'bg-warning/10',
              iconColor: 'text-warning',
              iconType: 'file',
              text: 'Dispute letter drafted',
              sub: `${l.client_name} — ${l.bureau} round ${1}`,
              time: timeAgo(l.created_at),
            });
          }
        });

        (newClients ?? []).forEach(c => {
          if (c.case_stage === 'lead' || c.case_stage === 'enrolled') {
            items.push({
              id: `client-new-${c.id}`,
              iconBg: 'bg-success/10',
              iconColor: 'text-success',
              iconType: 'userplus',
              text: 'New client enrolled',
              sub: `${c.name} — ${c.plan} plan`,
              time: timeAgo(c.created_at),
            });
          } else if (c.subscription_status === 'overdue') {
            items.push({
              id: `client-overdue-${c.id}`,
              iconBg: 'bg-danger/10',
              iconColor: 'text-danger',
              iconType: 'alert',
              text: 'Invoice overdue',
              sub: `${c.name} — ${c.plan} plan`,
              time: timeAgo(c.created_at),
            });
          }
        });

        // Sort by recency (most recent first) and take top 6
        items.sort((a, b) => {
          const order = ['Just now', 'min ago', 'hr ago', 'Yesterday', 'days ago'];
          const aIdx = order.findIndex(o => a.time.includes(o));
          const bIdx = order.findIndex(o => b.time.includes(o));
          return aIdx - bIdx;
        });

        setActivities(items.slice(0, 6));
      } catch {
        // silently fall back to empty
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  const getIcon = (type: ActivityItem['iconType']) => {
    switch (type) {
      case 'send': return Send;
      case 'userplus': return UserPlus;
      case 'check': return CheckCircle2;
      case 'alert': return AlertTriangle;
      case 'file': return FileText;
      default: return FileText;
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-header">Recent Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Latest actions across all client cases</p>
        </div>
        <button className="btn-ghost text-xs">View all</button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText size={28} className="text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">No recent activity</p>
          <p className="text-xs text-muted-foreground mt-1">Activity will appear here as you work.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((a) => {
            const ActivityIcon = getIcon(a.iconType);
            return (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors duration-100">
                <div className={`w-8 h-8 rounded-lg ${a.iconBg} flex items-center justify-center shrink-0`}>
                  <ActivityIcon size={14} className={a.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.sub}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}