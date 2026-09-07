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
 * Trial: $1 today for 14 days, then the selected monthly plan. Cancel anytime.
 * Annual: ~20% discount (exact prices below).
 */

export const PLAN_IDS = ['starter', 'professional', 'agency', 'enterprise'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

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
  annualPrice: number | null;  // null = custom/contact sales
  annualTotal: number | null;  // monthlyPrice * 12 * 0.80, rounded
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
    name: 'Starter',
    monthlyPrice: 39,
    annualPrice: 31,
    annualTotal: 372,
    maxClients: 3,
    maxTeamMembers: 1,
    storageGb: 5,
    enabledFeatures: ['core_crm', 'client_portal', 'credit_report_import', 'ai_assistant'],
    description: 'For learning the core credit-review workflow.',
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
    cta: 'Start $1 Trial',
    stripePriceIdEnvKey: 'STRIPE_STARTER_PRICE_ID',
    stripeAmountCents: 3900,
  },
  professional: {
    id: 'professional',
    name: 'Pro',
    monthlyPrice: 99,
    annualPrice: 79,
    annualTotal: 948,
    maxClients: 300,
    maxTeamMembers: 3,
    storageGb: 25,
    enabledFeatures: ['core_crm', 'client_portal', 'credit_report_import', 'ai_assistant', 'team_access'],
    description: 'For credit professionals using the structured review workflow.',
    features: [
      'Everything in Starter',
      'Lead and affiliate tools',
      'Structured report review',
      'Named verification and approval',
      'Workflow templates',
      'Response tracking',
      'Agency dashboard',
      'Priority email support',
    ],
    badge: 'Most Popular',
    highlight: true,
    cta: 'Start $1 Trial',
    stripePriceIdEnvKey: 'STRIPE_PROFESSIONAL_PRICE_ID',
    stripeAmountCents: 9900,
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    monthlyPrice: 249,
    annualPrice: 199,
    annualTotal: 2388,
    maxClients: 600,
    maxTeamMembers: 6,
    storageGb: 100,
    enabledFeatures: ['core_crm', 'client_portal', 'credit_report_import', 'ai_assistant', 'team_access', 'data_export'],
    description: 'For established credit-repair organizations.',
    features: [
      'Everything in Pro',
      'Data export',
      'Onboarding assistance',
      'Priority support',
    ],
    badge: null,
    highlight: false,
    cta: 'Start $1 Trial',
    stripePriceIdEnvKey: 'STRIPE_AGENCY_PRICE_ID',
    stripeAmountCents: 24900,
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
      'Everything in Agency',
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

/** Plans available for self-serve checkout (excludes enterprise) */
export const CHECKOUT_PLANS: PlanConfig[] = [
  PLANS.starter,
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

/**
 * Trial configuration — one definition used everywhere.
 */
export const TRIAL_CONFIG = {
  durationDays: 14,
  chargeCents: 100,
  requiresCreditCard: true,
  gracePeriodDays: 3,
  retryPeriodDays: 7,
  label: '$1 today for 14 days, then your selected monthly plan. Cancel anytime.',
  shortLabel: '$1 for 14 days',
} as const;
