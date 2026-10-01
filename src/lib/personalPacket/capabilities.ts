import { getAdminClient } from '@/lib/supabase/admin';
import {
  canUseConsumerCapability, shouldSuspendForNonpayment,
  type CompletedServiceInvoice, type ConsumerCapability, type ConsumerCycleState,
} from '@/lib/billing/completedService';

export class PersonalCapabilityError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

export function decidePersonalCapability(
  state: ConsumerCycleState | null,
  invoice: CompletedServiceInvoice | null,
  capability: ConsumerCapability,
  now = Date.now(),
): boolean {
  // Legacy customers have no cycle. A state flag alone cannot suspend work.
  if (state !== 'suspended_nonpayment') return true;
  return !shouldSuspendForNonpayment(invoice, now) || canUseConsumerCapability(state, capability);
}

export async function requirePersonalCapability(input: {
  consumerId: string;
  planId: string | null;
  capability: ConsumerCapability;
}) {
  if (input.planId !== 'starter' || process.env.PERSONAL_PACKET_WORKFLOW_ENABLED !== 'true') return;
  const admin = getAdminClient();
  const { data: cycle, error: cycleError } = await admin.from('consumer_service_cycles')
    .select('id,state').eq('consumer_id', input.consumerId).eq('state', 'suspended_nonpayment')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (cycleError) throw new PersonalCapabilityError('PERSONAL_CAPABILITY_UNAVAILABLE', 503);
  if (!cycle) return;
  const { data: row, error: invoiceError } = await admin.from('completed_service_invoices')
    .select('cycle_id,packet_id,period_started_at,period_ended_at,amount_cents,status,stripe_invoice_id,due_at,grace_ends_at')
    .eq('cycle_id', cycle.id).maybeSingle();
  if (invoiceError) throw new PersonalCapabilityError('PERSONAL_CAPABILITY_UNAVAILABLE', 503);
  const invoice: CompletedServiceInvoice | null = row ? {
    cycleId: row.cycle_id, packetId: row.packet_id,
    completedPeriodStart: row.period_started_at, completedPeriodEnd: row.period_ended_at,
    amountCents: row.amount_cents, status: row.status,
    stripeInvoiceId: row.stripe_invoice_id, dueAt: row.due_at, graceEndsAt: row.grace_ends_at,
  } : null;
  if (!decidePersonalCapability(cycle.state, invoice, input.capability)) {
    throw new PersonalCapabilityError('PERSONAL_NEW_WORK_SUSPENDED', 403);
  }
}

export async function requirePersonalWorkspaceCapability(input: {
  workspaceId: string;
  consumerId: string;
  capability: ConsumerCapability;
}) {
  if (process.env.PERSONAL_PACKET_WORKFLOW_ENABLED !== 'true') return;
  const { data, error } = await getAdminClient().from('workspace_entitlements')
    .select('plan_id').eq('workspace_id', input.workspaceId).maybeSingle();
  if (error) throw new PersonalCapabilityError('PERSONAL_CAPABILITY_UNAVAILABLE', 503);
  await requirePersonalCapability({ consumerId: input.consumerId,
    planId: data?.plan_id ?? null, capability: input.capability });
}
