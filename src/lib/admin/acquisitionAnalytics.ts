import { unstable_noStore as noStore } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import { getAdminCustomerSummaries } from '@/lib/admin/customerManagement';
import { isSearchConsoleConfigured } from '@/lib/seo/searchPerformance';

type EventRow = {
  event_name: string;
  user_id: string | null;
  occurred_at: string;
};

type AttributionProfileRow = {
  id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  landing_page: string | null;
  subscription_status: string | null;
  paid_trial: boolean | null;
};

type AttributionIdentityRow = Omit<AttributionProfileRow, 'subscription_status' | 'paid_trial'>;

export type FunnelStage = {
  key: string;
  label: string;
  total: number;
  last30Days: number;
  conversionFromPrevious: number | null;
};

export type AcquisitionSourceRow = {
  source: string;
  medium: string;
  signups: number;
  trials: number;
  paid: number;
};

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'trial_active']);

export function buildFunnelStages(input: {
  customerIds: Set<string>;
  customers: Array<{
    id: string;
    createdAt: string;
    onboardingCompleted: boolean;
    reportsImported: number;
    disputeRounds: number;
    lettersGenerated: number;
    paidTrial: boolean;
    subscriptionStatus: string;
  }>;
  events: EventRow[];
  cutoff: Date;
}): FunnelStage[] {
  const eventUsers = (eventName: string) => new Set(
    input.events
      .filter(event => event.event_name === eventName && event.user_id && input.customerIds.has(event.user_id))
      .map(event => event.user_id as string)
  );
  const recentEventUsers = (eventName: string) => new Set(
    input.events
      .filter(event => event.event_name === eventName && event.user_id && input.customerIds.has(event.user_id) && new Date(event.occurred_at) >= input.cutoff)
      .map(event => event.user_id as string)
  );

  const auditUsers = eventUsers('credit_audit_viewed');
  const wizardUsers = eventUsers('dispute_wizard_started');
  const disputeEventUsers = eventUsers('dispute_created');
  const letterEventUsers = eventUsers('letter_generated');
  const trialEventUsers = eventUsers('trial_started');
  const paidEventUsers = eventUsers('subscription_started');

  const raw = [
    {
      key: 'signup_completed', label: 'Accounts created',
      total: input.customers.length,
      last30Days: input.customers.filter(customer => new Date(customer.createdAt) >= input.cutoff).length,
    },
    {
      key: 'onboarding_completed', label: 'Onboarding completed',
      total: input.customers.filter(customer => customer.onboardingCompleted).length,
      last30Days: recentEventUsers('onboarding_completed').size,
    },
    {
      key: 'credit_report_import_completed', label: 'Report imported',
      total: input.customers.filter(customer => customer.reportsImported > 0).length,
      last30Days: recentEventUsers('credit_report_import_completed').size,
    },
    {
      key: 'credit_audit_viewed', label: 'Credit Audit viewed',
      total: auditUsers.size,
      last30Days: recentEventUsers('credit_audit_viewed').size,
    },
    {
      key: 'dispute_wizard_started', label: 'Dispute Wizard started',
      total: wizardUsers.size,
      last30Days: recentEventUsers('dispute_wizard_started').size,
    },
    {
      key: 'dispute_created', label: 'Dispute created',
      total: new Set([
        ...input.customers.filter(customer => customer.disputeRounds > 0).map(customer => customer.id),
        ...disputeEventUsers,
      ]).size,
      last30Days: recentEventUsers('dispute_created').size,
    },
    {
      key: 'letter_generated', label: 'Letter generated',
      total: new Set([
        ...input.customers.filter(customer => customer.lettersGenerated > 0).map(customer => customer.id),
        ...letterEventUsers,
      ]).size,
      last30Days: recentEventUsers('letter_generated').size,
    },
    {
      key: 'trial_started', label: 'Paid trial started',
      total: new Set([
        ...input.customers.filter(customer => customer.paidTrial || ACTIVE_STATUSES.has(customer.subscriptionStatus)).map(customer => customer.id),
        ...trialEventUsers,
      ]).size,
      last30Days: recentEventUsers('trial_started').size,
    },
    {
      key: 'subscription_started', label: 'Paid subscription',
      total: new Set([
        ...input.customers.filter(customer => customer.subscriptionStatus === 'active').map(customer => customer.id),
        ...paidEventUsers,
      ]).size,
      last30Days: recentEventUsers('subscription_started').size,
    },
  ];

  return raw.map((stage, index) => ({
    ...stage,
    conversionFromPrevious: index === 0 || raw[index - 1].total === 0
      ? null
      : stage.total / raw[index - 1].total,
  }));
}
export function buildSourceRows(profiles: AttributionProfileRow[], customerIds: Set<string>): AcquisitionSourceRow[] {
  const rows = new Map<string, AcquisitionSourceRow>();
  for (const profile of profiles) {
    if (!customerIds.has(profile.id)) continue;
    const source = profile.utm_source?.trim() || '(direct / unknown)';
    const medium = profile.utm_medium?.trim() || '(none)';
    const key = `${source}\u0000${medium}`;
    const row = rows.get(key) ?? { source, medium, signups: 0, trials: 0, paid: 0 };
    row.signups += 1;
    if (profile.paid_trial || ACTIVE_STATUSES.has(String(profile.subscription_status || '').toLowerCase())) row.trials += 1;
    if (String(profile.subscription_status || '').toLowerCase() === 'active') row.paid += 1;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.signups - a.signups || b.paid - a.paid).slice(0, 12);
}

export async function getAcquisitionAnalytics() {
  noStore();
  const admin = getAdminClient();
  const summaries = await getAdminCustomerSummaries();
  const customerIds = new Set(summaries.realCustomers.map(customer => customer.id));
  const cutoff = new Date(Date.now() - 30 * 86_400_000);

  const [eventsResult, profilesResult] = await Promise.all([
    admin.from('product_analytics_events').select('event_name,user_id,occurred_at').order('occurred_at', { ascending: false }),
    admin.from('user_profiles').select('id,utm_source,utm_medium,utm_campaign,landing_page'),
  ]);
  if (eventsResult.error) throw eventsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const events = (eventsResult.data ?? []) as EventRow[];
  const subscriptionByCustomer = new Map(
    summaries.customers.map(customer => [customer.id, customer])
  );
  const profiles = ((profilesResult.data ?? []) as AttributionIdentityRow[]).map(profile => {
    const customer = subscriptionByCustomer.get(profile.id);
    return {
      ...profile,
      subscription_status: customer?.subscriptionStatus || 'none',
      paid_trial: customer?.paidTrial || false,
    };
  });
  const stages = buildFunnelStages({
    customerIds,
    customers: summaries.realCustomers,
    events,
    cutoff,
  });

  return {
    stages,
    sources: buildSourceRows(profiles, customerIds),
    serverEventCount: events.filter(event => event.user_id && customerIds.has(event.user_id)).length,
    configured: {
      ga4Reporting: Boolean(
        String(process.env.GOOGLE_ANALYTICS_PROPERTY_ID ?? '').trim() &&
        String(process.env.GOOGLE_REPORTING_CLIENT_EMAIL ?? process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ?? '').trim() &&
        String(process.env.GOOGLE_REPORTING_PRIVATE_KEY ?? process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ?? '').trim()
      ),
      searchConsole: isSearchConsoleConfigured(),
    },
    generatedAt: new Date().toISOString(),
  };
}
