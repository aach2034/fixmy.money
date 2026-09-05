import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTransactionalEmail } from '@/lib/email/emailService';
import { authorizeStaffClient } from '@/lib/workspaces/authorization';

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    clientId?: string;
    email?: string;
    clientName?: string;
    assignedStaff?: string;
    clientPlan?: string;
  } | null;
  const clientId = body?.clientId || '';
  const requestedEmail = normalizeEmail(body?.email);
  if (!clientId || !requestedEmail) {
    return NextResponse.json({ error: 'Client and email are required' }, { status: 400 });
  }

  const authorization = await authorizeStaffClient(admin, user.id, clientId, 'write');
  if (!authorization) {
    return NextResponse.json({ error: 'Client not found or access denied' }, { status: 403 });
  }

  const [{ data: client }, { data: relationship }] = await Promise.all([
    admin
      .from('staff_clients')
      .select('id, email')
      .eq('id', authorization.clientId)
      .eq('workspace_id', authorization.workspaceId)
      .eq('owner_id', authorization.workspaceOwnerId)
      .maybeSingle(),
    admin
      .from('workspace_client_memberships')
      .select('id')
      .eq('workspace_id', authorization.workspaceId)
      .eq('staff_client_id', authorization.clientId)
      .maybeSingle(),
  ]);

  if (!client || normalizeEmail(client.email) !== requestedEmail || !relationship) {
    return NextResponse.json({ error: 'Invitation must match the authorized client dossier' }, { status: 400 });
  }

  const invitationToken = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(invitationToken).digest('hex');
  const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString();

  const { error: revokeError } = await admin
    .from('workspace_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('workspace_id', authorization.workspaceId)
    .eq('staff_client_id', authorization.clientId)
    .eq('invitation_type', 'client_portal')
    .is('accepted_at', null)
    .is('revoked_at', null);
  if (revokeError) {
    return NextResponse.json({ error: 'Could not rotate the prior invitation' }, { status: 500 });
  }

  const { error: invitationError } = await admin.from('workspace_invitations').insert({
    workspace_id: authorization.workspaceId,
    invitation_type: 'client_portal',
    intended_email: requestedEmail,
    token_hash: tokenHash,
    staff_client_id: authorization.clientId,
    created_by: user.id,
    expires_at: expiresAt,
  });
  if (invitationError) {
    return NextResponse.json({ error: 'Could not create the client invitation' }, { status: 500 });
  }

  const emailSent = await sendTransactionalEmail({
    type: 'client_notification',
    to: requestedEmail,
    clientEmail: requestedEmail,
    clientName: body?.clientName,
    assignedStaff: body?.assignedStaff,
    clientPlan: body?.clientPlan,
    portalInviteToken: invitationToken,
  });

  return NextResponse.json({
    success: true,
    emailSent,
    expiresAt,
    invitationUrl: `/client-portal/login?invite=${encodeURIComponent(invitationToken)}`,
  });
}
