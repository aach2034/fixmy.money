import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classifyCustomer, filterCustomers, getAttentionForCustomer, getQueueForCustomer, type AdminCustomerSummary } from '@/lib/admin/customerManagement';

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
    customerType: 'real',
    doNotContact: false,
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
    attentionIssues: [],
    topIssue: null,
    queue: 'none',
    urgency: 0,
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
    expect(source).toContain('updateRetentionAlert');
    expect(source).toContain('updateCustomerClassification');
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
    expect(result.issues.find((issue) => issue.key === 'no_report_imported')?.recommendedAction).toBe('Offer import assistance');
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
    expect(result.issues[0]?.recommendedAction).toBe('Help start first dispute');
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
    expect(result.issues[0]?.recommendedAction).toBe('Contact today');
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

describe('admin customer classification and queue routing', () => {
  const noReportIssue = {
    key: 'no_report_imported',
    label: 'No credit report imported',
    recommendedAction: 'Offer import assistance',
    level: 'yellow' as const,
    urgency: 72,
  };

  it('classifies obvious QA, demo, test, and internal records away from real customers', () => {
    expect(classifyCustomer({ email: 'signup.qa@example.com', fullName: 'Signup QA User' })).toBe('qa');
    expect(classifyCustomer({ email: 'client@demo.com', fullName: 'Demo Client' })).toBe('demo');
    expect(classifyCustomer({ email: 'consumer.rocket@yopmail.com', fullName: 'Consumer Rocket' })).toBe('test');
    expect(classifyCustomer({ email: 'adamchamilton@gmail.com', fullName: 'Adam Hamilton' })).toBe('internal');
    expect(classifyCustomer({ email: 'wendal@consumer.com', fullName: 'Wendal Singletary' })).toBe('real');
  });

  it('routes real, churned, non-customer, and do-not-contact accounts into separate queues', () => {
    expect(getQueueForCustomer({ customerType: 'real', subscriptionStatus: 'trialing', attentionIssues: [noReportIssue], doNotContact: false })).toBe('needs_attention');
    expect(getQueueForCustomer({ customerType: 'real', subscriptionStatus: 'canceled', attentionIssues: [noReportIssue], doNotContact: false })).toBe('win_back');
    expect(getQueueForCustomer({ customerType: 'demo', subscriptionStatus: 'trialing', attentionIssues: [noReportIssue], doNotContact: false })).toBe('test_internal');
    expect(getQueueForCustomer({ customerType: 'real', subscriptionStatus: 'active', attentionIssues: [noReportIssue], doNotContact: true })).toBe('none');
  });

  it('prioritizes trials ending in three days above stale inactivity', () => {
    const trial = getAttentionForCustomer({
      onboardingCompleted: true,
      subscriptionStatus: 'trialing',
      trialEnd: '2026-08-26T00:00:00.000Z',
      reportsImported: 1,
      failedImports: 0,
      disputeRounds: 1,
      lettersGenerated: 1,
      overdueFollowUps: 0,
      openFollowUps: 0,
      lastWorkflowAt: '2026-08-22T00:00:00.000Z',
      now: new Date('2026-08-23T12:00:00.000Z'),
    });
    const inactive = getAttentionForCustomer({
      onboardingCompleted: true,
      subscriptionStatus: 'active',
      trialEnd: null,
      reportsImported: 1,
      failedImports: 0,
      disputeRounds: 1,
      lettersGenerated: 1,
      overdueFollowUps: 0,
      openFollowUps: 0,
      lastWorkflowAt: '2026-06-04T00:00:00.000Z',
      now: new Date('2026-08-23T12:00:00.000Z'),
    });

    expect(trial.issues[0]?.key).toBe('trial_ending_soon');
    expect(trial.issues[0]?.urgency).toBeGreaterThan(inactive.issues[0]?.urgency ?? 0);
  });
});

describe('admin customer directory filtering', () => {
  const customers = [
    customer({ id: '1', email: 'alice@example.com', fullName: 'Alice Agency' }),
    customer({ id: '2', email: 'bob@example.com', fullName: 'Bob Bureau', reportsImported: 0, disputeRounds: 0 }),
    customer({ id: '3', email: 'casey@example.com', fullName: 'Casey Cancel', subscriptionStatus: 'canceled', queue: 'win_back', attentionIssues: [{ key: 'canceled_or_expired', label: 'Cancellation/expired status: canceled', recommendedAction: 'Review cancellation reason / win-back', level: 'red', urgency: 68 }], topIssue: { key: 'canceled_or_expired', label: 'Cancellation/expired status: canceled', recommendedAction: 'Review cancellation reason / win-back', level: 'red', urgency: 68 } }),
    customer({ id: '4', email: 'drew@example.com', fullName: 'Drew Dispute', reportsImported: 2, disputeRounds: 0, attentionLevel: 'yellow', attentionReasons: ['Report imported but no dispute generated'], queue: 'needs_attention', attentionIssues: [{ key: 'report_no_dispute', label: 'Report imported but no dispute generated', recommendedAction: 'Help start first dispute', level: 'yellow', urgency: 82 }], topIssue: { key: 'report_no_dispute', label: 'Report imported but no dispute generated', recommendedAction: 'Help start first dispute', level: 'yellow', urgency: 82 }, urgency: 82 }),
    customer({ id: '5', email: 'client@demo.com', fullName: 'Demo Client', customerType: 'demo', queue: 'test_internal' }),
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
    expect(filterCustomers(customers, { status: 'win_back' }).map((c) => c.id)).toEqual(['3']);
  });

  it('excludes test/internal customers by default unless explicitly included', () => {
    expect(filterCustomers(customers, {}).map((c) => c.id)).toEqual(['1', '2', '3', '4']);
    expect(filterCustomers(customers, { include_test_internal: 'true' }).map((c) => c.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(filterCustomers(customers, { status: 'test_internal' }).map((c) => c.id)).toEqual([]);
    expect(filterCustomers(customers, { status: 'test_internal', include_test_internal: 'true' }).map((c) => c.id)).toEqual(['5']);
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

describe('retention cleanup migration safety', () => {
  const migration = read('supabase/migrations/20260823190000_retention_queue_cleanup.sql');

  it('adds classification and do-not-contact metadata without touching customer workflow tables', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS customer_type');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS do_not_contact');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.admin_retention_alert_states');
    expect(migration).toContain('UNIQUE (customer_id, alert_key)');
  });

  it('keeps alert dispositions admin-only with RLS policies and no delete access', () => {
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration.match(/platform_admins pa/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain('admin_retention_alerts_no_delete');
    expect(migration).toContain('GRANT SELECT, INSERT, UPDATE ON public.admin_retention_alert_states TO authenticated');
  });

  it('backfills the specific non-customer patterns called out by the retention review', () => {
    expect(migration).toContain("%adamchamilton%");
    expect(migration).toContain("%demo%");
    expect(migration).toContain("%qa%");
    expect(migration).toContain("%yopmail%");
  });
});
