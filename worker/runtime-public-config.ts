export interface SupabasePublicEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

export interface RuntimePublicEnv extends SupabasePublicEnv {
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
}

export const TURNSTILE_SITE_KEY_ATTRIBUTE = 'data-turnstile-site-key';

function htmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function getSupabasePublicAttributes(
  env?: SupabasePublicEnv,
): Record<string, string> | null {
  const url = env?.NEXT_PUBLIC_SUPABASE_URL || '';
  const publishableKey =
    env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  if (!url || !publishableKey) return null;
  return {
    'data-supabase-url': url,
    'data-supabase-publishable-key': publishableKey,
  };
}

export function getRuntimePublicAttributes(
  env?: RuntimePublicEnv,
): Record<string, string> | null {
  const supabaseAttributes = getSupabasePublicAttributes(env);
  const turnstileSiteKey = env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';
  if (!supabaseAttributes && !turnstileSiteKey) return null;
  return {
    ...(supabaseAttributes || {}),
    ...(turnstileSiteKey ? { [TURNSTILE_SITE_KEY_ATTRIBUTE]: turnstileSiteKey } : {}),
  };
}

export function addRuntimePublicAttributesToHtml(
  html: string,
  attributes: Record<string, string> | null,
): string {
  if (!attributes) return html;
  const serialized = Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${htmlAttribute(value)}"`)
    .join('');
  return html.replace(/<html(?=[\s>])/i, `<html${serialized}`);
}

export function addSupabasePublicAttributesToHtml(
  html: string,
  attributes: Record<string, string> | null,
): string {
  return addRuntimePublicAttributesToHtml(html, attributes);
}
