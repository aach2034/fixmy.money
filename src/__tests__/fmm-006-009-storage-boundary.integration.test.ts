import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const BUCKET = 'client-documents';
const ORIGINAL_BYTES = new TextEncoder().encode(
  '%PDF-1.7\nFMM storage boundary original\n',
);
const REPLACEMENT_BYTES = new TextEncoder().encode(
  '%PDF-1.7\nFMM storage boundary replacement\n',
);
const ATTEMPTED_BYTES = new TextEncoder().encode(
  '%PDF-1.7\nFMM storage boundary attempted upload\n',
);

type TestConfig = {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  ownerEmail: string;
  ownerPassword: string;
  workspaceId: string;
};

type EntitlementSnapshot = {
  stripe_status: string;
  access_state: string;
  plan_id: string | null;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  grace_ends_at: string | null;
  last_verified_at: string | null;
};

function readTestConfig(): TestConfig {
  const required = {
    supabaseUrl: process.env.TEST_SUPABASE_URL,
    anonKey: process.env.TEST_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY,
    ownerEmail: process.env.TEST_OWNER_A_EMAIL,
    ownerPassword: process.env.TEST_OWNER_A_PASSWORD,
    workspaceId: process.env.TEST_WORKSPACE_A_ID,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required local integration test config: ${missing.join(', ')}`);
  }

  const supabaseUrl = new URL(required.supabaseUrl!);
  if (
    supabaseUrl.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost'].includes(supabaseUrl.hostname)
  ) {
    throw new Error('Storage boundary integration tests may run only against local Supabase.');
  }

  if (!required.ownerEmail!.endsWith('@test.invalid')) {
    throw new Error('Storage boundary integration tests require a seeded test.invalid identity.');
  }

  return {
    supabaseUrl: required.supabaseUrl!,
    anonKey: required.anonKey!,
    serviceRoleKey: required.serviceRoleKey!,
    ownerEmail: required.ownerEmail!,
    ownerPassword: required.ownerPassword!,
    workspaceId: required.workspaceId!,
  };
}

describe('FMM-006/FMM-009 authenticated Storage boundary', () => {
  let config: TestConfig;
  let admin: SupabaseClient;
  let authenticated: SupabaseClient;
  let relationshipId = '';
  let originalPath = '';
  let attemptedPath = '';
  let createdRelationshipId = '';
  let createdStaffClientId = '';
  let consumerId = '';
  let entitlementSnapshot: EntitlementSnapshot | null = null;

  async function expectAdminObjectBytes(path: string, expected: Uint8Array) {
    const { data, error } = await admin.storage.from(BUCKET).download(path);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(new Uint8Array(await data!.arrayBuffer())).toEqual(expected);
  }

  beforeAll(async () => {
    config = readTestConfig();
    admin = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    authenticated = createClient(config.supabaseUrl, config.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signInData, error: signInError } = await authenticated.auth.signInWithPassword({
      email: config.ownerEmail,
      password: config.ownerPassword,
    });
    expect(signInError).toBeNull();
    expect(signInData.user).not.toBeNull();
    consumerId = signInData.user!.id;

    const { data: relationships, error: relationshipError } = await admin
      .from('workspace_client_memberships')
      .select('id')
      .eq('workspace_id', config.workspaceId)
      .eq('status', 'active')
      .limit(1);

    expect(relationshipError).toBeNull();
    relationshipId = relationships?.[0]?.id ?? '';

    // A clean local replay has no client relationship. Create one disposable
    // relationship that the superseded browser policy would have authorized,
    // then restore the entitlement and remove it after the test.
    if (!relationshipId) {
      const { data: entitlement, error: entitlementError } = await admin
        .from('workspace_entitlements')
        .select('stripe_status, access_state, plan_id, trial_ends_at, current_period_ends_at, grace_ends_at, last_verified_at')
        .eq('workspace_id', config.workspaceId)
        .single();
      expect(entitlementError).toBeNull();
      entitlementSnapshot = entitlement as EntitlementSnapshot;

      const { error: activateError } = await admin
        .from('workspace_entitlements')
        .update({
          stripe_status: 'active',
          access_state: 'active',
          plan_id: 'starter',
          trial_ends_at: null,
          current_period_ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          grace_ends_at: null,
          last_verified_at: new Date().toISOString(),
        })
        .eq('workspace_id', config.workspaceId);
      expect(activateError).toBeNull();

      createdStaffClientId = crypto.randomUUID();
      const { error: clientError } = await admin.from('staff_clients').insert({
        id: createdStaffClientId,
        owner_id: signInData.user!.id,
        workspace_id: config.workspaceId,
        name: 'FMM storage boundary fixture',
        email: `fmm-storage-${createdStaffClientId}@test.invalid`,
      });
      expect(clientError).toBeNull();

      const { data: createdRelationship, error: createRelationshipError } = await admin
        .from('workspace_client_memberships')
        .select('id')
        .eq('workspace_id', config.workspaceId)
        .eq('staff_client_id', createdStaffClientId)
        .eq('status', 'active')
        .single();
      expect(createRelationshipError).toBeNull();
      expect(createdRelationship).not.toBeNull();
      createdRelationshipId = createdRelationship!.id;
      relationshipId = createdRelationshipId;
    }

    expect(relationshipId).not.toBe('');
  });

  beforeEach(async () => {
    const originalUploadId = crypto.randomUUID();
    const attemptedUploadId = crypto.randomUUID();
    originalPath = `${config.workspaceId}/${relationshipId}/${originalUploadId}/original.pdf`;
    attemptedPath = `${config.workspaceId}/${relationshipId}/${attemptedUploadId}/attempted.pdf`;

    const { error } = await admin.storage.from(BUCKET).upload(originalPath, ORIGINAL_BYTES, {
      cacheControl: '0',
      contentType: 'application/pdf',
      upsert: false,
    });
    expect(error).toBeNull();
  });

  afterEach(async () => {
    const { error } = await admin.storage.from(BUCKET).remove([originalPath, attemptedPath]);
    expect(error).toBeNull();
  });

  afterAll(async () => {
    await authenticated?.auth.signOut();
    if (createdRelationshipId) {
      const { error } = await admin
        .from('workspace_client_memberships')
        .delete()
        .eq('id', createdRelationshipId);
      expect(error).toBeNull();
    }
    if (createdStaffClientId) {
      const { error } = await admin.from('staff_clients').delete().eq('id', createdStaffClientId);
      expect(error).toBeNull();
    }
    if (entitlementSnapshot) {
      const { error } = await admin
        .from('workspace_entitlements')
        .update(entitlementSnapshot)
        .eq('workspace_id', config.workspaceId);
      expect(error).toBeNull();
    }
  });

  it('denies authenticated Storage SELECT/download while service role can read the object', async () => {
    const { data, error } = await authenticated.storage.from(BUCKET).download(originalPath);

    expect(error).toBeTruthy();
    expect(data).toBeNull();
    await expectAdminObjectBytes(originalPath, ORIGINAL_BYTES);
  });

  it('denies authenticated Storage INSERT/upload and leaves no new object', async () => {
    const { error } = await authenticated.storage
      .from(BUCKET)
      .upload(attemptedPath, ATTEMPTED_BYTES, {
        cacheControl: '0',
        contentType: 'application/pdf',
        upsert: false,
      });

    expect(error).toBeTruthy();

    const { data: attemptedObject, error: downloadError } = await admin.storage
      .from(BUCKET)
      .download(attemptedPath);
    expect(downloadError).toBeTruthy();
    expect(attemptedObject).toBeNull();
    await expectAdminObjectBytes(originalPath, ORIGINAL_BYTES);
  });

  it('denies authenticated Storage UPDATE/replace and preserves the original object', async () => {
    const { error } = await authenticated.storage
      .from(BUCKET)
      .update(originalPath, REPLACEMENT_BYTES, {
        cacheControl: '0',
        contentType: 'application/pdf',
      });

    expect(error).toBeTruthy();
    await expectAdminObjectBytes(originalPath, ORIGINAL_BYTES);
  });

  it('denies authenticated Storage DELETE/remove and preserves the original object', async () => {
    const { data, error } = await authenticated.storage.from(BUCKET).remove([originalPath]);

    // Storage DELETE returns an empty successful response when RLS filters all
    // target rows. Requiring zero deleted rows plus the unchanged object proves
    // the operation failed closed without depending on transport error style.
    expect(error).toBeNull();
    expect(data).toEqual([]);
    await expectAdminObjectBytes(originalPath, ORIGINAL_BYTES);
  });

  it('denies direct Personal packet reads, signing, uploads, and deletes even to the owner', async () => {
    const packetBucket = 'personal-review-packets';
    const path = `${consumerId}/${crypto.randomUUID()}/packet.txt`;
    const attemptedPath = `${consumerId}/${crypto.randomUUID()}/attempted.txt`;
    const bytes = new TextEncoder().encode('Synthetic review packet only');
    const { error: seedError } = await admin.storage.from(packetBucket).upload(path, bytes, {
      contentType: 'text/plain', upsert: false,
    });
    expect(seedError).toBeNull();
    try {
      const anonymous = createClient(config.supabaseUrl, config.anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      for (const client of [anonymous, authenticated]) {
        const { data: downloaded, error: readError } = await client.storage.from(packetBucket).download(path);
        expect(readError).toBeTruthy();
        expect(downloaded).toBeNull();
        const { data: signed, error: signError } = await client.storage.from(packetBucket).createSignedUrl(path, 60);
        expect(signError).toBeTruthy();
        expect(signed).toBeNull();
        const { error: uploadError } = await client.storage.from(packetBucket).upload(attemptedPath, bytes, {
          contentType: 'text/plain', upsert: false,
        });
        expect(uploadError).toBeTruthy();
        await client.storage.from(packetBucket).remove([path]);
      }
      const { data: preserved, error: preservedError } = await admin.storage.from(packetBucket).download(path);
      expect(preservedError).toBeNull();
      expect(new Uint8Array(await preserved!.arrayBuffer())).toEqual(bytes);
    } finally {
      const { error } = await admin.storage.from(packetBucket).remove([path, attemptedPath]);
      expect(error).toBeNull();
    }
  });
});
