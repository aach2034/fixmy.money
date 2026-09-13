export interface RuntimePublicEnv {
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

export function getRuntimePublicAttributes(
  env?: RuntimePublicEnv,
): Record<string, string> | null {
  const turnstileSiteKey = env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';
  if (!turnstileSiteKey) return null;
  return { [TURNSTILE_SITE_KEY_ATTRIBUTE]: turnstileSiteKey };
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
