import { getAdminClient } from '@/lib/supabase/admin';

export const PRODUCT_ANALYTICS_EVENTS = [
  'signup_completed',
  'onboarding_started',
  'onboarding_completed',
  'credit_report_import_started',
  'credit_report_import_completed',
  'credit_audit_viewed',
  'dispute_wizard_started',
  'dispute_created',
  'letter_generated',
  'checkout_started',
  'trial_started',
  'subscription_started',
  'subscription_upgraded',
  'subscription_cancelled',
] as const;

export type ProductAnalyticsEventName = (typeof PRODUCT_ANALYTICS_EVENTS)[number];

const ALLOWED_PROPERTY_KEYS = new Set([
  'plan', 'plan_name', 'previous_plan', 'source', 'campaign', 'landing_page',
  'device_type', 'page_path', 'user_type', 'authenticated', 'client_count',
  'provider', 'file_type', 'file_name_extension', 'parser_confidence',
  'accounts_count', 'negative_items_count', 'draft_letters_created',
  'bureau', 'bureau_count', 'items_count', 'round_number', 'destination',
  'currency', 'value', 'historical_backfill',
]);

function sanitizeValue(value: unknown): string | number | boolean | null {
  if (typeof value === 'string') return value.trim().slice(0, 160).replace(/[<>]/g, '');
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  return null;
}

export function sanitizeProductAnalyticsProperties(input: unknown): Record<string, string | number | boolean> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, rawValue] of Object.entries(input as Record<string, unknown>)) {
    if (!ALLOWED_PROPERTY_KEYS.has(key)) continue;
    const value = sanitizeValue(rawValue);
    if (value !== null && value !== '') sanitized[key] = value;
  }
  return sanitized;
}

export async function logProductAnalyticsEvent(input: {
  eventName: ProductAnalyticsEventName;
  userId?: string | null;
  stripeCustomerId?: string | null;
  properties?: Record<string, unknown>;
  dedupeKey?: string | null;
  occurredAt?: string | null;
}) {
  const admin = getAdminClient();
  let userId = input.userId || '';
  let profile: Record<string, unknown> | null = null;

  if (userId) {
    const { data } = await admin
      .from('user_profiles')
      .select('id,account_type,utm_source,utm_campaign,landing_page,last_utm_source,last_utm_campaign,last_landing_page')
      .eq('id', userId)
      .maybeSingle();
    profile = data;
  } else if (input.stripeCustomerId) {
    const { data } = await admin
      .from('user_profiles')
      .select('id,account_type,utm_source,utm_campaign,landing_page,last_utm_source,last_utm_campaign,last_landing_page')
      .eq('stripe_customer_id', input.stripeCustomerId)
      .maybeSingle();
    profile = data;
    userId = String(data?.id || '');
  }

  if (!userId) return { recorded: false, reason: 'user_not_resolved' } as const;

  const attribution = profile ? {
    source: String(profile.last_utm_source || profile.utm_source || ''),
    campaign: String(profile.last_utm_campaign || profile.utm_campaign || ''),
    landing_page: String(profile.last_landing_page || profile.landing_page || ''),
    user_type: String(profile.account_type || ''),
  } : {};

  const properties = sanitizeProductAnalyticsProperties({
    ...attribution,
    ...(input.properties ?? {}),
  });

  const { error } = await admin.from('product_analytics_events').insert({
    user_id: userId,
    event_name: input.eventName,
    properties,
    dedupe_key: input.dedupeKey || null,
    occurred_at: input.occurredAt || new Date().toISOString(),
  });

  if (error?.code === '23505') return { recorded: false, reason: 'duplicate' } as const;
  if (error) throw error;
  return { recorded: true } as const;
}
