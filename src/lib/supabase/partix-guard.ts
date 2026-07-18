/**
 * PARTIX DATABASE CONTAMINATION GUARD
 *
 * This module prevents FixMy.Money from accidentally connecting to the Partix
 * production Supabase project (qpgkbbtamfnodbbcqykd).
 *
 * Call validateNotPartixDatabase() at the top of any server-side entry point
 * (API routes, server actions, admin scripts) before performing any database
 * operations.
 *
 * This guard must NOT be imported into the Partix application.
 */

const PARTIX_PROJECT_REF = 'qpgkbbtamfnodbbcqykd';

/**
 * The confirmed FixMy.Money production project reference.
 * Selected on 2026-07-01 based on:
 *   - send-email edge function entrypoint path contains this ref
 *   - Supabase platform tools are connected to this project
 *   - Project bmhtfgudbcchnqgcjedj was rejected (see SEPARATION_REPORT.md)
 */
export const FIXMYMONEY_PROJECT_REF = 'agxzfdyvewptjwdfuvwq';

/**
 * The rejected candidate project reference.
 * Retained as FixMyMoney Test / Development.
 */
export const REJECTED_CANDIDATE_REF = 'bmhtfgudbcchnqgcjedj';

/**
 * Throws a clear, actionable error if NEXT_PUBLIC_SUPABASE_URL points to the
 * Partix production database.
 *
 * Safe to call on every server request — it is a no-op when the correct
 * FixMy.Money project is configured.
 */
export function validateNotPartixDatabase(): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

  if (supabaseUrl.includes(PARTIX_PROJECT_REF)) {
    throw new Error(
      'FixMy.Money is configured to use the Partix Supabase project. ' + 'Update the FixMy.Money Supabase environment variables before continuing.'
    );
  }
}

/**
 * Returns true if the current environment is pointing at the Partix database.
 * Use this for conditional checks where throwing is not appropriate (e.g. health
 * endpoints that need to report the misconfiguration rather than crash).
 */
export function isPartixDatabase(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return supabaseUrl.includes(PARTIX_PROJECT_REF);
}

/**
 * Returns the project reference extracted from NEXT_PUBLIC_SUPABASE_URL.
 * Returns null if the URL is not set or does not match the expected pattern.
 * Never returns the full URL or any key values.
 */
export function getConnectedProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  return match?.[1] ?? null;
}
