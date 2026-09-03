import { unstable_noStore as noStore } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';

export type AttentionLevel = 'green' | 'yellow' | 'red';
export type CustomerType = 'real' | 'internal' | 'qa' | 'demo' | 'test';
export type RetentionQueue = 'needs_attention' | 'win_back' | 'test_internal' | 'none';
export type AlertStatus = 'active' | 'dismissed' | 'contacted' | 'snoozed';

export type AttentionIssue = {
  key: string;
  label: string;
  recommendedAction: string;
  level: Exclude<AttentionLevel, 'green'>;
  urgency: number;
};

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
  customerType: CustomerType;
  doNotContact: boolean;
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
  attentionIssues: AttentionIssue[];
  topIssue: AttentionIssue | null;
  queue: RetentionQueue;
  urgency: number;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  created_at: string | null;
  onboarding_completed: boolean | null;
  customer_type?: string | null;
  do_not_contact?: boolean | null;
};

type WorkspaceEntitlementAdminRow = {
  stripe_customer_id: string | null;
  stripe_status: string | null;
  access_state: string | null;
  plan_id: string | null;
  trial_ends_at: string | null;
  workspaces: { owner_id: string } | Array<{ owner_id: string }> | null;
};

type AlertStateRow = {
  customer_id: string | null;
  alert_key: string | null;
  status: AlertStatus | string | null;
  snoozed_until: string | null;
};

type CountMap = Map<string, number>;

const CUSTOMER_TYPES = new Set<CustomerType>(['real', 'internal', 'qa', 'demo', 'test']);
const NON_CUSTOMER_TYPES = new Set<CustomerType>(['internal', 'qa', 'demo', 'test']);
const WIN_BACK_STATUSES = new Set(['canceled', 'cancelled', 'canceling', 'expired', 'incomplete_expired']);
const ACTIVE_OR_RECOVERABLE_STATUSES = new Set(['active', 'trialing', 'trial_active', 'past_due', 'overdue', 'unpaid', 'incomplete', 'none', 'inactive', '']);

function increment(map: CountMap, ownerId: string | null | undefined, amount = 1) {
  if (!ownerId) return;
  map.set(ownerId, (map.get(ownerId) ?? 0) + amount);
}

function maxDate(current: string | null, candidate: string | null | undefined): string | null {
  if (!candidate) return current;
  if (!current) return candidate;
  return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
}

function normalizeCustomerType(value: string | null | undefined): CustomerType {
  return CUSTOMER_TYPES.has(value as CustomerType) ? (value as CustomerType) : 'real';
}

function entitlementOwnerId(row: WorkspaceEntitlementAdminRow): string | null {
  const workspace = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces;
  return workspace?.owner_id || null;
}

function entitlementDisplayStatus(row: WorkspaceEntitlementAdminRow | undefined): string {
  if (!row) return 'none';
  if (row.access_state === 'active') return 'active';
  if (row.access_state === 'trial') return 'trialing';
  if (row.access_state === 'grace') return 'past_due';
  const inactiveStripeStatus = String(row.stripe_status || 'none').toLowerCase();
  return ['past_due', 'unpaid', 'paused', 'canceled', 'incomplete', 'incomplete_expired'].includes(inactiveStripeStatus)
    ? inactiveStripeStatus
    : 'expired';
}

export function classifyCustomer(input: {
  email: string;
  fullName?: string;
  currentType?: string | null;
  isPlatformAdmin?: boolean;
}): CustomerType {
  const explicit = normalizeCustomerType(input.currentType);
  if (explicit !== 'real') return explicit;

  const email = input.email.toLowerCase();
  const name = (input.fullName ?? '').toLowerCase();
  if (input.isPlatformAdmin || email.includes('adamchamilton') || email.endsWith('@fixmy.money')) return 'internal';
  if (email.includes('demo') || name.includes('demo')) return 'demo';
  if (email.includes('qa') || name.includes('qa user') || name.includes(' qa ')) return 'qa';
  if (email.includes('yopmail') || email.includes('test') || email.endsWith('.invalid') || email.includes('example.')) return 'test';
  return 'real';
}

function isSuppressed(issue: AttentionIssue, states: Map<string, AlertStateRow>, now: Date) {
  const state = states.get(issue.key);
  if (!state) return false;
  if (state.status === 'dismissed' || state.status === 'contacted') return true;
  if (state.status === 'snoozed' && state.snoozed_until) {
    return new Date(`${state.snoozed_until}T23:59:59`).getTime() >= now.getTime();
  }
  return false;
}

function sortIssues(issues: AttentionIssue[]) {
  return [...issues].sort((a, b) => b.urgency - a.urgency || a.label.localeCompare(b.label));
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
  doNotContact?: boolean;
  now?: Date;
}): { level: AttentionLevel; reasons: string[]; issues: AttentionIssue[] } {
  const now = input.now ?? new Date();
  const issues: AttentionIssue[] = [];
  const status = input.subscriptionStatus.toLowerCase();

  const add = (issue: AttentionIssue) => issues.push(issue);

  if (input.doNotContact) {
    add({ key: 'do_not_contact', label: 'Marked do not contact', recommendedAction: 'Do not contact', level: 'yellow', urgency: 5 });
  }
  if (!input.onboardingCompleted) {
    add({ key: 'incomplete_onboarding', label: 'Incomplete onboarding', recommendedAction: 'Help finish onboarding', level: 'red', urgency: 96 });
  }
  if (input.reportsImported === 0) {
    add({ key: 'no_report_imported', label: 'No credit report imported', recommendedAction: 'Offer import assistance', level: 'yellow', urgency: 72 });
  }
  if (input.reportsImported > 0 && input.disputeRounds === 0 && input.lettersGenerated === 0) {
    add({ key: 'report_no_dispute', label: 'Report imported but no dispute generated', recommendedAction: 'Help start first dispute', level: 'yellow', urgency: 82 });
  }
  if (input.failedImports > 0) {
    add({
      key: 'failed_report_workflow',
      label: `${input.failedImports} failed or incomplete report workflow${input.failedImports === 1 ? '' : 's'}`,
      recommendedAction: 'Offer import troubleshooting',
      level: 'red',
      urgency: 90,
    });
  }
  if (['past_due', 'overdue', 'unpaid', 'incomplete', 'incomplete_expired'].includes(status)) {
    add({ key: 'subscription_problem', label: `Subscription/payment status: ${input.subscriptionStatus}`, recommendedAction: 'Help resolve billing', level: 'red', urgency: 88 });
  }
  if (WIN_BACK_STATUSES.has(status)) {
    add({ key: 'canceled_or_expired', label: `Cancellation/expired status: ${input.subscriptionStatus}`, recommendedAction: 'Review cancellation reason / win-back', level: 'red', urgency: 68 });
  }
  if (['trialing', 'trial_active'].includes(status) && input.trialEnd) {
    const days = Math.ceil((new Date(input.trialEnd).getTime() - now.getTime()) / 86_400_000);
    if (days >= 0 && days <= 3) {
      add({
        key: 'trial_ending_soon',
        label: `Trial ends in ${days} day${days === 1 ? '' : 's'}`,
        recommendedAction: 'Contact today',
        level: 'yellow',
        urgency: 100 - days,
      });
    }
  }
  if (input.overdueFollowUps > 0) {
    add({ key: 'overdue_follow_up', label: `${input.overdueFollowUps} overdue follow-up${input.overdueFollowUps === 1 ? '' : 's'}`, recommendedAction: 'Complete follow-up', level: 'red', urgency: 92 });
  }
  if (input.openFollowUps > 0 && input.overdueFollowUps === 0) {
    add({ key: 'open_follow_up', label: `${input.openFollowUps} open follow-up${input.openFollowUps === 1 ? '' : 's'}`, recommendedAction: 'Review scheduled follow-up', level: 'yellow', urgency: 58 });
  }
  if (input.lastWorkflowAt) {
    const inactiveDays = Math.floor((now.getTime() - new Date(input.lastWorkflowAt).getTime()) / 86_400_000);
    if (inactiveDays >= 30) {
      add({ key: 'inactive_30_days', label: `No workflow activity in ${inactiveDays} days`, recommendedAction: 'Send check-in', level: 'yellow', urgency: Math.max(30, 62 - Math.min(inactiveDays, 90) / 3) });
    }
  }

  const sorted = sortIssues(issues);
  const level = sorted.some((issue) => issue.level === 'red') ? 'red' : sorted.length > 0 ? 'yellow' : 'green';
  return { level, reasons: sorted.map((issue) => issue.label), issues: sorted };
}

export function getQueueForCustomer(input: {
  customerType: CustomerType;
  subscriptionStatus: string;
  attentionIssues: AttentionIssue[];
  doNotContact: boolean;
}): RetentionQueue {
  if (NON_CUSTOMER_TYPES.has(input.customerType)) return 'test_internal';
  if (input.doNotContact) return 'none';
  const status = input.subscriptionStatus.toLowerCase();
  if (WIN_BACK_STATUSES.has(status)) return 'win_back';
  if (ACTIVE_OR_RECOVERABLE_STATUSES.has(status) && input.attentionIssues.length > 0) return 'needs_attention';
  return 'none';
}

export function filterCustomers(
  customers: AdminCustomerSummary[],
  filters: { q?: string; status?: string; include_test_internal?: string }
): AdminCustomerSummary[] {
  const q = (filters.q ?? '').trim().toLowerCase();
  const status = (filters.status ?? '').trim();
  const includeTestInternal = filters.include_test_internal === 'true';

  return customers.filter((customer) => {
    const matchesSearch =
      !q ||
      customer.email.toLowerCase().includes(q) ||
      customer.fullName.toLowerCase().includes(q) ||
      customer.companyName.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (!includeTestInternal && customer.queue === 'test_internal') return false;
    if (!status || status === 'all') return true;
    if (status === 'active') return customer.customerType === 'real' && ['active', 'trialing', 'trial_active'].includes(customer.subscriptionStatus);
    if (status === 'trial') return customer.customerType === 'real' && ['trialing', 'trial_active'].includes(customer.subscriptionStatus);
    if (status === 'canceled') return customer.customerType === 'real' && WIN_BACK_STATUSES.has(customer.subscriptionStatus);
    if (status === 'needs_attention') return customer.queue === 'needs_attention';
    if (status === 'win_back') return customer.queue === 'win_back';
    if (status === 'test_internal') return customer.queue === 'test_internal';
    if (status === 'do_not_contact') return customer.doNotContact;
    if (status === 'no_report') return customer.customerType === 'real' && customer.reportsImported === 0;
    if (status === 'no_dispute') return customer.customerType === 'real' && customer.reportsImported > 0 && customer.disputeRounds === 0;
    return true;
  });
}

export async function getAdminCustomerSummaries() {
  noStore();
  const admin = getAdminClient();
  const [
    profilesResult,
    entitlementsResult,
    reportsResult,
    importsResult,
    negativeItemsResult,
    roundsResult,
    lettersResult,
    followUpsResult,
    alertStatesResult,
    platformAdminsResult,
  ] = await Promise.all([
    admin.from('user_profiles').select('id,email,full_name,company_name,created_at,onboarding_completed,customer_type,do_not_contact').order('created_at', { ascending: false }),
    admin.from('workspace_entitlements').select('stripe_customer_id,stripe_status,access_state,plan_id,trial_ends_at,workspaces!inner(owner_id)'),
    admin.from('parsed_credit_reports').select('owner_id,created_at,status,import_status'),
    admin.from('credit_report_imports').select('owner_id,created_at,import_status,error_code,error_message'),
    admin.from('negative_items').select('owner_id,created_at'),
    admin.from('dispute_rounds').select('owner_id,created_at'),
    admin.from('generated_dispute_letters').select('owner_id,created_at'),
    admin.from('admin_follow_up_tasks').select('customer_id,due_date,completed'),
    admin.from('admin_retention_alert_states').select('customer_id,alert_key,status,snoozed_until'),
    admin.from('platform_admins').select('user_id').eq('active', true),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (entitlementsResult.error) throw entitlementsResult.error;

  const reportCounts = new Map<string, number>();
  const failedImportCounts = new Map<string, number>();
  const negativeCounts = new Map<string, number>();
  const roundCounts = new Map<string, number>();
  const letterCounts = new Map<string, number>();
  const openFollowUps = new Map<string, number>();
  const overdueFollowUps = new Map<string, number>();
  const lastWorkflow = new Map<string, string | null>();
  const alertStates = new Map<string, Map<string, AlertStateRow>>();
  const platformAdminIds = new Set((platformAdminsResult.data ?? []).map((row) => row.user_id).filter(Boolean));
  const entitlementByOwner = new Map<string, WorkspaceEntitlementAdminRow>();
  for (const entitlement of (entitlementsResult.data ?? []) as unknown as WorkspaceEntitlementAdminRow[]) {
    const ownerId = entitlementOwnerId(entitlement);
    if (ownerId) entitlementByOwner.set(ownerId, entitlement);
  }
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
  for (const row of (alertStatesResult.data ?? []) as AlertStateRow[]) {
    if (!row.customer_id || !row.alert_key) continue;
    const customerStates = alertStates.get(row.customer_id) ?? new Map<string, AlertStateRow>();
    customerStates.set(row.alert_key, row);
    alertStates.set(row.customer_id, customerStates);
  }

  const customers = ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => {
    const entitlement = entitlementByOwner.get(profile.id);
    const subscriptionStatus = entitlementDisplayStatus(entitlement);
    const reportsImported = reportCounts.get(profile.id) ?? 0;
    const failedImports = failedImportCounts.get(profile.id) ?? 0;
    const disputeRounds = roundCounts.get(profile.id) ?? 0;
    const lettersGenerated = letterCounts.get(profile.id) ?? 0;
    const open = openFollowUps.get(profile.id) ?? 0;
    const overdue = overdueFollowUps.get(profile.id) ?? 0;
    const customerType = classifyCustomer({
      email: profile.email || '',
      fullName: profile.full_name || '',
      currentType: profile.customer_type,
      isPlatformAdmin: platformAdminIds.has(profile.id),
    });
    const doNotContact = Boolean(profile.do_not_contact);
    const rawAttention = getAttentionForCustomer({
      onboardingCompleted: Boolean(profile.onboarding_completed),
      subscriptionStatus,
      trialEnd: entitlement?.trial_ends_at || null,
      reportsImported,
      failedImports,
      disputeRounds,
      lettersGenerated,
      overdueFollowUps: overdue,
      openFollowUps: open,
      lastWorkflowAt: lastWorkflow.get(profile.id) ?? profile.created_at,
      doNotContact,
    });
    const customerStates = alertStates.get(profile.id) ?? new Map<string, AlertStateRow>();
    const visibleIssues = sortIssues(rawAttention.issues.filter((issue) => !isSuppressed(issue, customerStates, today)));
    const attentionLevel = visibleIssues.some((issue) => issue.level === 'red') ? 'red' : visibleIssues.length > 0 ? 'yellow' : 'green';
    const queue = getQueueForCustomer({ customerType, subscriptionStatus, attentionIssues: visibleIssues, doNotContact });

    return {
      id: profile.id,
      email: profile.email || '',
      fullName: profile.full_name || '',
      companyName: profile.company_name || '',
      createdAt: profile.created_at || '',
      onboardingCompleted: Boolean(profile.onboarding_completed),
      subscriptionStatus,
      subscriptionPlan: entitlement?.plan_id || '',
      stripeCustomerId: entitlement?.stripe_customer_id || '',
      customerType,
      doNotContact,
      trialEnd: entitlement?.trial_ends_at || null,
      paidTrial: entitlement?.access_state === 'trial' || entitlement?.access_state === 'active',
      reportsImported,
      failedImports,
      negativeItems: negativeCounts.get(profile.id) ?? 0,
      disputeRounds,
      lettersGenerated,
      openFollowUps: open,
      overdueFollowUps: overdue,
      lastWorkflowAt: lastWorkflow.get(profile.id) ?? null,
      attentionLevel,
      attentionReasons: visibleIssues.map((issue) => issue.label),
      attentionIssues: visibleIssues,
      topIssue: visibleIssues[0] ?? null,
      queue,
      urgency: visibleIssues[0]?.urgency ?? 0,
    } satisfies AdminCustomerSummary;
  });

  const realCustomers = customers.filter((customer) => customer.customerType === 'real');
  const needsAttention = customers
    .filter((customer) => customer.queue === 'needs_attention')
    .sort((a, b) => b.urgency - a.urgency || a.email.localeCompare(b.email));
  const winBack = customers
    .filter((customer) => customer.queue === 'win_back')
    .sort((a, b) => b.urgency - a.urgency || a.email.localeCompare(b.email));
  const testInternal = customers
    .filter((customer) => customer.queue === 'test_internal')
    .sort((a, b) => a.customerType.localeCompare(b.customerType) || a.email.localeCompare(b.email));

  const totals = {
    totalCustomers: realCustomers.length,
    activeSubscriptions: realCustomers.filter((c) => c.subscriptionStatus === 'active').length,
    activeTrials: realCustomers.filter((c) => ['trialing', 'trial_active'].includes(c.subscriptionStatus)).length,
    canceledSubscriptions: realCustomers.filter((c) => WIN_BACK_STATUSES.has(c.subscriptionStatus)).length,
    noReport: realCustomers.filter((c) => c.reportsImported === 0 && !c.doNotContact).length,
    reportNoDispute: realCustomers.filter((c) => c.reportsImported > 0 && c.disputeRounds === 0 && !c.doNotContact).length,
    inactive: realCustomers.filter((c) => c.attentionReasons.some((reason) => reason.startsWith('No workflow activity')) && !c.doNotContact).length,
    failedWorkflows: realCustomers.reduce((sum, c) => sum + c.failedImports, 0),
    testInternal: testInternal.length,
    doNotContact: realCustomers.filter((c) => c.doNotContact).length,
  };

  return { customers, realCustomers, totals, needsAttention, winBack, testInternal };
}

export async function getAdminCustomerProfile(customerId: string) {
  noStore();
  const admin = getAdminClient();
  const summaries = await getAdminCustomerSummaries();
  const summary = summaries.customers.find((customer) => customer.id === customerId);
  if (!summary) return null;

  const [workspaceResult, reportsResult, negativeResult, roundsResult, lettersResult, notesResult, followUpsResult, alertStatesResult, auditResult, billingResult] = await Promise.all([
    admin.from('workspaces').select('id,name,created_at,is_active').eq('owner_id', customerId).order('created_at', { ascending: false }),
    admin.from('parsed_credit_reports').select('id,client_id,provider,status,import_status,negative_count,accounts_count,created_at,saved_at,report_date').eq('owner_id', customerId).order('created_at', { ascending: false }).limit(20),
    admin.from('negative_items').select('id,client_id,report_id,bureau,creditor_name,negative_category,dispute_status,tag_status,is_negative,created_at,updated_at').eq('owner_id', customerId).order('created_at', { ascending: false }).limit(50),
    admin.from('dispute_rounds').select('id,client_id,round_number,title,status,items_count,bureaus,letters_generated,created_at,updated_at').eq('owner_id', customerId).order('created_at', { ascending: false }).limit(20),
    admin.from('generated_dispute_letters').select('id,client_id,round_id,bureau,status,items_count,created_at,updated_at').eq('owner_id', customerId).order('created_at', { ascending: false }).limit(30),
    admin.from('admin_customer_notes').select('id,note_text,admin_id,created_at').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(25),
    admin.from('admin_follow_up_tasks').select('id,description,due_date,completed,completed_at,admin_id,created_at,updated_at').eq('customer_id', customerId).order('completed', { ascending: true }).order('due_date', { ascending: true }).limit(25),
    admin.from('admin_retention_alert_states').select('id,alert_key,status,snoozed_until,reason,admin_id,created_at,updated_at').eq('customer_id', customerId).order('updated_at', { ascending: false }).limit(50),
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
    ...((alertStatesResult.data ?? []).map((alert) => ({ at: alert.updated_at || alert.created_at, label: `Retention alert ${alert.status}`, detail: `${alert.alert_key}${alert.reason ? ` · ${alert.reason}` : ''}` }))),
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
    alertStates: alertStatesResult.data ?? [],
    adminAudit: auditResult.data ?? [],
    billingEvents: billingResult.data ?? [],
    timeline,
  };
}
