-- Repair clean migration history to match the user profile shape already used
-- by the server-authoritative signup trigger and application reads.
--
-- Existing databases that already contain this production column are left
-- unchanged. New clean databases receive the same nullable text column and
-- business default represented by the production-shaped FMM-007 fixture.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'business';

-- The atomic report-save function persists the canonical mailing address that
-- existing client/report screens already read. These nullable fields likewise
-- exist in the evolved application schema but were absent from clean history.
ALTER TABLE public.staff_clients
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip text;
