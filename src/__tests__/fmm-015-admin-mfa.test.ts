import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ADMIN_DESTRUCTIVE_AUTH_MAX_AGE_SECONDS,
  ADMIN_STEP_UP_MAX_AGE_SECONDS,
  createAdminDestructiveAuthorizationToken,
  createAdminStepUpToken,
  hashAdminActionMaterial,
  readSessionId,
  verifyAdminDestructiveAuthorizationToken,
  verifyAdminStepUpToken,
} from '@/lib/admin/security';
import {
  hasRecentAuthenticationMethod,
  hasRecentPrimaryAuthentication,
  isAuthenticationAfterRevocation,
} from '@/lib/auth/recent-auth';
import { contentSecurityPolicyFor } from '../../worker/security-controls';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const secret = 'synthetic-step-up-secret-with-at-least-32-characters';
const now = 1_800_000_000;

function jwt(payload: Record<string, unknown>): string {
  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
}

describe('FMM-015 administrator assurance', () => {
  it('binds recent step-up evidence to both the administrator and Supabase session', () => {
    const token = createAdminStepUpToken({ userId: 'admin-a', sessionId: 'session-a', issuedAt: now }, secret);
    expect(verifyAdminStepUpToken({ token, secret, userId: 'admin-a', sessionId: 'session-a', nowSeconds: now })).not.toBeNull();
    expect(verifyAdminStepUpToken({ token, secret, userId: 'admin-b', sessionId: 'session-a', nowSeconds: now })).toBeNull();
    expect(verifyAdminStepUpToken({ token, secret, userId: 'admin-a', sessionId: 'session-b', nowSeconds: now })).toBeNull();
  });

  it('rejects tampered, malformed, future, and expired step-up evidence', () => {
    const valid = createAdminStepUpToken({ userId: 'admin-a', sessionId: 'session-a', issuedAt: now }, secret);
    expect(verifyAdminStepUpToken({ token: `${valid}x`, secret, userId: 'admin-a', sessionId: 'session-a', nowSeconds: now })).toBeNull();
    expect(verifyAdminStepUpToken({ token: 'invalid', secret, userId: 'admin-a', sessionId: 'session-a', nowSeconds: now })).toBeNull();

    const future = createAdminStepUpToken({ userId: 'admin-a', sessionId: 'session-a', issuedAt: now + 31 }, secret);
    expect(verifyAdminStepUpToken({ token: future, secret, userId: 'admin-a', sessionId: 'session-a', nowSeconds: now })).toBeNull();

    const expired = createAdminStepUpToken({ userId: 'admin-a', sessionId: 'session-a', issuedAt: now - ADMIN_STEP_UP_MAX_AGE_SECONDS - 1 }, secret);
    expect(verifyAdminStepUpToken({ token: expired, secret, userId: 'admin-a', sessionId: 'session-a', nowSeconds: now })).toBeNull();
  });

  it('binds destructive authorization to action, target, material, user, and session', () => {
    const material = { customerId: 'customer-a', amountCents: 2500 };
    const token = createAdminDestructiveAuthorizationToken({
      userId: 'admin-a',
      sessionId: 'session-a',
      action: 'refund_issue',
      targetId: 'refund-a',
      materialHash: hashAdminActionMaterial(material),
      nonce: 'synthetic-one-time-nonce-with-more-than-32-characters',
      issuedAt: now,
      expiresAt: now + ADMIN_DESTRUCTIVE_AUTH_MAX_AGE_SECONDS,
    }, secret);
    const verify = (overrides: Partial<Parameters<typeof verifyAdminDestructiveAuthorizationToken>[0]> = {}) =>
      verifyAdminDestructiveAuthorizationToken({
        token, secret, userId: 'admin-a', sessionId: 'session-a', action: 'refund_issue',
        targetId: 'refund-a', material, nowSeconds: now, ...overrides,
      });
    expect(verify()).not.toBeNull();
    expect(verify({ action: 'customer_data_deletion' })).toBeNull();
    expect(verify({ targetId: 'refund-b' })).toBeNull();
    expect(verify({ material: { customerId: 'customer-a', amountCents: 2501 } })).toBeNull();
    expect(verify({ userId: 'admin-b' })).toBeNull();
    expect(verify({ sessionId: 'session-b' })).toBeNull();
    expect(verify({ token: `${token}x` })).toBeNull();
    expect(verify({ nowSeconds: now + ADMIN_DESTRUCTIVE_AUTH_MAX_AGE_SECONDS })).toBeNull();
  });

  it('rejects non-finite destructive material instead of colliding with null', () => {
    expect(() => hashAdminActionMaterial({ amountCents: Number.NaN })).toThrow(/finite/u);
    expect(() => hashAdminActionMaterial({ amountCents: Number.POSITIVE_INFINITY })).toThrow(/finite/u);
    expect(() => hashAdminActionMaterial({ amountCents: Number.NEGATIVE_INFINITY })).toThrow(/finite/u);
  });

  it('keeps reusable recent-auth separate from one-time destructive authorization', () => {
    const authorization = read('src/lib/admin/authorization.ts');
    expect(authorization).toContain('requireRecentPlatformAdmin(action: ReusableSensitiveAdminAction)');
    expect(authorization).toContain('requireOneTimePlatformAdmin(');
    expect(authorization).toContain("'consume_admin_destructive_authorization'");
  });

  it('extracts only a non-empty session binding from a Supabase JWT', () => {
    expect(readSessionId(jwt({ session_id: 'session-a' }))).toBe('session-a');
    expect(readSessionId(jwt({ session_id: '' }))).toBeNull();
    expect(readSessionId('not-a-jwt')).toBeNull();
  });

  it('requires recent primary authentication before billing management', () => {
    expect(hasRecentPrimaryAuthentication(jwt({ amr: [{ method: 'password', timestamp: now - 899 }] }), now)).toBe(true);
    expect(hasRecentPrimaryAuthentication(jwt({ amr: [{ method: 'password', timestamp: now - 901 }] }), now)).toBe(false);
    expect(hasRecentPrimaryAuthentication(jwt({ amr: [{ method: 'password', timestamp: now + 31 }] }), now)).toBe(false);
    expect(hasRecentPrimaryAuthentication(jwt({ iat: now, amr: [{ method: 'token_refresh', timestamp: now }] }), now)).toBe(false);
    expect(hasRecentPrimaryAuthentication(jwt({ iat: now }), now)).toBe(false);

    const route = read('src/app/api/stripe/billing-portal/route.ts');
    expect(route.indexOf('hasRecentPrimaryAuthentication')).toBeLessThan(route.indexOf('billingPortal.sessions.create'));
    expect(route).toContain("code: 'recent_auth_required'");
  });

  it('requires a genuinely fresh TOTP challenge before issuing administrator step-up evidence', () => {
    const fresh = jwt({ amr: [{ method: 'password', timestamp: now - 2_000 }, { method: 'totp', timestamp: now - 2 }] });
    const stale = jwt({ amr: [{ method: 'totp', timestamp: now - ADMIN_STEP_UP_MAX_AGE_SECONDS - 1 }] });
    expect(hasRecentAuthenticationMethod(fresh, new Set(['totp']), now)).toBe(true);
    expect(hasRecentAuthenticationMethod(stale, new Set(['totp']), now)).toBe(false);

    const actions = read('src/app/admin/security/actions.ts');
    const stepUpBody = actions.slice(actions.indexOf('export async function confirmAdminStepUp'), actions.indexOf('\n}', actions.indexOf('export async function confirmAdminStepUp')));
    expect(stepUpBody.indexOf('hasRecentAuthenticationMethod')).toBeLessThan(stepUpBody.indexOf('createAdminStepUpToken'));
  });

  it('invalidates every older admin login at the application revocation epoch', () => {
    const before = jwt({ amr: [{ method: 'password', timestamp: now - 1 }] });
    const after = jwt({ amr: [{ method: 'password', timestamp: now + 1 }] });
    expect(isAuthenticationAfterRevocation(before, now)).toBe(false);
    expect(isAuthenticationAfterRevocation(after, now)).toBe(true);
  });

  it('enforces database role, verified TOTP, and AAL2 on the server', () => {
    const authorization = read('src/lib/admin/authorization.ts');
    expect(authorization).toContain("from('platform_admins')");
    expect(authorization).toContain('getAuthenticatorAssuranceLevel()');
    expect(authorization).toContain('listFactors()');
    expect(authorization).toContain("factor.status === 'verified'");
    expect(authorization).toContain("assurance.currentLevel !== 'aal2'");
    expect(authorization).toContain('sessions_revoked_after');
    expect(authorization).toContain("role !== 'platform_admin' && role !== 'platform_superadmin'");
    expect(authorization).not.toContain('user_metadata');
  });

  it('requires fresh step-up before sensitive admin mutations and before side effects', () => {
    const actions = read('src/app/admin/actions.ts');
    for (const name of ['updateRetentionAlert', 'updateCustomerClassification']) {
      const body = actions.slice(actions.indexOf(`function ${name}`), actions.indexOf('\n}', actions.indexOf(`function ${name}`)));
      expect(body).toContain('requireRecentPlatformAdmin(');
      expect(body.indexOf('requireRecentPlatformAdmin(')).toBeLessThan(body.indexOf("getAdminClient()"));
    }
  });

  it('revokes sessions globally after factor removal and keeps audit metadata secret-free', () => {
    const panel = read('src/app/admin/security/AdminMfaPanel.tsx');
    const actions = read('src/app/admin/security/actions.ts');
    const route = read('src/app/api/admin/security/route.ts');
    expect(panel).not.toContain('mfa.unenroll');
    expect(panel.indexOf("operation: 'authorize_destructive'")).toBeLessThan(panel.indexOf("operation: 'remove_factor'"));
    expect(route).toContain('authorizeDestructiveAdminAction(');
    expect(route).toContain('removeAdminFactor(');
    expect(route).toContain("request.headers.get('origin')");
    expect(route).toContain("request.headers.get('x-fixmymoney-admin-security')");
    expect(actions).toContain('supabase.auth.mfa.unenroll');
    expect(actions).toContain('requireOneTimePlatformAdmin(');
    expect(actions).toContain("signOut({ scope: 'global' })");
    expect(actions).toContain("rpc('revoke_platform_admin_sessions'");
    expect(actions).toContain("'admin_step_up_succeeded'");
    expect(actions).not.toMatch(/metadata:\s*\{[^}]*\b(code|token|secret|cookie|factorId)\b/s);
  });

  it('uses database-authoritative revocation and atomic mutation/audit RPCs', () => {
    const migration = read('supabase/migrations/20260910034145_fmm_015_security_review_blockers.sql');
    const actions = read('src/app/admin/actions.ts');
    expect(migration).toContain('revoked_session_ids');
    expect(migration).toContain('FROM auth.sessions');
    expect(migration).toContain('AFTER INSERT ON auth.audit_log_entries');
    expect(migration).not.toContain('ON auth.mfa_factors');
    expect(migration).not.toContain('FROM auth.mfa_factors');
    expect(migration).toContain('mfa_factor_ids');
    expect(migration).toContain('clock_timestamp()');
    expect(actions).toContain("rpc('admin_update_retention_alert_atomic'");
    expect(actions).toContain("rpc('admin_update_customer_classification_atomic'");
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('request_id = p_request_id');
  });

  it('guards every administrator page, including MFA management, from ordinary customers', () => {
    for (const path of [
      'src/app/admin/page.tsx',
      'src/app/admin/acquisition/page.tsx',
      'src/app/admin/customers/page.tsx',
      'src/app/admin/customers/[customerId]/page.tsx',
      'src/app/admin/health/page.tsx',
      'src/app/admin/parser-debugger/page.tsx',
      'src/app/admin/seo/page.tsx',
    ]) {
      expect(read(path), path).toContain('requirePlatformAdmin');
    }
    expect(read('src/app/admin/security/page.tsx')).toContain('requirePlatformAdminEnrollmentIdentity');
    expect(read('src/app/admin/security/actions.ts')).toContain('requirePlatformAdminEnrollmentIdentity');
  });

  it('keeps inactive administrator bootstrap confined to MFA enrollment', () => {
    const authorization = read('src/lib/admin/authorization.ts');
    const destination = read('src/app/api/auth/administrator-destination/route.ts');
    const actions = read('src/app/admin/security/actions.ts');
    const panel = read('src/app/admin/security/AdminMfaPanel.tsx');
    const proxy = read('src/proxy.ts');

    expect(authorization).toContain('requirePlatformAdminEnrollmentIdentity');
    expect(authorization).toContain('requirePlatformAdminMfaBootstrap');
    expect(authorization).toContain('getAuthenticatedPlatformAdminRole');
    expect(destination).toContain("{ destination: enrollment ? '/admin/security' : null }");
    expect(actions).toContain('if (!active)');
    expect(actions).toContain('activationPending: true');
    expect(panel).toContain('Administrator access remains inactive');
    expect(proxy.slice(proxy.indexOf('const ONBOARDING_GATED_PATHS'), proxy.indexOf('const SUBSCRIPTION_GATED_PATHS'))).not.toContain("'/admin'");
    expect(authorization).not.toContain('user_metadata');
  });

  it('cannot leave administrator verification permanently busy after Auth settles', () => {
    const panel = read('src/app/admin/security/AdminMfaPanel.tsx');
    const verifyBody = panel.slice(panel.indexOf('async function verify()'), panel.indexOf('\n  async function removeFactor()'));

    expect(verifyBody.indexOf('try {')).toBeLessThan(verifyBody.indexOf('challengeAndVerify'));
    expect(verifyBody).toContain('withVerificationTimeout(');
    expect(verifyBody).toContain('finally {');
    expect(verifyBody).toContain('setBusy(false);');
    expect(verifyBody).toContain("window.location.assign('/admin')");
    expect(verifyBody).not.toContain("router.push('/admin')");
  });

  it('adds database tenant, role, MFA-bypass, and revoked-session denial tests', () => {
    const migration = read('supabase/migrations/20260910005214_fmm_015_admin_mfa_enforcement.sql');
    const databaseTest = read('supabase/tests/database/fmm_015_admin_mfa.test.sql');
    expect(migration).toContain("auth.jwt() ->> 'aal'");
    expect(migration).toContain('sessions_revoked_after');
    expect(databaseTest).toContain('tenant denial');
    expect(databaseTest).toContain('role denial');
    expect(databaseTest).toContain('MFA bypass denied');
    expect(databaseTest).toContain('revoked session is denied');
  });

  it('removes unsafe inline script execution and uses per-response nonces', () => {
    const policy = contentSecurityPolicyFor('https://fixmy.money/admin', 'synthetic-nonce');
    const scriptDirective = policy.split('; ').find(value => value.startsWith('script-src')) || '';
    expect(scriptDirective).toContain("'nonce-synthetic-nonce'");
    expect(scriptDirective).toContain("'strict-dynamic'");
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(read('worker/index.ts')).toContain(".on('script'");
    expect(read('worker/index.ts')).not.toContain('Secure HTML rendering is unavailable');
  });

  it('contains no hard-coded legacy Supabase JWT fallback', () => {
    const client = read('src/lib/supabase/client.ts');
    const config = read('src/lib/supabase/public-config.ts');
    expect(client).not.toContain('agxzfdyvewptjwdfuvwq');
    expect(client).not.toMatch(/eyJ[a-zA-Z0-9_-]+\./);
    expect(config).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  });

  it('documents and enforces the two-admin rollout stop condition', () => {
    const rollout = read('rocket/audit_report/fmm_015_local_security_candidate_20260908.md');
    expect(rollout).toContain('two independently controlled');
    expect(rollout).toContain('STOP');
    expect(rollout).toContain('ADMIN_STEP_UP_SECRET');
    expect(rollout).toContain('No production mutation');
  });
});
