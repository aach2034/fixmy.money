/**
 * SINGLE SOURCE OF TRUTH FOR PRICING
 *
 * All pricing surfaces must import from this file:
 * - Homepage pricing cards
 * - /pricing page
 * - Signup flow
 * - Checkout page
 * - Stripe Checkout API route
 * - Stripe webhook handler
 * - Billing portal
 * - FAQ content
 * - Schema.org structured data
 * - Confirmation emails
 *
 * The owner-approved customer-facing names are FixMy Credit, FixMy Pro, and
 * FixMy Scale. Stable technical IDs remain unchanged so existing subscriptions
 * and entitlements continue to resolve.
 * New FixMy Credit acquisition remains held. New paid activation remains held.
 * Annual billing is not published until matching Stripe prices are configured.
 */

export const PLAN_IDS = ['starter', 'professional', 'agency', 'enterprise'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** Plans offered to NEW business purchasers; never use PLAN_IDS for acquisition. */
export const BUSINESS_PLAN_IDS = ['professional', 'agency'] as const;
export type BusinessPlanId = (typeof BUSINESS_PLAN_IDS)[number];
export function isBusinessPlan(value: unknown): value is BusinessPlanId {
  return value === 'professional' || value === 'agency';
}

export const FREE_TRIAL_DAYS = 30;

/** Immutable identifier persisted with entitlement decisions and usage records. */
export const PLAN_CATALOG_VERSION = '2026-09-03.v1' as const;

export const PLAN_FEATURE_IDS = [
  'core_crm',
  'client_portal',
  'credit_report_import',
  'ai_assistant',
  'team_access',
  'data_export',
] as const;
export type PlanFeatureId = (typeof PLAN_FEATURE_IDS)[number];

export interface PlanConfig {
  id: PlanId;
  name: string;
  monthlyPrice: number | null; // null = custom/contact sales
  annualPrice: number | null;  // null = no approved annual Stripe price
  annualTotal: number | null;
  maxClients: number | null;   // null = unlimited
  maxTeamMembers: number | null; // null = unlimited
  storageGb: number | null;    // null = custom
  enabledFeatures: readonly PlanFeatureId[];
  description: string;
  features: string[];
  badge: string | null;
  highlight: boolean;
  cta: string;
  /** Stripe price ID env variable name (monthly). null for enterprise. */
  stripePriceIdEnvKey: string | null;
  /** Amount in cents for Stripe (monthly). null for enterprise. */
  stripeAmountCents: number | null;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'FixMy Credit',
    monthlyPrice: 39,
    annualPrice: null,
    annualTotal: null,
    maxClients: 3,
    maxTeamMembers: 1,
    storageGb: 5,
    enabledFeatures: ['core_crm', 'client_portal', 'credit_report_import', 'ai_assistant'],
    description: 'For people managing their own credit information. New enrollment is not yet available.',
    features: [
      'Core CRM',
      'Client portal',
      'Dispute management',
      'Credit report import',
      'Basic dispute letters',
      'Audit log',
      'Email support',
    ],
    badge: null,
    highlight: false,
    cta: 'View availability',
    stripePriceIdEnvKey: 'STRIPE_STARTER_PRICE_ID',
    stripeAmountCents: 3900,
  },
  professional: {
    id: 'professional',
    name: 'FixMy Pro',
    monthlyPrice: 99,
    annualPrice: null,
    annualTotal: null,
    maxClients: 300,
    maxTeamMembers: 3,
    storageGb: 25,
    enabledFeatures: ['core_crm', 'client_portal', 'credit_report_import', 'ai_assistant', 'team_access'],
    description: 'For credit professionals managing up to 300 active clients.',
    features: [
      'Client CRM and portal',
      'Credit report import and dispute management',
      'Editable letter drafts and audit log',
      'Lead and affiliate tools',
      'Structured report review',
      'Named verification and approval',
      'Workflow templates',
      'Response tracking',
      'Agency dashboard',
      'Priority email support',
    ],
    badge: null,
    highlight: true,
    cta: 'Start 30-day free trial',
    stripePriceIdEnvKey: 'STRIPE_PROFESSIONAL_PRICE_ID',
    stripeAmountCents: 9900,
  },
  agency: {
    id: 'agency',
    name: 'FixMy Scale',
    monthlyPrice: 199,
    annualPrice: null,
    annualTotal: null,
    maxClients: 600,
    maxTeamMembers: 6,
    storageGb: 100,
    enabledFeatures: ['core_crm', 'client_portal', 'credit_report_import', 'ai_assistant', 'team_access', 'data_export'],
    description: 'For growing agencies managing up to 600 active clients.',
    features: [
      'Everything in FixMy Pro',
      'Data export',
      'Onboarding assistance',
      'Priority support',
    ],
    badge: null,
    highlight: false,
    cta: 'Start 30-day free trial',
    stripePriceIdEnvKey: 'STRIPE_AGENCY_PRICE_ID',
    stripeAmountCents: 19900,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    annualTotal: null,
    maxClients: null,
    maxTeamMembers: null,
    storageGb: null,
    enabledFeatures: ['core_crm', 'client_portal', 'credit_report_import', 'ai_assistant', 'team_access', 'data_export'],
    description: 'Custom pricing for large agencies and multi-location operations.',
    features: [
      'Everything in FixMy Scale',
      'Custom integrations',
      'Dedicated success manager',
      'Custom SLA',
      'Custom data retention',
      'Security review',
      'Custom contract',
    ],
    badge: null,
    highlight: false,
    cta: 'Contact Sales',
    stripePriceIdEnvKey: null,
    stripeAmountCents: null,
  },
};

/** Ordered list for display (pricing cards, comparison tables, etc.) */
export const PLANS_LIST: PlanConfig[] = [
  PLANS.starter,
  PLANS.professional,
  PLANS.agency,
];

/** Published plan catalog; no new self-serve paid checkout is currently enabled. */
export const CHECKOUT_PLANS: PlanConfig[] = [
  PLANS.professional,
  PLANS.agency,
];

/**
 * Resolve the Stripe price ID for a plan from environment variables.
 * Returns null if the env var is missing or is a placeholder.
 */
export function getStripePriceId(planId: PlanId): string | null {
  const plan = PLANS[planId];
  if (!plan.stripePriceIdEnvKey) return null;
  const val = process.env[plan.stripePriceIdEnvKey];
  if (!val || val.startsWith('your-') || val.trim() === '') return null;
  return val;
}
