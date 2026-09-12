export interface SupabasePublicEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

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

export function addSupabasePublicAttributesToHtml(
  html: string,
  attributes: Record<string, string> | null,
): string {
  if (!attributes) return html;
  const serialized = Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${htmlAttribute(value)}"`)
    .join('');
  return html.replace(/<html(?=[\s>])/i, `<html${serialized}`);
}
