import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  AUTH_CACHE_HEADERS,
  AUTH_FAILURE_PATH,
  getSafeCallbackPath,
  includeCookieInVary,
  isSupabaseAuthCookie,
} from '@/lib/auth/session-isolation';
import {
  issuePasswordRecoveryState,
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_TTL_SECONDS,
} from '@/lib/auth/password-recovery-state';
import { canUseCustomerAcquisition } from '@/lib/signup/closure';
import { getAdminClient } from '@/lib/supabase/admin';
import { getSupabasePublicConfig } from '@/lib/supabase/public-config';

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
  let redirectOrigin = request.nextUrl.origin;
  try {
    const configuredOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || '').origin;
    if (configuredOrigin.startsWith('https://') || configuredOrigin.startsWith('http://')) {
      redirectOrigin = configuredOrigin;
    }
  } catch {
    // Use the request origin only when the configured canonical origin is absent or invalid.
  }
  const response = NextResponse.redirect(new URL(path, `${redirectOrigin}/`));

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
  response.cookies.set(PASSWORD_RECOVERY_COOKIE, '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    httpOnly: true,
  });

  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!code && !tokenHash) {
    return createFailedAuthRedirect(request);
  }

  const pendingCookies: PendingCookie[] = [];
  let pendingHeaders: Record<string, string> = {};

  try {
    let publicConfig;
    try {
      publicConfig = getSupabasePublicConfig();
    } catch {
      console.error('[Auth Callback] Supabase authentication is not configured.');
      return createFailedAuthRedirect(request);
    }

    const supabase = createServerClient(publicConfig.url, publicConfig.publishableKey, {
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
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === 'recovery' ? 'recovery' : 'email',
        })
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

    let isAdministratorRecovery = false;

    if (type === 'recovery') {
      try {
        const { data: administrator, error: administratorError } = await getAdminClient()
          .from('platform_admins')
          .select('role')
          .eq('user_id', verifiedUser.id)
          .maybeSingle();

        isAdministratorRecovery =
          !administratorError &&
          (administrator?.role === 'platform_admin' || administrator?.role === 'platform_superadmin');
      } catch (error) {
        console.error(
          '[Auth Callback] Administrator recovery eligibility could not be verified:',
          error instanceof Error ? error.message : 'Unknown server error'
        );
      }
    }

    // Supabase's hosted "Allow new users to sign up" setting is the primary
    // authority. This callback is defense in depth for stale signup links and
    // any newly-created OAuth identity that reaches the application anyway.
    // A verified, database-authorized administrator may recover an existing
    // invited account without reopening customer signups. The role lookup is
    // server-only and deliberately ignores user-editable metadata.
    if (!canUseCustomerAcquisition(verifiedUser.created_at) && !isAdministratorRecovery) {
      return createAuthRedirect(request, '/signup?blocked=1');
    }

    if (type === 'recovery') {
      const signingSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!signingSecret) {
        console.error('[Auth Callback] Recovery-state signing is not configured.');
        return createFailedAuthRedirect(request);
      }

      const recoveryState = await issuePasswordRecoveryState({
        accessToken: exchangeData.session.access_token,
        userId: verifiedUser.id,
        secret: signingSecret,
      });
      const response = createAuthRedirect(
        request,
        '/reset-password',
        pendingCookies,
        pendingHeaders
      );
      response.cookies.set(PASSWORD_RECOVERY_COOKIE, recoveryState, {
        path: '/',
        maxAge: PASSWORD_RECOVERY_TTL_SECONDS,
        sameSite: 'lax',
        secure: request.nextUrl.protocol === 'https:',
        httpOnly: true,
      });
      return response;
    }

    let destination: string;

    if (type === 'signup') {
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
