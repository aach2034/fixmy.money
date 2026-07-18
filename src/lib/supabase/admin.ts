/**
 * SECURE SERVER-ONLY SUPABASE ADMIN CLIENT
 *
 * ⚠️  NEVER import this file into client components or pages rendered on the client.
 * ⚠️  This module uses SUPABASE_SERVICE_ROLE_KEY which bypasses Row Level Security.
 * ⚠️  Only use for trusted server-side operations (webhooks, admin routes, background jobs).
 *
 * This client:
 *  - Only uses SUPABASE_SERVICE_ROLE_KEY (never falls back to anon key)
 *  - Throws a clear server-side error when the key is missing
 *  - Never logs the key value
 *  - Never exposes the key to the browser
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateNotPartixDatabase } from './partix-guard';

let _adminClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase admin client using the service role key.
 * Throws if required environment variables are not configured.
 * Throws if NEXT_PUBLIC_SUPABASE_URL points to the Partix production database.
 * Must only be called from server-side code (API routes, server actions, edge functions).
 */
export function getAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;

  // PHASE 1 GUARD: Refuse to operate against the Partix production database.
  validateNotPartixDatabase();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl.trim() === '') {
    throw new Error(
      '[AdminClient] NEXT_PUBLIC_SUPABASE_URL is not configured. ' +
      'Add this environment variable to your server configuration.'
    );
  }

  if (!serviceRoleKey || serviceRoleKey.trim() === '' || serviceRoleKey.startsWith('your-')) {
    throw new Error(
      '[AdminClient] SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'Add this environment variable to your server configuration. '+ 'Never use the public anon key as a fallback for admin operations.'
    );
  }

  _adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}

/**
 * Validates that all required environment variables are present at startup.
 * Returns a list of missing variable names (never their values).
 */
export function validateRequiredEnvVars(): { valid: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ];

  const optional = ['APP_URL', 'NEXT_PUBLIC_SITE_URL'];

  const missing = required.filter((key) => {
    const val = process.env[key];
    return !val || val.trim() === '' || val.startsWith('your-');
  });

  return { valid: missing.length === 0, missing };
}

/**
 * Returns a health status object for environment variables.
 * Reports only whether each variable is configured — never its value.
 */
export function getEnvHealth(): Record<string, 'configured' | 'missing'> {
  const vars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'OPENAI_API_KEY',
    'APP_URL',
    'NEXT_PUBLIC_SITE_URL',
  ];

  const result: Record<string, 'configured' | 'missing'> = {};
  for (const key of vars) {
    const val = process.env[key];
    result[key] = val && val.trim() !== '' && !val.startsWith('your-') ? 'configured' : 'missing';
  }
  return result;
}
