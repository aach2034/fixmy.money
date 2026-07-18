-- Add trial_start and paid_trial columns to user_profiles for proper payment tracking

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS paid_trial BOOLEAN DEFAULT FALSE;

-- Index for quick lookup of paid trial users
CREATE INDEX IF NOT EXISTS idx_user_profiles_paid_trial ON public.user_profiles(paid_trial);
