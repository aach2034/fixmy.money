import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getSelectedWorkspaceContext } from '@/lib/subscription/server';
import { authorizeWorkspacePlanOperation } from '@/lib/subscription/planServer';
import { PlanAuthorizationError } from '@/lib/subscription/planEnforcement';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const workspace = await getSelectedWorkspaceContext(supabase);
  if (!workspace) return NextResponse.json({ error: 'Workspace required' }, { status: 403 });

  const { data, error: clientsError } = await getAdminClient()
    .from('staff_clients')
    .select('id, name')
    .eq('workspace_id', workspace.workspace_id)
    .eq('owner_id', workspace.workspace_owner_id)
    .order('name');
  if (clientsError) return NextResponse.json({ error: 'Clients could not be loaded' }, { status: 500 });

  return NextResponse.json({
    workspaceId: workspace.workspace_id,
    clients: data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const workspace = await getSelectedWorkspaceContext(supabase);
  if (!workspace) return NextResponse.json({ error: 'Workspace required' }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!firstName || !lastName || !email || email.length > 320) {
    return NextResponse.json({ error: 'Valid client name and email are required' }, { status: 400 });
  }
  try {
    await authorizeWorkspacePlanOperation({ workspaceId: workspace.workspace_id, feature: 'core_crm', limit: 'clients' });
  } catch (authError) {
    if (authError instanceof PlanAuthorizationError) {
      return NextResponse.json({ error: authError.code }, { status: authError.status });
    }
    throw authError;
  }
  const { data, error: insertError } = await getAdminClient().from('staff_clients').insert({
    owner_id: workspace.workspace_owner_id,
    workspace_id: workspace.workspace_id,
    name: `${firstName} ${lastName}`,
    email,
    phone: typeof body?.phone === 'string' ? body.phone.trim() : '',
    plan: typeof body?.plan === 'string' ? body.plan : 'Growth',
    assigned_staff: typeof body?.assignedStaff === 'string' ? body.assignedStaff : '',
    bureaus: Array.isArray(body?.bureaus) ? body.bureaus.filter(value => ['EQ', 'EX', 'TU'].includes(String(value))) : [],
    case_stage: 'lead', subscription_status: 'pending', last_activity: 'Just added', report_analyzed: false,
  }).select('id').single();
  if (insertError) return NextResponse.json({ error: 'Client could not be created' }, { status: 409 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
