/**
 * AI Usage Tracking API
 *
 * Records AI feature usage to ai_usage_events table.
 * Enforces server-side plan limits.
 * Never stores full prompts or credit report contents.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

// Plan limits for AI features (units per month)
const PLAN_AI_LIMITS: Record<string, number> = {
  starter: 25,
  professional: 100,
  agency: 500,
  enterprise: 9999,
  trial_active: 10,
  free: 5,
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { feature, model, units = 1, workspaceId } = body;

    if (!feature || !model || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields: feature, model, workspaceId' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Verify workspace membership server-side — never trust browser-supplied workspace IDs alone
    const { data: workspace } = await adminClient
      .from('workspaces')
      .select('id, owner_id')
      .eq('id', workspaceId)
      .single();

    if (!workspace || workspace.owner_id !== user.id) {
      return NextResponse.json({ error: 'Workspace access denied' }, { status: 403 });
    }

    // Get user's subscription plan
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('subscription_plan, subscription_status')
      .eq('id', user.id)
      .single();

    const plan = profile?.subscription_plan || 'free';
    const planLimit = PLAN_AI_LIMITS[plan] ?? PLAN_AI_LIMITS.free;

    // Count usage this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: usedThisMonth } = await adminClient
      .from('ai_usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', startOfMonth.toISOString())
      .eq('status', 'completed');

    const currentUsage = usedThisMonth ?? 0;

    if (currentUsage + units > planLimit) {
      // Log rate-limited event
      await adminClient.from('ai_usage_events').insert({
        workspace_id: workspaceId,
        user_id: user.id,
        feature,
        model,
        units,
        status: 'rate_limited',
      });

      return NextResponse.json({
        error: 'AI usage limit reached for your current plan',
        limit: planLimit,
        used: currentUsage,
        plan,
      }, { status: 429 });
    }

    // Log successful usage event
    // NOTE: Full prompts and credit report contents are NEVER stored here
    await adminClient.from('ai_usage_events').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      feature,
      model,
      units,
      status: 'completed',
    });

    return NextResponse.json({
      success: true,
      used: currentUsage + units,
      limit: planLimit,
      remaining: planLimit - (currentUsage + units),
    });
  } catch (error) {
    console.error('[AI Usage] Error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Usage tracking failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Verify workspace membership
    const { data: workspace } = await adminClient
      .from('workspaces')
      .select('id, owner_id')
      .eq('id', workspaceId)
      .single();

    if (!workspace || workspace.owner_id !== user.id) {
      return NextResponse.json({ error: 'Workspace access denied' }, { status: 403 });
    }

    // Get user's plan
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('subscription_plan')
      .eq('id', user.id)
      .single();

    const plan = profile?.subscription_plan || 'free';
    const planLimit = PLAN_AI_LIMITS[plan] ?? PLAN_AI_LIMITS.free;

    // Count usage this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: usedThisMonth } = await adminClient
      .from('ai_usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', startOfMonth.toISOString())
      .eq('status', 'completed');

    const currentUsage = usedThisMonth ?? 0;

    return NextResponse.json({
      used: currentUsage,
      limit: planLimit,
      remaining: Math.max(0, planLimit - currentUsage),
      plan,
    });
  } catch (error) {
    console.error('[AI Usage] GET Error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
