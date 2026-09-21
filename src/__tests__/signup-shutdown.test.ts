import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { POST as blockedSignup } from '@/app/api/auth/signup/route';
import {
  REOPENING_DATE_DISPLAY,
  REOPENING_OFFER,
  SIGNUP_CLOSED_MESSAGE,
  isPreShutdownUser,
} from '@/lib/signup/closure';
import { captureReopeningWaitlist } from '../../worker/lead-capture';

class FakeStatement {
  values: unknown[] = [];

  constructor(
    readonly sql: string,
    private readonly inserts: unknown[][],
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<T>() {
    return { request_count: 1 } as T;
  }

  async run() {
    if (this.sql.includes('INSERT INTO marketing_leads')) this.inserts.push(this.values);
    return {};
  }
}

class FakeDatabase {
  inserts: unknown[][] = [];
  statements: string[] = [];

  prepare(sql: string) {
    this.statements.push(sql);
    return new FakeStatement(sql, this.inserts);
  }
}

function waitlistRequest(email: string) {
  return new Request('https://fixmy.money/api/reopening-waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.10' },
    body: JSON.stringify({ email, source: 'reopening_list' }),
  });
}

describe('temporary new-signup shutdown', () => {
  it('blocks the direct email/password signup API with a controlled waitlist response', async () => {
    const response = await blockedSignup();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: 'SIGNUPS_CLOSED',
      waitlistUrl: '/#reopening-list',
      reopeningDate: '2026-09-30',
    });
    expect(SIGNUP_CLOSED_MESSAGE).toContain('one month free');
  });

  it('allows only pre-cutoff customers through the new-customer checkout gate', () => {
    process.env.SIGNUP_SHUTDOWN_STARTED_AT = '2026-09-05T12:00:00.000Z';
    expect(isPreShutdownUser('2026-09-05T11:59:59.999Z')).toBe(true);
    expect(isPreShutdownUser('2026-09-05T12:00:00.000Z')).toBe(false);
    expect(isPreShutdownUser(undefined)).toBe(false);
    delete process.env.SIGNUP_SHUTDOWN_STARTED_AT;

    const checkout = fs.readFileSync('src/app/api/stripe/create-checkout/route.ts', 'utf8');
    expect(checkout.indexOf('if (!isPreShutdownUser(user.created_at))')).toBeGreaterThan(-1);
    expect(checkout.indexOf('if (!isPreShutdownUser(user.created_at))')).toBeLessThan(checkout.indexOf('stripe.customers.create'));
  });

  it('blocks newly-created OAuth/callback identities while preserving recovery routing', () => {
    const callback = fs.readFileSync('src/app/auth/callback/route.ts', 'utf8');
    expect(callback).toContain("type === 'recovery'");
    expect(callback).toContain("from('platform_admins')");
    expect(callback).toContain('!isAdministratorRecovery');
    expect(callback).toContain("'/reset-password'");
    expect(callback).toContain('issuePasswordRecoveryState');
    expect(callback).toContain("type: type === 'recovery' ? 'recovery' : 'email'");
    expect(callback).not.toContain('user_metadata');
    expect(fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8')).not.toContain('.auth.signUp(');
    expect(fs.readFileSync('src/app/client-portal/components/ClientPortalLoginContent.tsx', 'utf8')).not.toContain('.auth.signUp(');
  });

  it('keeps recovery email links on the server-verified token-hash callback', () => {
    const template = fs.readFileSync('supabase/templates/recovery.html', 'utf8');
    const config = fs.readFileSync('supabase/config.toml', 'utf8');

    expect(template).toContain('/auth/callback?token_hash={{ .TokenHash }}&type=recovery');
    expect(template).not.toContain('{{ .ConfirmationURL }}');
    expect(config).toContain('[auth.email.template.recovery]');
    expect(config).toContain('content_path = "./supabase/templates/recovery.html"');
  });

  it('stores a valid reopening submission without creating auth or Stripe records', async () => {
    const db = new FakeDatabase();
    const response = await captureReopeningWaitlist(waitlistRequest(' Person@Example.com '), {
      DB: db,
      LEAD_RATE_LIMIT_SALT: 'test-salt-with-at-least-32-characters',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      TURNSTILE_SECRET_KEY: 'server-only-test-secret',
    } as never);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      reopeningDate: '2026-09-30',
      offer: 'one_month_free',
    });
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0]).toEqual([
      'person@example.com',
      REOPENING_OFFER,
      'reopening_list',
      expect.stringContaining('one full month free'),
    ]);
    const worker = fs.readFileSync('worker/lead-capture.ts', 'utf8');
    expect(worker).not.toContain('auth.signUp');
    expect(worker).not.toContain('stripe.customers');
  });

  it('deduplicates repeated waitlist submissions idempotently', async () => {
    const db = new FakeDatabase();
    const env = {
      DB: db,
      LEAD_RATE_LIMIT_SALT: 'test-salt-with-at-least-32-characters',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      TURNSTILE_SECRET_KEY: 'server-only-test-secret',
    } as never;
    expect((await captureReopeningWaitlist(waitlistRequest('same@example.com'), env)).status).toBe(200);
    expect((await captureReopeningWaitlist(waitlistRequest('same@example.com'), env)).status).toBe(200);
    expect(db.statements.some(sql => sql.includes('ON CONFLICT(email, offer) DO UPDATE'))).toBe(true);
    expect(db.inserts).toHaveLength(2);
    expect(db.inserts[0]?.slice(0, 2)).toEqual(db.inserts[1]?.slice(0, 2));
  });

  it('rejects invalid email and displays the exact reopening offer', async () => {
    const db = new FakeDatabase();
    const response = await captureReopeningWaitlist(waitlistRequest('not-an-email'), {
      DB: db,
      LEAD_RATE_LIMIT_SALT: 'test-salt-with-at-least-32-characters',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      TURNSTILE_SECRET_KEY: 'server-only-test-secret',
    } as never);
    expect(response.status).toBe(400);
    expect(db.inserts).toHaveLength(0);

    const notice = fs.readFileSync('src/components/ReopeningNotice.tsx', 'utf8');
    expect(REOPENING_DATE_DISPLAY).toBe('September 30, 2026');
    expect(notice).toContain('September 30, 2026');
    expect(notice).toContain('receive your first month free');
    expect(notice).toContain('Already have access?');
    expect(REOPENING_OFFER).toBe('reopening-one-month-free-2026-10-25');
  });

  it('preserves existing-customer login, sessions, and authorized account routing', () => {
    const auth = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');
    const form = fs.readFileSync('src/app/sign-up-login-screen/components/AuthForm.tsx', 'utf8');
    const proxy = fs.readFileSync('src/proxy.ts', 'utf8');
    expect(auth).toContain('signInWithPassword');
    expect(auth).toContain('getSession()');
    expect(form).toContain('resolvePostLoginDestination');
    expect(form).toContain('getAdministratorDestination');
    expect(form).not.toContain('user_metadata');
    expect(proxy).toContain('getWorkspaceEntitlementDecision');
  });

  it('renders Turnstile only after the waitlist API requests a challenge and retries once with the token', () => {
    const form = fs.readFileSync('src/components/ReopeningWaitlistForm.tsx', 'utf8');
    expect(form).toContain("result.code === 'CHALLENGE_REQUIRED'");
    expect(form).toContain("challenge.phase === 'required'");
    expect(form).toContain('<TurnstileChallenge');
    expect(form).toContain('getRuntimeTurnstileSiteKey');
    expect(form).toContain('challengeRetryInFlight.current');
    expect(form).toContain('await submitWaitlist(token)');
    expect(form).not.toContain('TURNSTILE_SECRET_KEY');
  });
});
