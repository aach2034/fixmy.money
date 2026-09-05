import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  AUTH_CACHE_HEADERS,
  AUTH_FAILURE_PATH,
  getSafeCallbackPath,
  includeCookieInVary,
  isSupabaseAuthCookie,
} from '@/lib/auth/session-isolation';

const ALLOWED_PLANS = new Set(['starter', 'professional', 'agency']);

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

function createAuthRedirect(
  request: NextRequest,
  path: string,
  pendingCookies: PendingCookie[] = [],
  pendingHeaders: Record<string, string> = {}
): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));

  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  Object.entries(pendingHeaders).forEach(([name, value]) => response.headers.set(name, value));
  Object.entries(AUTH_CACHE_HEADERS).forEach(([name, value]) => response.headers.set(name, value));
  response.headers.set('Vary', includeCookieInVary(response.headers.get('Vary')));

  return response;
}

function createFailedAuthRedirect(request: NextRequest): NextResponse {
  const response = createAuthRedirect(request, AUTH_FAILURE_PATH);

  // Remove only local Supabase authentication material. This does not revoke,
  // delete, or otherwise mutate any server-side user or session record.
  request.cookies.getAll().filter(({ name }) => isSupabaseAuthCookie(name)).forEach(({ name }) => {
    response.cookies.set(name, '', {
      path: '/',
      expires: new Date(0),
      maxAge: 0,
      sameSite: 'none',
      secure: true,
      partitioned: true,
    });
  });

  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');

  if (!code && !tokenHash) {
    return createFailedAuthRedirect(request);
  }

  const pendingCookies: PendingCookie[] = [];
  let pendingHeaders: Record<string, string> = {};

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Auth Callback] Supabase authentication is not configured.');
      return createFailedAuthRedirect(request);
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(cookie => {
            const existingIndex = pendingCookies.findIndex(({ name }) => name === cookie.name);
            if (existingIndex >= 0) pendingCookies[existingIndex] = cookie;
            else pendingCookies.push(cookie);
          });
          pendingHeaders = { ...pendingHeaders, ...headers };
        },
      },
    });

    const { data: exchangeData, error: exchangeError } = tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
      : await supabase.auth.exchangeCodeForSession(code!);
    const exchangedUserId = exchangeData.session?.user?.id;

    if (exchangeError || !exchangeData.session || !exchangedUserId) {
      console.error(
        '[Auth Callback] Unable to establish a verified session:',
        exchangeError?.message || 'No session returned'
      );
      return createFailedAuthRedirect(request);
    }

    // Bind the redirect to the identity proven by the newly exchanged access
    // token. Never use a pre-existing browser session to complete this flow.
    const {
      data: { user: verifiedUser },
      error: verificationError,
    } = await supabase.auth.getUser(exchangeData.session.access_token);

    if (verificationError || !verifiedUser || verifiedUser.id !== exchangedUserId) {
      console.error(
        '[Auth Callback] Exchanged session identity verification failed:',
        verificationError?.message || 'Identity mismatch'
      );
      return createFailedAuthRedirect(request);
    }

    const type = searchParams.get('type');
    let destination: string;

    if (type === 'recovery') {
      destination = '/reset-password';
    } else if (type === 'signup') {
      const requestedPlan = searchParams.get('plan') || 'professional';
      const plan = ALLOWED_PLANS.has(requestedPlan) ? requestedPlan : 'professional';
      destination = `/checkout?plan=${encodeURIComponent(plan)}&verified=1`;
    } else if (type === 'client_signup') {
      destination = searchParams.has('next')
        ? getSafeCallbackPath(searchParams.get('next'))
        : '/client-portal/login';
    } else {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', verifiedUser.id)
        .single();

      destination = profile?.onboarding_completed
        ? getSafeCallbackPath(searchParams.get('next'))
        : '/onboarding';
    }

    return createAuthRedirect(request, destination, pendingCookies, pendingHeaders);
  } catch (error) {
    console.error('[Auth Callback] Unexpected error:', error);
    return createFailedAuthRedirect(request);
  }
}
