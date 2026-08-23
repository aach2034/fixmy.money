import { unstable_noStore as noStore } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';

export type AttentionLevel = 'green' | 'yellow' | 'red';

export type AdminCustomerSummary = {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
  createdAt: string;
  onboardingCompleted: boolean;
  subscriptionStatus: string;
  subscriptionPlan: string;
  stripeCustomerId: string;
  trialEnd: string | null;
  paidTrial: boolean;
  reportsImported: number;
  failedImports: number;
  negativeItems: number;
  disputeRounds: number;
  lettersGenerated: number;
  openFollowUps: number;
  overdueFollowUps: number;
  lastWorkflowAt: string | null;
  attentionLevel: AttentionLevel;
  attentionReasons: string[];
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  created_at: string | null;
  onboarding_completed: boolean | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  stripe_customer_id: string | null;
  trial_end: string | null;
  paid_trial: boolean | null;
};

type CountMap = Map<string, number>;

function increment(map: CountMap, ownerId: string | null | undefined, amount = 1) {
  if (!ownerId) return;
  map.set(ownerId, (map.get(ownerId) ?? 0) + amount);
}

function maxDate(current: string | null, candidate: string | null | undefined): string | null {
  if (!candidate) return current;
  if (!current) return candidate;
  return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
}

export function getAttentionForCustomer(input: {
  onboardingCompleted: boolean;
  subscriptionStatus: string;
  trialEnd: string | null;
  reportsImported: number;
  failedImports: number;
  disputeRounds: number;
  lettersGenerated: number;
  overdueFollowUps: number;
  openFollowUps: number;
  lastWorkflowAt: string | null;
  now?: Date;
}): { level: AttentionLevel; reasons: string[] } {
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  let level: AttentionLevel = 'green';
  const status = input.subscriptionStatus.toLowerCase();

  const mark = (next: AttentionLevel, reason: string) => {
    reasons.push(reason);
    if (next === 'red' || (next === 'yellow' && level === 'green')) level = next;
  };

  if (!input.onboardingCompleted) mark('red', 'Incomplete onboarding');
  if (input.reportsImported === 0) mark('yellow', 'No credit report imported');
  if (input.reportsImported > 0 && input.disputeRounds === 0 && input.lettersGenerated === 0) {
    mark('yellow', 'Report imported but no dispute generated');
  }
  if (input.failedImports > 0) mark('red', `${input.failedImports} failed or incomplete report workflow${input.failedImports === 1 ? '' : 's'}`);
  if (['past_due', 'overdue', 'unpaid', 'incomplete', 'incomplete_expired'].includes(status)) {
    mark('red', `Subscription/payment status: ${input.subscriptionStatus}`);
  }
  if (['canceled', 'cancelled', 'canceling'].includes(status)) {
    mark('red', `Cancellation status: ${input.subscriptionStatus}`);
  }
  if (['trialing', 'trial_active'].includes(status) && input.trialEnd) {
    const days = Math.ceil((new Date(input.trialEnd).getTime() - now.getTime()) / 86_400_000);
    if (days >= 0 && days <= 3) mark('yellow', `Trial ends in ${days} day${days === 1 ? '' : 's'}`);
  }
  if (input.overdueFollowUps > 0) mark('red', `${input.overdueFollowUps} overdue follow-up${input.overdueFollowUps === 1 ? '' : 's'}`);
  if (input.openFollowUps > 0 && input.overdueFollowUps === 0) mark('yellow', `${input.openFollowUps} open follow-up${input.openFollowUps === 1 ? '' : 's'}`);
  if (input.lastWorkflowAt) {
    const inactiveDays = Math.floor((now.getTime() - new Date(input.lastWorkflowAt).getTime()) / 86_400_000);
    if (inactiveDays >= 30) mark('yellow', `No workflow activity in ${inactiveDays} days`);
  }

  return { level, reasons };
}

export function filterCustomers(
  customers: AdminCustomerSummary[],
  filters: { q?: string; status?: string }
): AdminCustomerSummary[] {
  const q = (filters.q ?? '').trim().toLowerCase();
  const status = (filters.status ?? '').trim();

  return customers.filter((customer) => {
    const matchesSearch =
      !q ||
      customer.email.toLowerCase().includes(q) ||
      customer.fullName.toLowerCase().includes(q) ||
      customer.companyName.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (!status || status === 'all') return true;
    if (status === 'active') return ['active', 'trialing', 'trial_active'].includes(customer.subscriptionStatus);
    if (status === 'trial') return ['trialing', 'trial_active'].includes(customer.subscriptionStatus);
    if (status === 'canceled') return ['canceled', 'cancelled', 'canceling'].includes(customer.subscriptionStatus);
    if (status === 'needs_attention') return customer.attentionLevel !== 'green';
    if (status === 'no_report') return customer.reportsImported === 0;
    if (status === 'no_dispute') return customer.reportsImported > 0 && customer.disputeRounds === 0;
    return true;
  });
}

export async function getAdminCustomerSummaries() {
  noStore();
  const admin = getAdminClient();
  const [
    profilesResult,
    reportsResult,
    importsResult,
    negativeItemsResult,
    roundsResult,
    lettersResult,
    followUpsResult,
  ] = await Promise.all([
    admin.from('user_profiles').select('id,email,full_name,company_name,created_at,onboarding_completed,subscription_status,subscription_plan,stripe_customer_id,trial_end,paid_trial').order('created_at', { ascending: false }),
    admin.from('parsed_credit_reports').select('owner_id,created_at,status,import_status'),
    admin.from('credit_report_imports').select('owner_id,created_at,import_status,error_code,error_message'),
    admin.from('negative_items').select('owner_id,created_at'),
    admin.from('dispute_rounds').select('owner_id,created_at'),
    admin.from('generated_dispute_letters').select('owner_id,created_at'),
    admin.from('admin_follow_up_tasks').select('customer_id,due_date,completed'),
  ]);

  if (profilesResult.error) throw profilesResult.error;

  const reportCounts = new Map<string, number>();
  const failedImportCounts = new Map<string, number>();
  const negativeCounts = new Map<string, number>();
  const roundCounts = new Map<string, number>();
  const letterCounts = new Map<string, number>();
  const openFollowUps = new Map<string, number>();
  const overdueFollowUps = new Map<string, number>();
  const lastWorkflow = new Map<string, string | null>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const row of reportsResult.data ?? []) {
    increment(reportCounts, row.owner_id);
    const failed = ['failed', 'error', 'incomplete'].includes(String(row.status ?? '').toLowerCase()) || ['failed', 'error', 'incomplete'].includes(String(row.import_status ?? '').toLowerCase());
    if (failed) increment(failedImportCounts, row.owner_id);
    lastWorkflow.set(row.owner_id, maxDate(lastWorkflow.get(row.owner_id) ?? null, row.created_at));
  }

  for (const row of importsResult.data ?? []) {
    const failed = ['failed', 'error', 'incomplete'].includes(String(row.import_status ?? '').toLowerCase()) || Boolean(row.error_code || row.error_message);
    if (failed) increment(failedImportCounts, row.owner_id);
    lastWorkflow.set(row.owner_id, maxDate(lastWorkflow.get(row.owner_id) ?? null, row.created_at));
  }
  for (const row of negativeItemsResult.data ?? []) {
    increment(negativeCounts, row.owner_id);
    lastWorkflow.set(row.owner_id, maxDate(lastWorkflow.get(row.owner_id) ?? null, row.created_at));
  }
  for (const row of roundsResult.data ?? []) {
    increment(roundCounts, row.owner_id);
    lastWorkflow.set(row.owner_id, maxDate(lastWorkflow.get(row.owner_id) ?? null, row.created_at));
  }
  for (const row of lettersResult.data ?? []) {
    increment(letterCounts, row.owner_id);
    lastWorkflow.set(row.owner_id, maxDate(lastWorkflow.get(row.owner_id) ?? null, row.created_at));
  }
  for (const row of followUpsResult.data ?? []) {
    if (row.completed) continue;
    increment(openFollowUps, row.customer_id);
    if (row.due_date && new Date(`${row.due_date}T00:00:00`).getTime() < today.getTime()) {
      increment(overdueFollowUps, row.customer_id);
    }
  }

  const customers = ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => {
    const subscriptionStatus = profile.subscription_status || 'none';
    const reportsImported = reportCounts.get(profile.id) ?? 0;
    const failedImports = failedImportCounts.get(profile.id) ?? 0;
    const disputeRounds = roundCounts.get(profile.id) ?? 0;
    const lettersGenerated = letterCounts.get(profile.id) ?? 0;
    const open = openFollowUps.get(profile.id) ?? 0;
    const overdue = overdueFollowUps.get(profile.id) ?? 0;
    const attention = getAttentionForCustomer({
      onboardingCompleted: Boolean(profile.onboarding_completed),
      subscriptionStatus,
      trialEnd: profile.trial_end,
      reportsImported,
      failedImports,
      disputeRounds,
      lettersGenerated,
      overdueFollowUps: overdue,
      openFollowUps: open,
      lastWorkflowAt: lastWorkflow.get(profile.id) ?? profile.created_at,
    });

    return {
      id: profile.id,
      email: profile.email || '',
      fullName: profile.full_name || '',
      companyName: profile.company_name || '',
      createdAt: profile.created_at || '',
      onboardingCompleted: Boolean(profile.onboarding_completed),
      subscriptionStatus,
      subscriptionPlan: profile.subscription_plan || profile.subscription_status || '',
      stripeCustomerId: profile.stripe_customer_id || '',
      trialEnd: profile.trial_end,
      paidTrial: Boolean(profile.paid_trial),
      reportsImported,
      failedImports,
      negativeItems: negativeCounts.get(profile.id) ?? 0,
      disputeRounds,
      lettersGenerated,
      openFollowUps: open,
      overdueFollowUps: overdue,
      lastWorkflowAt: lastWorkflow.get(profile.id) ?? null,
      attentionLevel: attention.level,
      attentionReasons: attention.reasons,
    } satisfies AdminCustomerSummary;
  });

  const totals = {
    totalCustomers: customers.length,
    activeSubscriptions: customers.filter((c) => c.subscriptionStatus === 'active').length,
    activeTrials: customers.filter((c) => ['trialing', 'trial_active'].includes(c.subscriptionStatus)).length,
    canceledSubscriptions: customers.filter((c) => ['canceled', 'cancelled', 'canceling'].includes(c.subscriptionStatus)).length,
    noReport: customers.filter((c) => c.reportsImported === 0).length,
    reportNoDispute: customers.filter((c) => c.reportsImported > 0 && c.disputeRounds === 0).length,
    inactive: customers.filter((c) => c.attentionReasons.some((reason) => reason.startsWith('No workflow activity'))).length,
    failedWorkflows: customers.reduce((sum, c) => sum + c.failedImports, 0),
  };

  const needsAttention = customers
    .filter((customer) => customer.attentionLevel !== 'green')
    .sort((a, b) => {
      const rank = { red: 0, yellow: 1, green: 2 };
      return rank[a.attentionLevel] - rank[b.attentionLevel] || a.email.localeCompare(b.email);
    });

  return { customers, totals, needsAttention };
}

export async function getAdminCustomerProfile(customerId: string) {
  noStore();
  const admin = getAdminClient();
  const summaries = await getAdminCustomerSummaries();
  const summary = summaries.customers.find((customer) => customer.id === customerId);
  if (!summary) return null;

  const [workspaceResult, reportsResult, negativeResult, roundsResult, lettersResult, notesResult, followUpsResult, auditResult, billingResult] = await Promise.all([
    admin.from('workspaces').select('id,name,created_at,is_active').eq('owner_id', customerId).order('created_at', { ascending: false }),
    admin.from('parsed_credit_reports').select('id,client_id,provider,status,import_status,negative_count,accounts_count,created_at,saved_at,report_date').eq('owner_id', customerId).order('created_at', { ascending: false }).limit(20),
    admin.from('negative_items').select('id,client_id,report_id,bureau,creditor_name,negative_category,dispute_status,tag_status,is_negative,created_at,updated_at').eq('owner_id', customerId).order('created_at', { ascending: false }).limit(50),
    admin.from('dispute_rounds').select('id,client_id,round_number,title,status,items_count,bureaus,letters_generated,created_at,updated_at').eq('owner_id', customerId).order('created_at', { ascending: false }).limit(20),
    admin.from('generated_dispute_letters').select('id,client_id,round_id,bureau,status,items_count,created_at,updated_at').eq('owner_id', customerId).order('created_at', { ascending: false }).limit(30),
    admin.from('admin_customer_notes').select('id,note_text,admin_id,created_at').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(25),
    admin.from('admin_follow_up_tasks').select('id,description,due_date,completed,completed_at,admin_id,created_at,updated_at').eq('customer_id', customerId).order('completed', { ascending: true }).order('due_date', { ascending: true }).limit(25),
    admin.from('admin_action_audit_logs').select('id,admin_id,action,metadata,created_at').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(25),
    summary.stripeCustomerId
      ? admin.from('billing_events').select('event_type,status,stripe_created_at,created_at').eq('stripe_customer_id', summary.stripeCustomerId).order('created_at', { ascending: false }).limit(12)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const timeline = [
    { at: summary.createdAt, label: 'Account created', detail: summary.email },
    ...(summary.onboardingCompleted ? [{ at: summary.createdAt, label: 'Onboarding completed', detail: summary.companyName || summary.fullName || summary.email }] : []),
    ...((reportsResult.data ?? []).map((report) => ({ at: report.saved_at || report.created_at, label: 'Credit report imported', detail: `${report.provider || 'unknown'} · ${report.negative_count ?? 0} negative items` }))),
    ...((roundsResult.data ?? []).map((round) => ({ at: round.created_at, label: `Dispute Round ${round.round_number ?? ''} created`, detail: `${round.items_count ?? 0} items · ${(round.bureaus ?? []).join(', ')}` }))),
    ...((lettersResult.data ?? []).map((letter) => ({ at: letter.created_at, label: 'Letter generated', detail: `${letter.bureau || 'Bureau'} · ${letter.items_count ?? 0} items` }))),
    ...((followUpsResult.data ?? []).map((task) => ({ at: task.created_at, label: task.completed ? 'Follow-up completed/recorded' : 'Follow-up created', detail: task.description }))),
  ]
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at || '').getTime() - new Date(a.at || '').getTime());

  return {
    summary,
    workspaces: workspaceResult.data ?? [],
    reports: reportsResult.data ?? [],
    negativeItems: negativeResult.data ?? [],
    disputeRounds: roundsResult.data ?? [],
    letters: lettersResult.data ?? [],
    notes: notesResult.data ?? [],
    followUps: followUpsResult.data ?? [],
    adminAudit: auditResult.data ?? [],
    billingEvents: billingResult.data ?? [],
    timeline,
  };
}
