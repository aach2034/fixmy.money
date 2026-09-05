import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getSelectedWorkspaceContext } from '@/lib/subscription/server';
import { evaluateOnboardingWorkflow, serverConnectPolicy } from '@/lib/onboarding/workflow';

async function authoritativeStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };

  const workspaceContext = await getSelectedWorkspaceContext(supabase);
  if (!workspaceContext) {
    return { response: NextResponse.json({ error: 'No active workspace is selected.' }, { status: 403 }) };
  }

  const [profileResult, workspaceResult] = await Promise.all([
    supabase.from('user_profiles').select('full_name,company_name,onboarding_completed,onboarding_company_completed').eq('id', user.id).single(),
    supabase.from('workspaces').select('name').eq('id', workspaceContext.workspace_id).single(),
  ]);
  if (profileResult.error || workspaceResult.error || !profileResult.data || !workspaceResult.data) {
    return { response: NextResponse.json({ error: 'Onboarding status could not be verified.' }, { status: 503 }) };
  }

  const connect = serverConnectPolicy();
  const status = evaluateOnboardingWorkflow({
    profileExists: true,
    onboardingCompleted: Boolean(profileResult.data.onboarding_completed),
    companyRecorded: Boolean(profileResult.data.onboarding_company_completed),
    companyName: workspaceResult.data.name || profileResult.data.company_name,
    ownerName: profileResult.data.full_name,
    connectRequired: connect.required,
    connectStatus: connect.status,
  });
  return { userId: user.id, status };
}

function requiredString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
}

function optionalString(value: unknown, max: number): string | null | undefined {
  if (value === undefined || value === null || value === '') return null;
  return requiredString(value, max) ?? undefined;
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const workspace = await getSelectedWorkspaceContext(supabase);
    if (!workspace || workspace.workspace_owner_id !== user.id || workspace.member_role !== 'owner') {
      return NextResponse.json({ error: 'Workspace-owner access required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const companyName = requiredString(body?.companyName, 160);
    const ownerName = requiredString(body?.ownerName, 160);
    const businessType = requiredString(body?.businessType, 64);
    const phone = optionalString(body?.phone, 40);
    const website = optionalString(body?.website, 300);
    const address = optionalString(body?.address, 300);
    const city = optionalString(body?.city, 120);
    const state = optionalString(body?.state, 2);
    const zip = optionalString(body?.zip, 20);
    if (!companyName || !ownerName || !businessType || [phone, website, address, city, state, zip].includes(undefined)) {
      return NextResponse.json({ error: 'Invalid company setup.' }, { status: 400 });
    }

    const slug = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'business'}-${user.id.slice(0, 8)}`;
    const { error } = await getAdminClient().rpc('save_onboarding_company_server', {
      p_user_id: user.id,
      p_workspace_id: workspace.workspace_id,
      p_company_name: companyName,
      p_owner_name: ownerName,
      p_slug: slug,
      p_phone: phone,
      p_website: website,
      p_address: address,
      p_city: city,
      p_state: state,
      p_zip: zip,
      p_business_type: businessType,
    });
    if (error) throw error;
    return NextResponse.json({ saved: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[Onboarding] Company save failed:', error);
    return NextResponse.json({ error: 'Company setup could not be saved.' }, { status: 503 });
  }
}

export async function GET() {
  try {
    const result = await authoritativeStatus();
    if (result.response) return result.response;
    return NextResponse.json(result.status, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[Onboarding] Authoritative status failed:', error);
    return NextResponse.json({ error: 'Onboarding status could not be verified.' }, { status: 503 });
  }
}

export async function POST() {
  try {
    const result = await authoritativeStatus();
    if (result.response) return result.response;
    if (!result.status?.canComplete || !result.userId) {
      return NextResponse.json(
        { error: 'Required onboarding steps are incomplete.', status: result.status },
        { status: 409, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const { data, error } = await getAdminClient()
      .from('user_profiles')
      .update({ onboarding_completed: true })
      .eq('id', result.userId)
      .select('onboarding_completed')
      .single();
    if (error || !data?.onboarding_completed) throw error || new Error('ONBOARDING_WRITE_NOT_DURABLE');

    return NextResponse.json({ ...result.status, state: 'completed', nextStep: 'done' }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[Onboarding] Completion failed:', error);
    return NextResponse.json({ error: 'Onboarding could not be completed.' }, { status: 503 });
  }
}
