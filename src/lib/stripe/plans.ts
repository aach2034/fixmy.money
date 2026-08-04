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

export interface PlanConfig {
  id: PlanId;
  name: string;
  monthlyPrice: number | null; // null = custom/contact sales
  annualPrice: number | null;  // null = custom/contact sales
  annualTotal: number | null;  // monthlyPrice * 12 * 0.80, rounded
  maxClients: number | null;   // null = unlimited
  maxTeamMembers: number | null; // null = unlimited
  storageGb: number | null;    // null = custom
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
    name: 'Personal',
    monthlyPrice: 39,
    annualPrice: 31,
    annualTotal: 372,
    maxClients: 3,
    maxTeamMembers: 1,
    storageGb: 5,
    description: 'For learning the workflow with your own profile and up to 3 friends or family members.',
    features: [
      'Up to 3 friends and family profiles',
      '1 user',
      '5 GB storage',
      'Core CRM',
      'Client portal',
      'Dispute management',
      'Credit report upload',
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
    name: 'Start',
    monthlyPrice: 99,
    annualPrice: 79,
    annualTotal: 948,
    maxClients: 300,
    maxTeamMembers: 3,
    storageGb: 25,
    description: 'For entrepreneurs starting a legitimate credit repair business.',
    features: [
      'Up to 300 active clients',
      'Up to 3 team members',
      '25 GB storage',
      'Everything in Personal',
      'Client billing and payments',
      'Lead and affiliate tools',
      'Structured report review',
      'Evidence-linked draft assistance',
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
    name: 'Grow',
    monthlyPrice: 199,
    annualPrice: 159,
    annualTotal: 1908,
    maxClients: 600,
    maxTeamMembers: 6,
    storageGb: 100,
    description: 'For established teams ready to automate and grow.',
    features: [
      'Up to 600 active clients',
      'Up to 6 team members',
      '100 GB storage',
      'Everything in Start',
      'Role-based review controls',
      'Agency analytics dashboard',
      'Data export',
      'Onboarding assistance',
      'Priority support',
    ],
    badge: null,
    highlight: false,
    cta: 'Start $1 Trial',
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
    description: 'Custom pricing for large agencies and multi-location operations.',
    features: [
      'Unlimited clients',
      'Unlimited team members',
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
