-- FMM-004 contract step: retire the final legacy read path after the
-- workspace_entitlements table is populated, reconciled, and the application
-- code that consumes it is deployed.
--
-- Deployment order is intentionally expand -> reconcile -> application ->
-- this cutover. Applying this file before that sequence is not authorized.

CREATE OR REPLACE FUNCTION public.current_workspace_context()
RETURNS TABLE (
  workspace_id uuid,
  workspace_name text,
  workspace_owner_id uuid,
  member_role public.workspace_member_role,
  onboarding_completed boolean,
  subscription_status text,
  subscription_plan text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT workspace.id,
         workspace.name,
         workspace.owner_id,
         membership.role,
         COALESCE(owner_profile.onboarding_completed, false),
         CASE
           WHEN entitlement.access_state = 'active'
             AND entitlement.stripe_status = 'active'
             AND entitlement.last_verified_at > CURRENT_TIMESTAMP - interval '1 hour'
             AND entitlement.last_verified_at <= CURRENT_TIMESTAMP + interval '5 minutes'
             AND entitlement.current_period_ends_at > CURRENT_TIMESTAMP
           THEN 'active'
           WHEN entitlement.access_state = 'trial'
             AND entitlement.stripe_status = 'trialing'
             AND entitlement.last_verified_at > CURRENT_TIMESTAMP - interval '1 hour'
             AND entitlement.last_verified_at <= CURRENT_TIMESTAMP + interval '5 minutes'
             AND entitlement.trial_ends_at > CURRENT_TIMESTAMP
           THEN 'trialing'
           WHEN entitlement.access_state = 'grace'
             AND entitlement.stripe_status = 'past_due'
             AND entitlement.last_verified_at > CURRENT_TIMESTAMP - interval '1 hour'
             AND entitlement.last_verified_at <= CURRENT_TIMESTAMP + interval '5 minutes'
             AND entitlement.grace_ends_at > CURRENT_TIMESTAMP
           THEN 'past_due'
           ELSE 'expired'
         END,
         COALESCE(entitlement.plan_id, '')
  FROM public.workspace_memberships AS membership
  JOIN public.workspaces AS workspace ON workspace.id = membership.workspace_id
  JOIN public.user_profiles AS owner_profile ON owner_profile.id = workspace.owner_id
  LEFT JOIN public.workspace_entitlements AS entitlement ON entitlement.workspace_id = workspace.id
  WHERE membership.user_id = (SELECT auth.uid())
    AND membership.status = 'active'
    AND membership.is_selected IS TRUE
    AND workspace.is_active IS TRUE
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_workspace_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_workspace_context() TO authenticated, service_role;
