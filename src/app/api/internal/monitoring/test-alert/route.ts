import { NextResponse } from 'next/server';
import { deliverOperationalAlert, type OperationalAlertState } from '@/lib/observability/alerts';
import { operationalLog, requestId } from '@/lib/observability/server';

export async function POST(request: Request) {
  const id = requestId(request);
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': id };
  const expected = process.env.HEALTHCHECK_SECRET;
  if (!expected || request.headers.get('x-healthcheck-secret') !== expected) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404, headers });
  }

  if (Number(request.headers.get('content-length') || '0') > 1024) {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413, headers });
  }

  let state: OperationalAlertState = 'triggered';
  try {
    const payload = (await request.json()) as { state?: unknown };
    if (payload.state === 'resolved') state = 'resolved';
    else if (payload.state !== undefined && payload.state !== 'triggered') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers });
  }

  const delivery = await deliverOperationalAlert({
    event: 'monitoring_delivery_test',
    severity: 'warning',
    state,
    requestId: id,
  });
  operationalLog(delivery === 'delivered' ? 'info' : 'error', 'monitoring_delivery_test', id, {
    state,
    delivery,
  });

  return NextResponse.json(
    { ok: delivery === 'delivered', state },
    { status: delivery === 'delivered' ? 200 : 503, headers },
  );
}
