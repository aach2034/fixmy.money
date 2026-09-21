import { NextResponse } from 'next/server';
import {
  getAuthenticatedPlatformAdminRole,
  getPlatformAdminEnrollment,
} from '@/lib/admin/authorization';
import { createClient } from '@/lib/supabase/server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
  Expires: '0',
  Pragma: 'no-cache',
  Vary: 'Cookie',
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { destination: null },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const role = await getAuthenticatedPlatformAdminRole(supabase, user.id);
  if (role) {
    return NextResponse.json(
      { destination: '/admin' },
      { headers: NO_STORE_HEADERS }
    );
  }

  const enrollment = await getPlatformAdminEnrollment(user.id);
  return NextResponse.json(
    { destination: enrollment ? '/admin/security' : null },
    { headers: NO_STORE_HEADERS }
  );
}
