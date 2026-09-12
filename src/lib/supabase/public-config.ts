export type SupabasePublicConfig = { url: string; publishableKey: string };

function getBrowserRuntimeConfig(): SupabasePublicConfig | null {
  if (typeof document === 'undefined') return null;
  const { supabaseUrl = '', supabasePublishableKey = '' } = document.documentElement.dataset;
  return {
    url: supabaseUrl,
    publishableKey: supabasePublishableKey,
  };
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const runtimeConfig = getBrowserRuntimeConfig();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || runtimeConfig?.url || '';
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    runtimeConfig?.publishableKey ||
    '';

  if (!url || !publishableKey) {
    throw new Error('Supabase public URL and publishable key are required.');
  }
  return { url, publishableKey };
}
