import type { SupabaseClient } from '@supabase/supabase-js';

export type WorkspaceRole = 'owner' | 'admin' | 'specialist' | 'viewer';
export type WorkspaceAccess = 'read' | 'write' | 'admin';

export interface AuthorizedStaffClient {
  clientId: string;
  workspaceId: string;
  workspaceOwnerId: string;
  actorUserId: string;
  role: WorkspaceRole;
}

const WRITE_ROLES = new Set<WorkspaceRole>(['owner', 'admin', 'specialist']);
const ADMIN_ROLES = new Set<WorkspaceRole>(['owner', 'admin']);

function roleAllows(role: WorkspaceRole, access: WorkspaceAccess): boolean {
  if (access === 'read') return true;
  if (access === 'write') return WRITE_ROLES.has(role);
  return ADMIN_ROLES.has(role);
}

/**
 * Authorizes a user-triggered operation before a service-role client touches
 * tenant data. The requested client ID is rebound to its immutable workspace,
 * then the actor's active membership and role are checked explicitly.
 */
export async function authorizeStaffClient(
  admin: SupabaseClient,
  actorUserId: string,
  clientId: string,
  access: WorkspaceAccess = 'write'
): Promise<AuthorizedStaffClient | null> {
  const { data: client, error: clientError } = await admin
    .from('staff_clients')
    .select('id, workspace_id, owner_id')
    .eq('id', clientId)
    .maybeSingle();

  if (clientError || !client?.workspace_id || !client.owner_id) return null;

  const [{ data: workspace, error: workspaceError }, { data: membership, error: membershipError }] =
    await Promise.all([
      admin
        .from('workspaces')
        .select('id, owner_id, is_active')
        .eq('id', client.workspace_id)
        .maybeSingle(),
      admin
        .from('workspace_memberships')
        .select('role, status, is_selected')
        .eq('workspace_id', client.workspace_id)
        .eq('user_id', actorUserId)
        .maybeSingle(),
    ]);

  if (
    workspaceError ||
    membershipError ||
    !workspace ||
    workspace.is_active !== true ||
    workspace.owner_id !== client.owner_id ||
    membership?.status !== 'active' ||
    membership.is_selected !== true
  ) {
    return null;
  }

  const role = membership.role as WorkspaceRole;
  if (!roleAllows(role, access)) return null;

  return {
    clientId: client.id,
    workspaceId: workspace.id,
    workspaceOwnerId: workspace.owner_id,
    actorUserId,
    role,
  };
}

export function sameAuthorizedClient(
  record: { client_id?: string | null; owner_id?: string | null },
  authorization: AuthorizedStaffClient
): boolean {
  return (
    record.client_id === authorization.clientId &&
    record.owner_id === authorization.workspaceOwnerId
  );
}
