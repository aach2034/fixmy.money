import { describe, expect, it } from 'vitest';
import { buildFunnelStages, buildSourceRows } from '@/lib/admin/acquisitionAnalytics';

describe('admin acquisition funnel', () => {
  const now = new Date('2026-08-29T12:00:00.000Z');
  const cutoff = new Date('2026-07-30T12:00:00.000Z');
  const customers = [
    {
      id: 'real-1', createdAt: '2026-08-01T00:00:00.000Z', onboardingCompleted: true,
      reportsImported: 1, disputeRounds: 1, lettersGenerated: 1, paidTrial: true,
      subscriptionStatus: 'active',
    },
    {
      id: 'real-2', createdAt: '2026-08-10T00:00:00.000Z', onboardingCompleted: true,
      reportsImported: 1, disputeRounds: 0, lettersGenerated: 0, paidTrial: false,
      subscriptionStatus: 'none',
    },
  ];

  it('counts distinct real users at each activation milestone', () => {
    const stages = buildFunnelStages({
      customerIds: new Set(['real-1', 'real-2']),
      customers,
      cutoff,
      events: [
        { event_name: 'credit_audit_viewed', user_id: 'real-1', occurred_at: now.toISOString() },
        { event_name: 'dispute_wizard_started', user_id: 'real-1', occurred_at: now.toISOString() },
        { event_name: 'trial_started', user_id: 'real-1', occurred_at: now.toISOString() },
        { event_name: 'credit_audit_viewed', user_id: 'test-user', occurred_at: now.toISOString() },
      ],
    });
    expect(stages.find(stage => stage.key === 'signup_completed')?.total).toBe(2);
    expect(stages.find(stage => stage.key === 'credit_audit_viewed')?.total).toBe(1);
    expect(stages.find(stage => stage.key === 'dispute_created')?.total).toBe(1);
    expect(stages.find(stage => stage.key === 'subscription_started')?.total).toBe(1);
  });

  it('reconciles first-touch sources with current trial and paid status', () => {
    const rows = buildSourceRows([
      { id: 'real-1', utm_source: 'google', utm_medium: 'organic', utm_campaign: '', landing_page: '/', subscription_status: 'active', paid_trial: true },
      { id: 'real-2', utm_source: '', utm_medium: '', utm_campaign: '', landing_page: '/pricing', subscription_status: 'none', paid_trial: false },
      { id: 'test-user', utm_source: 'test', utm_medium: 'qa', utm_campaign: '', landing_page: '/', subscription_status: 'active', paid_trial: true },
    ], new Set(['real-1', 'real-2']));
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'google', signups: 1, trials: 1, paid: 1 }),
      expect.objectContaining({ source: '(direct / unknown)', signups: 1, trials: 0, paid: 0 }),
    ]));
    expect(rows.some(row => row.source === 'test')).toBe(false);
  });
});
