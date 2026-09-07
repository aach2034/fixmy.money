import type { SupabaseClient } from '@supabase/supabase-js';

type OwnerWorkspace = {
  id: string;
  owner_id: string;
};

export async function findAutomaticallyCreatedOwnerWorkspace(
  adminClient: SupabaseClient,
  ownerId: string,
  fixtureLabel: string,
): Promise<OwnerWorkspace> {
  const { data, error } = await adminClient
    .from('workspaces')
    .select('id, owner_id')
    .eq('owner_id', ownerId);

  if (error) {
    throw new Error(
      `Failed to find the automatically created workspace for ${fixtureLabel}: ${error.message}`,
    );
  }

  const ownedWorkspaces = (data ?? []).filter(
    (workspace): workspace is OwnerWorkspace => workspace.owner_id === ownerId,
  );

  if (ownedWorkspaces.length !== 1) {
    throw new Error(
      `Expected exactly one automatically created workspace for ${fixtureLabel}; ` +
        `found ${ownedWorkspaces.length} for owner ${ownerId}.`,
    );
  }

  return ownedWorkspaces[0];
}
