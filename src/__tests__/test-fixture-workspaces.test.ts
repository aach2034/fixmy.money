import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { findAutomaticallyCreatedOwnerWorkspace } from '../../scripts/test-fixture-workspaces';

type WorkspaceRow = { id: string; owner_id: string };

function workspaceClient(rows: WorkspaceRow[], errorMessage?: string) {
  const eq = vi.fn().mockResolvedValue({
    data: rows,
    error: errorMessage ? { message: errorMessage } : null,
  });
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    select,
    eq,
  };
}

describe('test fixture owner workspace resolution', () => {
  it('finds and reuses the workspace automatically created for the owner', async () => {
    const fixture = workspaceClient([{ id: 'workspace-a', owner_id: 'owner-a' }]);

    await expect(
      findAutomaticallyCreatedOwnerWorkspace(fixture.client, 'owner-a', 'Workspace A'),
    ).resolves.toEqual({ id: 'workspace-a', owner_id: 'owner-a' });
    expect(fixture.from).toHaveBeenCalledWith('workspaces');
    expect(fixture.select).toHaveBeenCalledWith('id, owner_id');
    expect(fixture.eq).toHaveBeenCalledWith('owner_id', 'owner-a');
  });

  it('returns the same existing workspace on repeated deterministic lookups', async () => {
    const fixture = workspaceClient([{ id: 'workspace-a', owner_id: 'owner-a' }]);

    const first = await findAutomaticallyCreatedOwnerWorkspace(
      fixture.client,
      'owner-a',
      'Workspace A',
    );
    const second = await findAutomaticallyCreatedOwnerWorkspace(
      fixture.client,
      'owner-a',
      'Workspace A',
    );

    expect(second).toEqual(first);
    expect(fixture.eq).toHaveBeenCalledTimes(2);
  });

  it('cannot select a workspace belonging to another owner', async () => {
    const fixture = workspaceClient([
      { id: 'workspace-b', owner_id: 'owner-b' },
      { id: 'workspace-a', owner_id: 'owner-a' },
    ]);

    await expect(
      findAutomaticallyCreatedOwnerWorkspace(fixture.client, 'owner-a', 'Workspace A'),
    ).resolves.toEqual({ id: 'workspace-a', owner_id: 'owner-a' });
  });

  it('fails clearly when the expected owner workspace is absent', async () => {
    const fixture = workspaceClient([{ id: 'workspace-b', owner_id: 'owner-b' }]);

    await expect(
      findAutomaticallyCreatedOwnerWorkspace(fixture.client, 'owner-a', 'Workspace A'),
    ).rejects.toThrow(
      'Expected exactly one automatically created workspace for Workspace A; found 0 for owner owner-a.',
    );
  });

  it('fails clearly when the owner workspace is ambiguous', async () => {
    const fixture = workspaceClient([
      { id: 'workspace-a-1', owner_id: 'owner-a' },
      { id: 'workspace-a-2', owner_id: 'owner-a' },
    ]);

    await expect(
      findAutomaticallyCreatedOwnerWorkspace(fixture.client, 'owner-a', 'Workspace A'),
    ).rejects.toThrow(
      'Expected exactly one automatically created workspace for Workspace A; found 2 for owner owner-a.',
    );
  });

  it('fails clearly when the owner-scoped database lookup fails', async () => {
    const fixture = workspaceClient([], 'local database unavailable');

    await expect(
      findAutomaticallyCreatedOwnerWorkspace(fixture.client, 'owner-a', 'Workspace A'),
    ).rejects.toThrow(
      'Failed to find the automatically created workspace for Workspace A: local database unavailable',
    );
  });
});
