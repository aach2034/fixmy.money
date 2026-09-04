#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.TEST_USER_EMAIL || 'fmm-e2e-owner@test.invalid';
const password = process.env.TEST_USER_PASSWORD || 'FmmE2E_2026_LocalOnly!';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Local Supabase URL and service-role key are required.');
}

const parsedUrl = new URL(supabaseUrl);
if (
  parsedUrl.protocol !== 'http:'
  || !['127.0.0.1', 'localhost'].includes(parsedUrl.hostname)
  || !email.endsWith('@test.invalid')
) {
  throw new Error('Refusing to seed E2E identity outside an isolated local Supabase stack.');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedLocalE2eUser() {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  if (listError) throw listError;

  const existing = listed.users.find((user) => user.email === email);
  const authResult = existing
    ? await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'FMM Isolated E2E Owner',
        company_name: 'FMM Isolated E2E Workspace',
      },
    })
    : await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'FMM Isolated E2E Owner',
        company_name: 'FMM Isolated E2E Workspace',
      },
    });

  if (authResult.error || !authResult.data.user) {
    throw authResult.error || new Error('Local E2E user was not created.');
  }

  const userId = authResult.data.user.id;
  const { data: workspace, error: workspaceError } = await admin
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .single();
  if (workspaceError || !workspace) {
    throw workspaceError || new Error('Local E2E workspace was not created.');
  }

  const { error: profileError } = await admin
    .from('user_profiles')
    .update({
      onboarding_completed: true,
      onboarding_company_completed: true,
    })
    .eq('id', userId);
  if (profileError) throw profileError;

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { error: entitlementError } = await admin
    .from('workspace_entitlements')
    .update({
      stripe_status: 'trialing',
      access_state: 'trial',
      plan_id: 'professional',
      trial_ends_at: trialEnd.toISOString(),
      current_period_ends_at: null,
      grace_ends_at: null,
      last_verified_at: now.toISOString(),
      last_reconciliation_error: null,
    })
    .eq('workspace_id', workspace.id);
  if (entitlementError) throw entitlementError;

  console.log('Seeded one isolated local authenticated E2E identity.');
}

await seedLocalE2eUser();
