-- FMM-010 follow-up: authenticated users may edit their own profile, but the
-- browser must not be able to delete and recreate that row with onboarding
-- completion flags already set. Profile creation/deletion is server-owned.

REVOKE INSERT, DELETE ON TABLE public.user_profiles FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_read_own_user_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_user_profile" ON public.user_profiles;

CREATE POLICY "users_read_own_user_profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "users_update_own_user_profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));
