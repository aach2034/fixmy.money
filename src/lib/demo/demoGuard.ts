/**
 * DEMO MODE ISOLATION GUARD
 *
 * This module provides route-level and data-level safeguards for /demo-mode.
 *
 * /demo-mode is a PUBLIC interactive demo/conversion asset.
 * It must NEVER access production organizations, real clients, real documents,
 * or perform real transactions.
 *
 * All demo data is sourced exclusively from src/lib/demo/demoData.ts.
 *
 * BLOCKED in demo mode:
 * - Supabase queries against production tables
 * - Stripe checkout session creation
 * - Real email delivery
 * - File uploads containing real personal data
 * - Any mutation of production records
 * - Exposure of private dashboard URLs
 */

export const DEMO_MODE_PATH = '/demo-mode';

/**
 * Returns true if the current request is for the demo-mode route.
 * Used server-side to gate production data access.
 */
export function isDemoModePath(pathname: string): boolean {
  return pathname === DEMO_MODE_PATH || pathname.startsWith(`${DEMO_MODE_PATH}/`);
}

/**
 * Throws an error if called from demo-mode context.
 * Use this in API routes and server actions that must not serve demo traffic.
 *
 * @param context - A label for the caller (for logging)
 */
export function assertNotDemoMode(context: string, referer?: string): void {
  if (referer && isDemoModePath(new URL(referer, 'https://fixmy.money').pathname)) {
    throw new DemoModeViolationError(
      `[DemoGuard] ${context} must not be called from demo-mode. ` +
      `Demo mode uses only synthetic data from demoData.ts.`
    );
  }
}

export class DemoModeViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoModeViolationError';
  }
}

/**
 * Safe demo-mode response for blocked API actions.
 * Returns a standardized JSON response indicating the action is disabled in demo mode.
 */
export function demoModeBlockedResponse(action: string): Response {
  return new Response(
    JSON.stringify({
      error: 'demo_mode_blocked',
      message: `${action} is disabled in demo mode. Start a $1 trial to use this feature with real data.`,
      demoMode: true,
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Validates that a demo-mode action does not reference production data.
 * Checks that IDs match the demo fixture prefix.
 */
export function assertDemoId(id: string, field: string): void {
  if (!id.startsWith('demo-')) {
    throw new DemoModeViolationError(
      `[DemoGuard] ${field} "${id}" does not appear to be a demo fixture ID. ` +
      `Demo mode may only access records with IDs prefixed "demo-".`
    );
  }
}

/**
 * List of production API routes that must reject demo-mode requests.
 * These routes perform real Stripe, email, or database operations.
 */
export const DEMO_BLOCKED_API_ROUTES = [
  '/api/stripe/create-checkout',
  '/api/stripe/billing-portal',
  '/api/stripe/restore-purchase',
  '/api/ai/chat-completion',
  '/api/credit-report/analyze',
] as const;
