/** Values shared by browser and server analytics must never contain URL secrets or contact data. */
function decodeForInspection(value: string): string {
  let decoded = value;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function containsSensitiveText(value: string): boolean {
  const decoded = decodeForInspection(value);
  return /[\u0000-\u001f\u007f]/.test(decoded)
    || /@/.test(decoded)
    || /(?:https?:\/\/|\/\/|www\.)/i.test(decoded)
    || /(?:sk_(?:live|test)_|bearer\s|access[_-]?token|refresh[_-]?token|password|session[_-]?(?:id|token)|\bssn\b)/i.test(decoded)
    || /(?:\beyJ[a-z0-9_-]{15,}|\b[a-f0-9]{32,}\b|\b[a-z0-9_-]{40,}\b)/i.test(decoded)
    || /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/.test(decoded)
    || (/^[+()\d.\s-]+$/.test(decoded) && decoded.replace(/\D/g, '').length >= 7 && !/^\d{4}-\d{2}-\d{2}$/.test(decoded));
}

export function safeCampaignValue(value: string | null | undefined): string {
  if (typeof value !== 'string') return '';
  const decoded = decodeForInspection(value).trim();
  if (!decoded || decoded.length > 100 || containsSensitiveText(decoded)) return '';
  if (!/^[a-z0-9][a-z0-9 _.\-]*$/i.test(decoded)) return '';
  if (decoded.replace(/\D/g, '').length >= 7) return '';
  return decoded;
}

export function safeRoutePath(value: string | null | undefined): string {
  if (typeof value !== 'string' || !value) return '/';
  try {
    const path = new URL(value, 'https://fixmy.money').pathname;
    if (!path.startsWith('/') || path.length > 512 || containsSensitiveText(path)) return '/';
    return path.replace(/\/{2,}/g, '/');
  } catch {
    return '/';
  }
}

export function safeReferrerHost(value: string | null | undefined): string {
  if (typeof value !== 'string' || !value) return '';
  if (value.length <= 100 && /^[a-z0-9.-]+$/i.test(value)) return value.toLowerCase();
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    const host = url.hostname.toLowerCase();
    return host.length <= 100 && /^[a-z0-9.-]+$/.test(host) ? host : '';
  } catch {
    return '';
  }
}

export function safeReferralSource(value: string | null | undefined): string {
  if (typeof value === 'string' && value.length <= 100 && /^[a-z0-9.-]+$/i.test(value) && value.includes('.')) {
    return value.toLowerCase();
  }
  return safeCampaignValue(value);
}

const ROUTE_KEYS = new Set(['page_path', 'page_location', 'landing_page', 'last_landing_page', 'organic_landing_page', 'destination']);
const CAMPAIGN_KEYS = new Set([
  'referral_code', 'referral_source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'last_utm_source', 'last_utm_medium', 'last_utm_campaign', 'organic_utm_source', 'organic_utm_medium', 'organic_utm_campaign',
  'source', 'campaign',
]);
const SAFE_NAME_KEYS = new Set(['event_name', 'plan_name', 'item_name', 'tool_name', 'offer_name', 'file_name_extension']);

function isForbiddenKey(key: string): boolean {
  const normalized = key.replace(/([A-Z])/g, '_$1').toLowerCase();
  return /^(?:name|code|session|account_number|report_contents)$/.test(normalized)
    || /(?:^|_)(?:email|phone|password|token|ssn)(?:_|$)/.test(normalized)
    || (/(?:^|_)name$/.test(normalized) && !SAFE_NAME_KEYS.has(normalized));
}

export function sanitizeAnalyticsPayload(input: Record<string, unknown>): Record<string, unknown> {
  function clean(value: unknown, key: string, depth: number): unknown {
    if (isForbiddenKey(key) || depth > 6) return undefined;
    if (typeof value === 'string') {
      if (ROUTE_KEYS.has(key)) return safeRoutePath(value);
      if (key === 'organic_referrer') return safeReferrerHost(value);
      if (key === 'referral_source') return safeReferralSource(value) || undefined;
      if (CAMPAIGN_KEYS.has(key)) return safeCampaignValue(value) || undefined;
      if (value.length > 500 || containsSensitiveText(value)) return undefined;
      return value;
    }
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.map(item => clean(item, '', depth + 1)).filter(item => item !== undefined);
    if (value && typeof value === 'object') {
      const output: Record<string, unknown> = {};
      for (const [childKey, childValue] of Object.entries(value)) {
        const safe = clean(childValue, childKey, depth + 1);
        if (safe !== undefined) output[childKey] = safe;
      }
      return output;
    }
    return undefined;
  }
  return clean(input, '', 0) as Record<string, unknown>;
}
