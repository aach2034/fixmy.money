import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/lib/admin/authorization';
import AdminHealthContent from './components/AdminHealthContent';

export const metadata: Metadata = {
  title: 'Admin Health Dashboard | FixMy.Money',
  description: 'Platform health and metrics dashboard for authorized administrators.',
  robots: { index: false, follow: false },
};

export default async function AdminHealthPage() {
  const { user } = await requirePlatformAdmin();
  return <AdminHealthContent userEmail={user.email || ''} />;
}
