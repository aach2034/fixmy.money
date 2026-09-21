import { NextRequest, NextResponse } from 'next/server';
import {
  authorizeDestructiveAdminAction,
  confirmAdminStepUp,
  prepareAdminMfaEnrollment,
  recordAdminSecurityEvent,
  removeAdminFactor,
  revokeAdminSessions,
} from '@/app/admin/security/actions';

const MAX_BODY_BYTES = 2_048;

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('x-fixmymoney-admin-security') !== '1') return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function json(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const declaredLength = Number(request.headers.get('content-length') || '0');
  if (!Number.isFinite(declaredLength) || declaredLength > MAX_BODY_BYTES) {
    return json({ error: 'invalid_request' }, 400);
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    switch (body.operation) {
      case 'prepare_enrollment':
        return json(await prepareAdminMfaEnrollment());
      case 'record_event':
        if (typeof body.action !== 'string') return json({ error: 'invalid_request' }, 400);
        await recordAdminSecurityEvent(body.action);
        return json({ ok: true });
      case 'confirm_step_up':
        return json(await confirmAdminStepUp());
      case 'authorize_destructive':
        if (
          typeof body.action !== 'string' ||
          typeof body.targetId !== 'string' ||
          !body.material ||
          Array.isArray(body.material) ||
          typeof body.material !== 'object'
        ) return json({ error: 'invalid_request' }, 400);
        return json(await authorizeDestructiveAdminAction(
          body.action as Parameters<typeof authorizeDestructiveAdminAction>[0],
          body.targetId,
          body.material as Parameters<typeof authorizeDestructiveAdminAction>[2]
        ));
      case 'remove_factor':
        if (typeof body.factorId !== 'string') return json({ error: 'invalid_request' }, 400);
        return json(await removeAdminFactor(body.factorId));
      case 'revoke_sessions':
        return json(await revokeAdminSessions());
      default:
        return json({ error: 'invalid_request' }, 400);
    }
  } catch {
    return json({ error: 'denied' }, 403);
  }
}
