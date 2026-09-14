import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import {
  PASSWORD_RECOVERY_COOKIE,
  verifyPasswordRecoveryState,
} from '@/lib/auth/password-recovery-state';
import {
  AUTH_CACHE_HEADERS,
  includeCookieInVary,
  isSupabaseAuthCookie,
} from '@/lib/auth/session-isolation';

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

function createResponse(
  request: NextRequest,
  body: Record<string, unknown>,
  status: number,
  pendingCookies: PendingCookie[] = [],
  pendingHeaders: Record<string, string> = {},
  clearRecovery = false,
  clearAuth = false
): NextResponse {
  const response = NextResponse.json(body, { status });
  pendingCookies.forEach(cookie => response.cookies.set(cookie.name, cookie.value, cookie.options));
  Object.entries(pendingHeaders).forEach(([name, value]) => response.headers.set(name, value));
  Object.entries(AUTH_CACHE_HEADERS).forEach(([name, value]) => response.headers.set(name, value));
  response.headers.set('Vary', includeCookieInVary(response.headers.get('Vary')));

  const namesToClear = new Set<string>();
  if (clearAuth) {
    request.cookies.getAll().forEach(({ name }) => {
      if (isSupabaseAuthCookie(name)) namesToClear.add(name);
    });
    pendingCookies.forEach(({ name }) => {
      if (isSupabaseAuthCookie(name)) namesToClear.add(name);
    });
  }
  if (clearRecovery) namesToClear.add(PASSWORD_RECOVERY_COOKIE);

  namesToClear.forEach(name => {
    response.cookies.set(name, '', {
      path: '/',
      expires: new Date(0),
      maxAge: 0,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      httpOnly: true,
    });
  });

  return response;
}

function createSupabaseContext(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const signingSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !signingSecret) return null;

  const pendingCookies: PendingCookie[] = [];
  let pendingHeaders: Record<string, string> = {};
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

  return {
    supabase,
    signingSecret,
    pendingCookies,
    getPendingHeaders: () => pendingHeaders,
  };
}

async function validateRecovery(request: NextRequest) {
  const context = createSupabaseContext(request);
  const state = request.cookies.get(PASSWORD_RECOVERY_COOKIE)?.value;
  if (!context) return { context, valid: false as const, reason: 'configuration' as const };
  if (!state) return { context, valid: false as const, reason: 'state-missing' as const };

  const {
    data: { session },
    error: sessionError,
  } = await context.supabase.auth.getSession();
  if (sessionError || !session) {
    return { context, valid: false as const, reason: 'session-missing' as const };
  }

  const {
    data: { user },
    error: userError,
  } = await context.supabase.auth.getUser(session.access_token);
  if (userError || !user) {
    return { context, valid: false as const, reason: 'identity-unverified' as const };
  }

  const valid = await verifyPasswordRecoveryState({
    state,
    accessToken: session.access_token,
    userId: user.id,
    secret: context.signingSecret,
  });

  return {
    context,
    valid,
    user,
    reason: valid ? null : 'state-binding-invalid' as const,
  };
}

export async function GET(request: NextRequest) {
  try {
    const result = await validateRecovery(request);
    if (!result.valid || !result.context) {
      console.warn('[Password Recovery] Recovery state rejected:', result.reason);
      return createResponse(
        request,
        { valid: false },
        401,
        result.context?.pendingCookies ?? [],
        result.context?.getPendingHeaders() ?? {},
        true
      );
    }

    return createResponse(
      request,
      { valid: true },
      200,
      result.context.pendingCookies,
      result.context.getPendingHeaders()
    );
  } catch {
    return createResponse(request, { valid: false }, 401, [], {}, true);
  }
}

export async function POST(request: NextRequest) {
  let password = '';
  let confirmation = '';
  try {
    const body = (await request.json()) as { password?: unknown; confirmation?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
    confirmation = typeof body.confirmation === 'string' ? body.confirmation : '';
  } catch {
    return createResponse(request, { error: 'Invalid password update request.' }, 400);
  }

  if (password.length < 8 || password !== confirmation) {
    return createResponse(request, { error: 'Password requirements were not met.' }, 400);
  }

  try {
    const result = await validateRecovery(request);
    if (!result.valid || !result.context) {
      console.warn('[Password Recovery] Password update rejected:', result.reason);
      return createResponse(
        request,
        { error: 'This reset link is invalid or expired.' },
        401,
        result.context?.pendingCookies ?? [],
        result.context?.getPendingHeaders() ?? {},
        true
      );
    }

    const { error: updateError } = await result.context.supabase.auth.updateUser({ password });
    if (updateError) {
      return createResponse(
        request,
        { error: 'This reset link is invalid or expired.' },
        400,
        result.context.pendingCookies,
        result.context.getPendingHeaders()
      );
    }

    const { error: signOutError } = await result.context.supabase.auth.signOut({ scope: 'global' });
    if (signOutError) {
      return createResponse(
        request,
        { error: 'Your password changed, but the recovery session could not be revoked. Sign in again before continuing.' },
        500,
        result.context.pendingCookies,
        result.context.getPendingHeaders(),
        true,
        true
      );
    }
    return createResponse(
      request,
      { ok: true, redirectTo: '/login?password_reset=1' },
      200,
      result.context.pendingCookies,
      result.context.getPendingHeaders(),
      true,
      true
    );
  } catch {
    return createResponse(
      request,
      { error: 'This reset link is invalid or expired.' },
      401,
      [],
      {},
      true
    );
  }
}
