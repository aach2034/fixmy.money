import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/lib/admin/authorization';
import { getAdminClient } from '@/lib/supabase/admin';
import AdminHealthContent from './components/AdminHealthContent';

export const metadata: Metadata = {
  title: 'Admin Health Dashboard | FixMy.Money',
  description: 'Platform health and metrics dashboard for authorized administrators.',
  robots: { index: false, follow: false },
};

export default async function AdminHealthPage() {
  const { user } = await requirePlatformAdmin();
  const admin = getAdminClient();
  const [webhookRetry, webhookDeadLetter, emailRetry, emailDeadLetter] = await Promise.all([
    admin.from('stripe_webhook_events').select('*', { count: 'exact', head: true }).eq('status', 'retry'),
    admin.from('stripe_webhook_events').select('*', { count: 'exact', head: true }).eq('status', 'dead_letter'),
    admin.from('billing_email_outbox').select('*', { count: 'exact', head: true }).eq('status', 'retry'),
    admin.from('billing_email_outbox').select('*', { count: 'exact', head: true }).eq('status', 'dead_letter'),
  ]);
  return (
    <AdminHealthContent
      userEmail={user.email || ''}
      webhookHealth={{
        available: !webhookRetry.error && !webhookDeadLetter.error && !emailRetry.error && !emailDeadLetter.error,
        retry: (webhookRetry.count || 0) + (emailRetry.count || 0),
        deadLetter: (webhookDeadLetter.count || 0) + (emailDeadLetter.count || 0),
      }}
    />
  );
}
