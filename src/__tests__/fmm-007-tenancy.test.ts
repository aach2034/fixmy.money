import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  authorizeStaffClient,
  sameAuthorizedClient,
} from '@/lib/workspaces/authorization';

type FixtureMap = Record<string, { data: unknown; error?: unknown }>;

function fakeAdmin(fixtures: FixtureMap): SupabaseClient {
  return {
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({
          data: fixtures[table]?.data ?? null,
          error: fixtures[table]?.error ?? null,
        }),
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

const baseFixtures: FixtureMap = {
  staff_clients: {
    data: { id: 'client-a', workspace_id: 'workspace-a', owner_id: 'owner-a' },
  },
  workspaces: {
    data: { id: 'workspace-a', owner_id: 'owner-a', is_active: true },
  },
  workspace_memberships: {
    data: { role: 'specialist', status: 'active', is_selected: true },
  },
};

describe('FMM-007 service-role authorization boundary', () => {
  it('authorizes an active writer only in the selected workspace', async () => {
    const result = await authorizeStaffClient(
      fakeAdmin(baseFixtures),
      'staff-a',
      'client-a',
      'write'
    );

    expect(result).toEqual({
      clientId: 'client-a',
      workspaceId: 'workspace-a',
      workspaceOwnerId: 'owner-a',
      actorUserId: 'staff-a',
      role: 'specialist',
    });
  });

  it('does not grant write access to a viewer', async () => {
    const result = await authorizeStaffClient(
      fakeAdmin({
        ...baseFixtures,
        workspace_memberships: {
          data: { role: 'viewer', status: 'active', is_selected: true },
        },
      }),
      'viewer-a',
      'client-a',
      'write'
    );

    expect(result).toBeNull();
  });

  it('fails closed when the membership is not selected', async () => {
    const result = await authorizeStaffClient(
      fakeAdmin({
        ...baseFixtures,
        workspace_memberships: {
          data: { role: 'admin', status: 'active', is_selected: false },
        },
      }),
      'admin-a',
      'client-a',
      'read'
    );

    expect(result).toBeNull();
  });

  it('fails closed when a client owner and workspace owner disagree', async () => {
    const result = await authorizeStaffClient(
      fakeAdmin({
        ...baseFixtures,
        workspaces: {
          data: { id: 'workspace-a', owner_id: 'different-owner', is_active: true },
        },
      }),
      'staff-a',
      'client-a',
      'read'
    );

    expect(result).toBeNull();
  });

  it('requires both the client and owner to match a previously authorized pair', () => {
    const authorization = {
      clientId: 'client-a',
      workspaceId: 'workspace-a',
      workspaceOwnerId: 'owner-a',
      actorUserId: 'staff-a',
      role: 'specialist' as const,
    };

    expect(sameAuthorizedClient({ client_id: 'client-a', owner_id: 'owner-a' }, authorization)).toBe(true);
    expect(sameAuthorizedClient({ client_id: 'client-b', owner_id: 'owner-a' }, authorization)).toBe(false);
    expect(sameAuthorizedClient({ client_id: 'client-a', owner_id: 'owner-b' }, authorization)).toBe(false);
  });
});

describe('FMM-007 source invariants', () => {
  it('client portal resolves identities and records by immutable relationship IDs', () => {
    const dashboard = readFileSync(
      'src/app/client-portal/components/ClientPortalDashboardContent.tsx',
      'utf8'
    );
    expect(dashboard).toContain(".eq('auth_user_id', user.id)");
    expect(dashboard).toContain(".rpc('available_portal_relationships')");
    expect(dashboard).toContain(".eq('workspace_client_id', selectedRelationship.id)");
    expect(dashboard).not.toContain(".eq('email', user.email)");
  });

  it('creates client invitations only after centralized workspace authorization', () => {
    const route = readFileSync(
      'src/app/api/workspaces/client-invitations/route.ts',
      'utf8'
    );
    expect(route).toContain("authorizeStaffClient(admin, user.id, clientId, 'write')");
    expect(route).toContain(".eq('workspace_id', authorization.workspaceId)");
    expect(route).toContain('normalizeEmail(client.email) !== requestedEmail');
    expect(route).toContain("randomBytes(32).toString('base64url')");
    expect(route).not.toContain('token_hash: invitationToken');
  });

  it('keeps raw OCR caching retired and workspace selectors bound to the tenant model', () => {
    const importer = readFileSync(
      'src/app/credit-report-import/components/CreditReportImportContent.tsx',
      'utf8'
    );
    const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
    const migration = readFileSync(
      'supabase/migrations/20260903024321_fmm_007_tenant_constraints_and_policies.sql',
      'utf8'
    );
    expect(importer).not.toContain('createOcrCachePath');
    expect(importer).not.toContain('OCR_STORAGE_BUCKET');
    expect(sidebar).toContain(".rpc('available_workspace_contexts')");
    expect(migration).toContain('private.can_write_owner(private.safe_uuid((storage.foldername(name))[1]))');
  });

  it('every service-role credit-report route uses centralized client authorization', () => {
    const routes = [
      'import-upload',
      'parse-report',
      'tag-and-save',
      'evidence-engine',
    ];

    for (const route of routes) {
      const source = readFileSync(`src/app/api/credit-report/${route}/route.ts`, 'utf8');
      expect(source, route).toContain('authorizeStaffClient');
    }
  });
});
