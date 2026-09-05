/**
 * Onboarding Gate — server-side and client-side utility
 *
 * Checks whether a user has completed all required onboarding steps.
 * If any step is incomplete, the user must be redirected to /onboarding.
 *
 * Rules:
 * - User must be authenticated
 * - User must have a user_profiles row
 * - user_profiles.onboarding_completed must be true
 *
 * This is the single source of truth for onboarding gate logic.
 */

export type OnboardingStatus =
  | { complete: true }
  | { complete: false; reason: 'unauthenticated' | 'no_profile' | 'onboarding_incomplete' };

/**
 * Check onboarding status using a Supabase client.
 * Works with both server and browser clients.
 */
export async function checkOnboardingStatus(
  supabase: any,
  userId: string
): Promise<OnboardingStatus> {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return { complete: false, reason: 'no_profile' };
    }

    if (!profile.onboarding_completed) {
      return { complete: false, reason: 'onboarding_incomplete' };
    }

    return { complete: true };
  } catch {
    // On error, treat as incomplete to be safe
    return { complete: false, reason: 'onboarding_incomplete' };
  }
}
