import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getStripeServerClient } from '@/lib/stripe/server';
import { operationalLog, requestId, within } from '@/lib/observability/server';

export async function GET(request: Request) {
  const id = requestId(request);
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': id };
  const url = new URL(request.url);
  if (url.searchParams.get('ready') !== '1') {
    return NextResponse.json({ status: 'alive', request_id: id }, { headers });
  }
  const expected = process.env.HEALTHCHECK_SECRET;
  if (!expected || request.headers.get('x-healthcheck-secret') !== expected) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404, headers });
  }

  const checks = { database: false, stripe: false };
  try {
    const { error } = await within(getAdminClient().from('user_profiles').select('id', { head: true, count: 'exact' }).limit(1));
    checks.database = !error;
  } catch { checks.database = false; }
  try {
    await within(getStripeServerClient().customers.list({ limit: 1 }));
    checks.stripe = true;
  } catch { checks.stripe = false; }

  const ready = checks.database && checks.stripe;
  operationalLog(ready ? 'info' : 'error', 'readiness_check', id, checks);
  return NextResponse.json(
    { status: ready ? 'ready' : 'degraded', dependencies: checks, request_id: id },
    { status: ready ? 200 : 503, headers },
  );
}
