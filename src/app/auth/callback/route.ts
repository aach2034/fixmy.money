import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/onboarding';
  const type = searchParams.get('type');
  const plan = searchParams.get('plan') || 'professional';

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        if (type === 'recovery') {
          return NextResponse.redirect(`${origin}/reset-password`);
        }
        if (type === 'signup') {
          // New signup: always go to checkout first, then onboarding.
          // Checkout sets up the subscription; onboarding gate enforces setup before dashboard.
          return NextResponse.redirect(`${origin}/checkout?plan=${plan}`);
        }
        // Login email confirmation or other flows: check onboarding status
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single();

          if (!profile || !profile.onboarding_completed) {
            return NextResponse.redirect(`${origin}/onboarding`);
          }
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error('[Auth Callback] exchangeCodeForSession error:', error.message);
    } catch (err) {
      console.error('[Auth Callback] Unexpected error:', err);
    }
  }

  // Fallback: redirect to sign-in page
  return NextResponse.redirect(`${origin}/sign-up-login-screen`);
}
