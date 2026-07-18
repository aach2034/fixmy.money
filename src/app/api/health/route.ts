import { NextResponse } from 'next/server';
import { getEnvHealth, validateRequiredEnvVars } from '@/lib/supabase/admin';
import { isPartixDatabase, getConnectedProjectRef } from '@/lib/supabase/partix-guard';

export async function GET() {
  const envHealth = getEnvHealth();
  const { valid, missing } = validateRequiredEnvVars();

  // Detect Partix database misconfiguration
  const partixMisconfigured = isPartixDatabase();
  const connectedRef = getConnectedProjectRef();

  return NextResponse?.json({
    status: partixMisconfigured ? 'misconfigured' : valid ? 'healthy' : 'degraded',
    environment: envHealth,
    missing_required: missing,
    partix_guard: {
      triggered: partixMisconfigured,
      connected_project_ref: connectedRef,
      message: partixMisconfigured
        ? 'FixMy.Money is configured to use the Partix Supabase project. Update the FixMy.Money Supabase environment variables before continuing.'
        : 'OK',
    },
    timestamp: new Date()?.toISOString(),
  });
}
