import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type PlatformAdminRole = 'platform_admin' | 'platform_superadmin';

export type PlatformAdminSession = {
  user: User;
  role: PlatformAdminRole;
};

export async function getPlatformAdminRole(userId: string): Promise<PlatformAdminRole | null> {
  const { data, error } = await getAdminClient()
    .from('platform_admins')
    .select('role, active')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) return null;
  return data.role === 'platform_superadmin' ? 'platform_superadmin' : 'platform_admin';
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  return (await getPlatformAdminRole(userId)) !== null;
}

export async function requirePlatformAdmin(): Promise<PlatformAdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const role = await getPlatformAdminRole(user.id);
  if (!role) redirect('/dashboard');

  return { user, role };
}
