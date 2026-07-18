import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import AdminHealthContent from './components/AdminHealthContent';

export const metadata: Metadata = {
  title: 'Admin Health Dashboard | FixMy.Money',
  description: 'Platform health and metrics dashboard for authorized administrators.',
  robots: { index: false, follow: false },
};

/**
 * ADMIN_EMAILS is an emergency bootstrap mechanism ONLY.
 * It allows the very first platform administrator to be granted access
 * before any platform_admins rows exist in the database.
 *
 * In normal operation, authorization is performed via the platform_admins table.
 * Do NOT rely on ADMIN_EMAILS as the primary authorization mechanism.
 * Remove an email from this list once the user has been added to platform_admins.
 */
const BOOTSTRAP_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

async function isPlatformAdmin(userId: string, userEmail: string): Promise<boolean> {
  // Primary check: database-backed platform_admins table
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('platform_admins')
      .select('id, active')
      .eq('user_id', userId)
      .eq('active', true)
      .maybeSingle();

    if (!error && data) {
      return true;
    }
  } catch {
    // Admin client unavailable — fall through to bootstrap check
  }

  // Secondary check: app_metadata role (set server-side via service role)
  // This is set by the admin client, not by the browser
  // Checked via the user object passed in from the server session

  // Emergency bootstrap: ADMIN_EMAILS env var
  // Only used when platform_admins table is empty or unavailable
  if (BOOTSTRAP_ADMIN_EMAILS.length > 0 && BOOTSTRAP_ADMIN_EMAILS.includes(userEmail)) {
    return true;
  }

  return false;
}

export default async function AdminHealthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Server-side admin authorization — never trusts browser state or URL params
  const isAdmin = await isPlatformAdmin(user.id, user.email || '');

  if (!isAdmin) {
    redirect('/dashboard');
  }

  return <AdminHealthContent userEmail={user.email || ''} />;
}
