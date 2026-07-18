ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS payment_failed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_profiles_payment_failed_at
  ON public.user_profiles(payment_failed_at)
  WHERE payment_failed_at IS NOT NULL;

COMMENT ON COLUMN public.user_profiles.payment_failed_at IS
  'First failed renewal timestamp for the current delinquency period; cleared after invoice payment succeeds.';
