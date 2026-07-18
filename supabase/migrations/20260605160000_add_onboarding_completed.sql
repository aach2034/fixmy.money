-- Migration: Add onboarding_completed column to user_profiles
-- Timestamp: 20260605160000

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Update existing users who have already set up their workspace to be considered onboarded
UPDATE public.user_profiles
SET onboarding_completed = true
WHERE subscription_status IN ('active', 'trial_active', 'trialing')
  AND company_name IS NOT NULL
  AND company_name != '';
