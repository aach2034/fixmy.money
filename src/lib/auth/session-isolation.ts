export const AUTH_FAILURE_PATH = '/login?auth_transition=verification_failed';

export const AUTH_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
  Expires: '0',
  Pragma: 'no-cache',
};

export function includeCookieInVary(value: string | null): string {
  const names = (value || '')
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);
  if (!names.some(name => name.toLowerCase() === 'cookie')) names.push('Cookie');
  return names.join(', ');
}

export function getSafeCallbackPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/onboarding';
  }
  return value;
}

export function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith('sb-') && name.includes('-auth-token');
}
