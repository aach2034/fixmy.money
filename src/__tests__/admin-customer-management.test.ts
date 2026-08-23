import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { filterCustomers, getAttentionForCustomer, type AdminCustomerSummary } from '@/lib/admin/customerManagement';

const repoRoot = process.cwd();
const read = (path: string) => readFileSync(join(repoRoot, path), 'utf8');

function customer(overrides: Partial<AdminCustomerSummary> = {}): AdminCustomerSummary {
  return {
    id: 'customer-1',
    email: 'customer@example.test',
    fullName: 'Customer One',
    companyName: 'Customer Co',
    createdAt: '2026-08-01T00:00:00.000Z',
    onboardingCompleted: true,
    subscriptionStatus: 'active',
    subscriptionPlan: 'professional',
    stripeCustomerId: 'cus_test',
    trialEnd: null,
    paidTrial: false,
    reportsImported: 1,
    failedImports: 0,
    negativeItems: 4,
    disputeRounds: 1,
    lettersGenerated: 1,
    openFollowUps: 0,
    overdueFollowUps: 0,
    lastWorkflowAt: '2026-08-20T00:00:00.000Z',
    attentionLevel: 'green',
    attentionReasons: [],
    ...overrides,
  };
}

describe('admin customer-management authorization wiring', () => {
  it('protects admin routes with the shared server-side platform_admins check', () => {
    for (const path of [
      'src/app/admin/page.tsx',
      'src/app/admin/customers/page.tsx',
      'src/app/admin/customers/[customerId]/page.tsx',
      'src/app/admin/health/page.tsx',
      'src/app/admin/seo/page.tsx',
    ]) {
      expect(read(path)).toContain('requirePlatformAdmin');
    }
  });

  it('does not authorize the primary admin with a client-side email comparison', () => {
    const source = [
      read('src/lib/admin/authorization.ts'),
      read('src/app/admin/page.tsx'),
      read('src/app/admin/customers/page.tsx'),
      read('src/app/admin/customers/[customerId]/page.tsx'),
    ].join('\n');

    expect(source).not.toContain('adamchamilton@gmail.com');
    expect(source).not.toMatch(/email\s*={2,3}\s*['"]adamchamilton@gmail\.com['"]/);
    expect(source).toContain("from('platform_admins')");
  });

  it('keeps admin mutations behind server actions that call requirePlatformAdmin', () => {
    const source = read('src/app/admin/actions.ts');
    expect(source).toContain("'use server'");
    expect(source.match(/requirePlatformAdmin/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("from('admin_action_audit_logs')");
  });
});

describe('admin attention queue logic', () => {
  const now = new Date('2026-08-23T12:00:00.000Z');

  it('flags incomplete onboarding as red', () => {
    const result = getAttentionForCustomer({
      onboardingCompleted: false,
      subscriptionStatus: 'active',
      trialEnd: null,
      reportsImported: 0,
      failedImports: 0,
      disputeRounds: 0,
      lettersGenerated: 0,
      overdueFollowUps: 0,
      openFollowUps: 0,
      lastWorkflowAt: null,
      now,
    });

    expect(result.level).toBe('red');
    expect(result.reasons).toContain('Incomplete onboarding');
  });

  it('flags report imported without a generated dispute as yellow', () => {
    const result = getAttentionForCustomer({
      onboardingCompleted: true,
      subscriptionStatus: 'active',
      trialEnd: null,
      reportsImported: 1,
      failedImports: 0,
      disputeRounds: 0,
      lettersGenerated: 0,
      overdueFollowUps: 0,
      openFollowUps: 0,
      lastWorkflowAt: '2026-08-22T00:00:00.000Z',
      now,
    });

    expect(result.level).toBe('yellow');
    expect(result.reasons).toContain('Report imported but no dispute generated');
  });

  it('flags trial ending soon transparently', () => {
    const result = getAttentionForCustomer({
      onboardingCompleted: true,
      subscriptionStatus: 'trialing',
      trialEnd: '2026-08-25T00:00:00.000Z',
      reportsImported: 1,
      failedImports: 0,
      disputeRounds: 1,
      lettersGenerated: 1,
      overdueFollowUps: 0,
      openFollowUps: 0,
      lastWorkflowAt: '2026-08-22T00:00:00.000Z',
      now,
    });

    expect(result.level).toBe('yellow');
    expect(result.reasons).toContain('Trial ends in 2 days');
  });

  it('promotes payment problems and overdue follow-ups to red', () => {
    const result = getAttentionForCustomer({
      onboardingCompleted: true,
      subscriptionStatus: 'past_due',
      trialEnd: null,
      reportsImported: 1,
      failedImports: 0,
      disputeRounds: 1,
      lettersGenerated: 1,
      overdueFollowUps: 1,
      openFollowUps: 1,
      lastWorkflowAt: '2026-08-22T00:00:00.000Z',
      now,
    });

    expect(result.level).toBe('red');
    expect(result.reasons).toContain('Subscription/payment status: past_due');
    expect(result.reasons).toContain('1 overdue follow-up');
  });
});

describe('admin customer directory filtering', () => {
  const customers = [
    customer({ id: '1', email: 'alice@example.test', fullName: 'Alice Agency' }),
    customer({ id: '2', email: 'bob@example.test', fullName: 'Bob Bureau', reportsImported: 0, disputeRounds: 0 }),
    customer({ id: '3', email: 'casey@example.test', fullName: 'Casey Cancel', subscriptionStatus: 'canceled' }),
    customer({ id: '4', email: 'drew@example.test', fullName: 'Drew Dispute', reportsImported: 2, disputeRounds: 0, attentionLevel: 'yellow', attentionReasons: ['Report imported but no dispute generated'] }),
  ];

  it('searches by name and email', () => {
    expect(filterCustomers(customers, { q: 'alice' }).map((c) => c.id)).toEqual(['1']);
    expect(filterCustomers(customers, { q: 'bob@example' }).map((c) => c.id)).toEqual(['2']);
  });

  it('filters no-report, no-dispute, canceled, and needs-attention customers', () => {
    expect(filterCustomers(customers, { status: 'no_report' }).map((c) => c.id)).toEqual(['2']);
    expect(filterCustomers(customers, { status: 'no_dispute' }).map((c) => c.id)).toEqual(['4']);
    expect(filterCustomers(customers, { status: 'canceled' }).map((c) => c.id)).toEqual(['3']);
    expect(filterCustomers(customers, { status: 'needs_attention' }).map((c) => c.id)).toEqual(['4']);
  });
});

describe('admin migration safety', () => {
  const migration = read('supabase/migrations/20260823170000_admin_customer_management.sql');

  it('adds admin-only notes, follow-ups, and admin action audit tables', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.admin_customer_notes');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.admin_follow_up_tasks');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.admin_action_audit_logs');
  });

  it('uses active platform_admins policies for admin-specific tables', () => {
    expect(migration.match(/platform_admins pa/g)?.length).toBeGreaterThanOrEqual(6);
    expect(migration).toContain('pa.user_id = (SELECT auth.uid()) AND pa.active = true');
    expect(migration).toContain('admin_notes_no_delete');
    expect(migration).toContain('admin_audit_no_delete');
  });

  it('configures adamchamilton@gmail.com through platform_admins, not application UI state', () => {
    expect(migration).toContain("lower('adamchamilton@gmail.com')");
    expect(migration).toContain("role = 'platform_superadmin'");
    expect(migration).toContain('ON CONFLICT (user_id) DO UPDATE');
  });
});
