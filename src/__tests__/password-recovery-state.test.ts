import { describe, expect, it } from 'vitest';
import {
  issuePasswordRecoveryState,
  PASSWORD_RECOVERY_TTL_SECONDS,
  verifyPasswordRecoveryState,
} from '@/lib/auth/password-recovery-state';

const secret = 'local-test-signing-secret-with-at-least-32-bytes';
const nowSeconds = 2_000_000_000;

function accessToken({
  userId = 'recovery-user',
  sessionId = 'recovery-session',
  expiresAt = nowSeconds + 3600,
} = {}) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    sub: userId,
    session_id: sessionId,
    exp: expiresAt,
  })}.test-signature`;
}

describe('password recovery state', () => {
  it('binds a short-lived state to the verified user and session', async () => {
    const token = accessToken();
    const state = await issuePasswordRecoveryState({
      accessToken: token,
      userId: 'recovery-user',
      secret,
      nowSeconds,
    });

    await expect(verifyPasswordRecoveryState({
      state,
      accessToken: token,
      userId: 'recovery-user',
      secret,
      nowSeconds: nowSeconds + PASSWORD_RECOVERY_TTL_SECONDS - 1,
    })).resolves.toBe(true);
  });

  it('rejects expiration, session mismatch, user mismatch, and tampering', async () => {
    const token = accessToken();
    const state = await issuePasswordRecoveryState({
      accessToken: token,
      userId: 'recovery-user',
      secret,
      nowSeconds,
    });

    const checks = await Promise.all([
      verifyPasswordRecoveryState({
        state,
        accessToken: token,
        userId: 'recovery-user',
        secret,
        nowSeconds: nowSeconds + PASSWORD_RECOVERY_TTL_SECONDS,
      }),
      verifyPasswordRecoveryState({
        state,
        accessToken: accessToken({ sessionId: 'other-session' }),
        userId: 'recovery-user',
        secret,
        nowSeconds,
      }),
      verifyPasswordRecoveryState({
        state,
        accessToken: accessToken({ userId: 'other-user' }),
        userId: 'other-user',
        secret,
        nowSeconds,
      }),
      verifyPasswordRecoveryState({
        state: `${state.slice(0, -1)}${state.endsWith('a') ? 'b' : 'a'}`,
        accessToken: token,
        userId: 'recovery-user',
        secret,
        nowSeconds,
      }),
    ]);

    expect(checks).toEqual([false, false, false, false]);
  });

  it('refuses to issue state for a mismatched or expired session token', async () => {
    await expect(issuePasswordRecoveryState({
      accessToken: accessToken({ userId: 'other-user' }),
      userId: 'recovery-user',
      secret,
      nowSeconds,
    })).rejects.toThrow('identity or expiration');

    await expect(issuePasswordRecoveryState({
      accessToken: accessToken({ expiresAt: nowSeconds }),
      userId: 'recovery-user',
      secret,
      nowSeconds,
    })).rejects.toThrow('identity or expiration');
  });
});
