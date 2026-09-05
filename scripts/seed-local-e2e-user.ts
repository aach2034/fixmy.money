#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.TEST_USER_EMAIL || 'fmm-e2e-owner@test.invalid';
const password = process.env.TEST_USER_PASSWORD || 'FmmE2E_2026_LocalOnly!';
const memberEmail = process.env.TEST_MEMBER_EMAIL || 'fmm-e2e-member@test.invalid';
const memberPassword = process.env.TEST_MEMBER_PASSWORD || 'FmmE2E_Member_2026_LocalOnly!';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Local Supabase URL and service-role key are required.');
}

const parsedUrl = new URL(supabaseUrl);
if (
  parsedUrl.protocol !== 'http:'
  || !['127.0.0.1', 'localhost'].includes(parsedUrl.hostname)
  || !email.endsWith('@test.invalid')
  || !memberEmail.endsWith('@test.invalid')
) {
  throw new Error('Refusing to seed E2E identity outside an isolated local Supabase stack.');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertLocalUser(
  targetEmail: string,
  targetPassword: string,
  fullName: string,
  companyName: string,
) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  if (listError) throw listError;

  const existing = listed.users.find((user) => user.email === targetEmail);
  const authResult = existing
    ? await admin.auth.admin.updateUserById(existing.id, {
      password: targetPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        company_name: companyName,
      },
    })
    : await admin.auth.admin.createUser({
      email: targetEmail,
      password: targetPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        company_name: companyName,
      },
    });

  if (authResult.error || !authResult.data.user) {
    throw authResult.error || new Error('Local E2E user was not created.');
  }

  return authResult.data.user.id;
}

async function seedLocalE2eUsers() {
  const userId = await upsertLocalUser(
    email,
    password,
    'FMM Isolated E2E Owner',
    'FMM Isolated E2E Workspace',
  );
  const memberId = await upsertLocalUser(
    memberEmail,
    memberPassword,
    'FMM Isolated E2E Member',
    'FMM Isolated E2E Member Workspace',
  );

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

  const { error: memberProfileError } = await admin
    .from('user_profiles')
    .update({
      onboarding_completed: true,
      onboarding_company_completed: true,
    })
    .eq('id', memberId);
  if (memberProfileError) throw memberProfileError;

  // Keep both identities unpaid. A locally fabricated trial without a real
  // Stripe customer is intentionally rejected by FMM-009's fail-closed gate.
  // Authenticated E2E coverage uses the billing route, which is available to
  // signed-in workspace members without granting paid application access.
  console.log('Seeded two isolated local authenticated E2E identities.');
}

await seedLocalE2eUsers();
