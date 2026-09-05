-- Repair clean migration history to match the user profile shape already used
-- by the server-authoritative signup trigger and application reads.
--
-- Existing databases that already contain this production column are left
-- unchanged. New clean databases receive the same nullable text column and
-- business default represented by the production-shaped FMM-007 fixture.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'business';
