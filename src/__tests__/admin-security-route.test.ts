import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  confirm: vi.fn(),
  prepare: vi.fn(),
  record: vi.fn(),
  remove: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock('@/app/admin/security/actions', () => ({
  authorizeDestructiveAdminAction: mocks.authorize,
  confirmAdminStepUp: mocks.confirm,
  prepareAdminMfaEnrollment: mocks.prepare,
  recordAdminSecurityEvent: mocks.record,
  removeAdminFactor: mocks.remove,
  revokeAdminSessions: mocks.revoke,
}));

import { POST } from '@/app/api/admin/security/route';

function request(body: Record<string, unknown>, origin = 'https://fixmy.money') {
  return new NextRequest('https://fixmy.money/api/admin/security', {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/json',
      'x-fixmymoney-admin-security': '1',
    },
    body: JSON.stringify(body),
  });
}

describe('administrator security API transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prepare.mockResolvedValue({ ok: true, cleared: 0 });
    mocks.confirm.mockResolvedValue({ ok: true, activationPending: false });
    mocks.authorize.mockResolvedValue({ ok: true });
    mocks.remove.mockResolvedValue({ ok: true });
    mocks.revoke.mockResolvedValue({ ok: true });
  });

  it('rejects cross-origin requests before any security operation', async () => {
    const response = await POST(request({ operation: 'prepare_enrollment' }, 'https://attacker.example'));
    expect(response.status).toBe(403);
    expect(mocks.prepare).not.toHaveBeenCalled();
  });

  it('prepares enrollment and confirms step-up through a normal route handler', async () => {
    expect((await POST(request({ operation: 'prepare_enrollment' }))).status).toBe(200);
    const confirm = await POST(request({ operation: 'confirm_step_up' }));
    expect(confirm.status).toBe(200);
    expect(await confirm.json()).toEqual({ ok: true, activationPending: false });
  });

  it('preserves destructive action, target, and material bindings', async () => {
    const response = await POST(request({
      operation: 'authorize_destructive',
      action: 'administrator_factor_removal',
      targetId: 'factor-id',
      material: { factorId: 'factor-id' },
    }));
    expect(response.status).toBe(200);
    expect(mocks.authorize).toHaveBeenCalledWith(
      'administrator_factor_removal',
      'factor-id',
      { factorId: 'factor-id' }
    );
  });

  it('fails closed without exposing internal errors', async () => {
    mocks.confirm.mockRejectedValue(new Error('sensitive internal detail'));
    const response = await POST(request({ operation: 'confirm_step_up' }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'denied' });
  });
});
