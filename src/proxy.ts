import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isPartixDatabase, getConnectedProjectRef } from '@/lib/supabase/partix-guard';
import { PRIVATE_ROUTE_PREFIXES } from '@/lib/seo/config';
import { ACTIVE_SUBSCRIPTION_STATUSES } from '@/lib/subscription/access';
import { includeCookieInVary } from '@/lib/auth/session-isolation';

const MAINTENANCE_MODE = false;
const MAINTENANCE_PATH = '/maintenance';
const MAINTENANCE_PASSTHROUGH_PATHS = new Set([
  '/auth/callback',
  '/forgot-password',
  '/reset-password',
]);

export function shouldRedirectForMaintenance(
  request: NextRequest,
  maintenanceMode = MAINTENANCE_MODE
): boolean {
  const { pathname } = request.nextUrl;
  if (!maintenanceMode || pathname === MAINTENANCE_PATH) return false;
  if (pathname.startsWith('/api/') || MAINTENANCE_PASSTHROUGH_PATHS.has(pathname)) return false;

  const acceptsHtml = request.headers.get('accept')?.includes('text/html') ?? false;
  return (request.method === 'GET' || request.method === 'HEAD') && acceptsHtml;
}

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
}

function injectTokenFromHeader(request: NextRequest): void {
  const token = request.headers.get('x-sb-token');
  if (!token) return;
  const hasCookie = request.cookies.getAll().some((c) => c.name.includes('auth-token'));
  if (hasCookie) return;
  request.cookies.set(`sb-${getProjectRef()}-auth-token`, token);
}

function redirectToLoginWithReturnPath(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  const returnPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('redirect', returnPath);
  return NextResponse.redirect(url);
}

// Routes that require onboarding to be complete before access is granted.
// If onboarding_completed is false, user is redirected to /onboarding.
const ONBOARDING_GATED_PATHS = [
  '/dashboard',
  '/clients',
  '/client-management',
  '/client-pipeline',
  '/dispute-letter-management',
  '/disputes',
  '/ai-dispute-analyzer',
  '/ai-financial-coach',
  '/workflow-task-management',
  '/revenue-forecasting',
  '/billing-subscriptions',
  '/financial-health',
  '/debt-elimination',
  '/knowledge-base',
  '/appointments',
  '/live-chat',
  '/launch-submissions',
  '/finance',
  '/credit-report-import',
  '/credit-audit',
  '/dispute-wizard',
  '/admin',
];

const SUBSCRIPTION_GATED_PATHS = ONBOARDING_GATED_PATHS.filter(
  (path) => !['/billing-subscriptions', '/onboarding', '/admin'].includes(path)
);
const FULL_ACCESS_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

interface CurrentWorkspaceContext {
  workspace_id: string;
  workspace_owner_id: string;
  onboarding_completed: boolean;
  subscription_status: string;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Keep API callbacks and static assets running while temporarily replacing
  // every visitor-facing page with the maintenance notice.
  if (shouldRedirectForMaintenance(request)) {
    const url = request.nextUrl.clone();
    url.pathname = MAINTENANCE_PATH;
    url.search = '';

    const response = NextResponse.redirect(url, 307);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    response.headers.set('Retry-After', '3600');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  }

  if (pathname === MAINTENANCE_PATH) {
    const response = NextResponse.next({ request });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  }

  // PHASE 1 GUARD: If FixMy.Money is misconfigured to use the Partix database,
  // return a 503 with a clear message instead of silently contaminating Partix data.
  if (isPartixDatabase()) {
    return new NextResponse(
      JSON.stringify({
        error:
          'FixMy.Money is configured to use the Partix Supabase project. ' + 'Update the FixMy.Money Supabase environment variables before continuing.',
        project_ref: getConnectedProjectRef(),
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Allow public pages to render in local previews that do not have Supabase
  // credentials. Protected routes still fail closed by redirecting to login.
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!hasSupabaseConfig) {
    const protectedPaths = [
      '/dashboard',
      '/clients',
      '/client-management',
      '/client-pipeline',
      '/dispute-letter-management',
      '/disputes',
      '/ai-dispute-analyzer',
      '/ai-financial-coach',
      '/workflow-task-management',
      '/revenue-forecasting',
      '/billing-subscriptions',
      '/financial-health',
      '/debt-elimination',
      '/knowledge-base',
      '/appointments',
      '/affiliate-program',
      '/workspace-setup',
      '/onboarding',
      '/checkout',
      '/live-chat',
      '/launch-submissions',
      '/finance',
      '/credit-report-import',
      '/credit-audit',
      '/dispute-wizard',
      '/admin',
      '/client-portal/dashboard',
    ];

    if (protectedPaths.some((path) => pathname.startsWith(path))) {
      if (pathname.startsWith('/client-portal')) {
        const url = request.nextUrl.clone();
        url.pathname = '/client-portal/login';
        return NextResponse.redirect(url);
      }
      return redirectToLoginWithReturnPath(request);
    }

    return NextResponse.next({ request });
  }

  injectTokenFromHeader(request);
  let supabaseResponse = NextResponse.next({ request });
  let authResponseHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          authResponseHeaders = { ...authResponseHeaders, ...headers };
          Object.entries(headers).forEach(([name, value]) => {
            supabaseResponse.headers.set(name, value);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const carryAuthState = (response: NextResponse): NextResponse => {
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie));
    Object.entries(authResponseHeaders).forEach(([name, value]) => response.headers.set(name, value));
    response.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate, max-age=0'
    );
    response.headers.set('Expires', '0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Vary', includeCookieInVary(response.headers.get('Vary')));
    return response;
  };

  const shouldNoIndex = PRIVATE_ROUTE_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)) || request.nextUrl.searchParams.has('filter') || request.nextUrl.searchParams.has('page') || request.nextUrl.searchParams.has('sort');

  // Client portal routes — redirect to client portal login if not authenticated
  const clientPortalPaths = ['/client-portal/dashboard'];
  const isClientPortal = clientPortalPaths.some((p) => pathname.startsWith(p));

  if (!user && isClientPortal) {
    const url = request.nextUrl.clone();
    url.pathname = '/client-portal/login';
    return carryAuthState(NextResponse.redirect(url));
  }

  // Redirect unauthenticated users away from protected routes
  const protectedPaths = [
    '/dashboard',
    '/clients',
    '/client-management',
    '/client-pipeline',
    '/dispute-letter-management',
    '/disputes',
    '/ai-dispute-analyzer',
    '/ai-financial-coach',
    '/workflow-task-management',
    '/revenue-forecasting',
    '/billing-subscriptions',
    '/financial-health',
    '/debt-elimination',
    '/knowledge-base',
    '/appointments',
    '/affiliate-program',
    '/workspace-setup',
    '/onboarding',
    '/checkout',
    '/live-chat',
    '/launch-submissions',
    '/finance',
    '/credit-report-import',
    '/credit-audit',
    '/dispute-wizard',
    // NOTE: /demo-mode is intentionally NOT in this list.
    // It is a public interactive demo/conversion asset.
    // Demo isolation is enforced at the data layer (demoData.ts synthetic fixtures only).
    '/admin',
  ];

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    return carryAuthState(redirectToLoginWithReturnPath(request));
  }

  // Staff routes require one explicit active workspace membership. Selecting a
  // workspace changes the database-enforced RLS boundary for every subsequent
  // query, so memberships in multiple agencies can never be blended silently.
  let currentWorkspace: CurrentWorkspaceContext | null = null;
  const requiresWorkspace = isProtected && !pathname.startsWith('/admin');
  if (user && requiresWorkspace) {
    const { data: workspaceRows, error: workspaceError } = await supabase.rpc('current_workspace_context');
    currentWorkspace = (workspaceRows?.[0] || null) as CurrentWorkspaceContext | null;
    if (workspaceError || !currentWorkspace) {
      const { data: portalAccount } = await supabase
        .from('client_accounts')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      const url = request.nextUrl.clone();
      url.pathname = portalAccount ? '/client-portal/dashboard' : '/login';
      url.search = '';
      return carryAuthState(NextResponse.redirect(url));
    }
  }

  // ONBOARDING GATE (server-side):
  // If the user is authenticated but has NOT completed onboarding,
  // block access to all app routes and redirect to /onboarding.
  // This prevents the dashboard from ever rendering — no flash, no data fetch.
  const isOnboardingGated = ONBOARDING_GATED_PATHS.some((p) => pathname.startsWith(p));

  if (user && isOnboardingGated && !pathname.startsWith('/onboarding')) {
    try {
      const profile = currentWorkspace || (await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()).data;

      // If profile missing or onboarding not completed → redirect to /onboarding
      if (!profile || !profile.onboarding_completed) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return carryAuthState(NextResponse.redirect(url));
      }
    } catch {
      // On DB error, redirect to onboarding as a safe fallback
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return carryAuthState(NextResponse.redirect(url));
    }
  }

  // SUBSCRIPTION GATE (server-side): Stripe webhooks are the source of truth.
  // A failed renewal keeps full access for 3 days. From day 4 onward, only the
  // billing recovery surface remains available; payment success clears the
  // failure timestamp and restores access automatically.
  const isSubscriptionGated = SUBSCRIPTION_GATED_PATHS.some((p) => pathname.startsWith(p));
  if (user && isSubscriptionGated) {
    try {
      const status = currentWorkspace?.subscription_status || '';
      let failedAt: number | null = null;

      if (status === 'past_due') {
        const workspace = currentWorkspace ? { id: currentWorkspace.workspace_id } : null;

        if (workspace?.id) {
          const { data: lastPaid } = await supabase
            .from('billing_events')
            .select('stripe_created_at')
            .eq('workspace_id', workspace.id)
            .eq('event_type', 'invoice.payment_succeeded')
            .order('stripe_created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let failedQuery = supabase
            .from('billing_events')
            .select('stripe_created_at')
            .eq('workspace_id', workspace.id)
            .eq('event_type', 'invoice.payment_failed')
            .order('stripe_created_at', { ascending: true })
            .limit(1);

          if (lastPaid?.stripe_created_at) {
            failedQuery = failedQuery.gt('stripe_created_at', lastPaid.stripe_created_at);
          }

          const { data: firstFailure } = await failedQuery.maybeSingle();
          failedAt = firstFailure?.stripe_created_at
            ? new Date(firstFailure.stripe_created_at).getTime()
            : null;
        }
      }
      const inFullAccessGrace =
        status === 'past_due' && failedAt !== null && Date.now() - failedAt < FULL_ACCESS_GRACE_MS;

      if (!ACTIVE_SUBSCRIPTION_STATUSES.has(status) && !inFullAccessGrace) {
        const url = request.nextUrl.clone();
        url.pathname = '/billing-subscriptions';
        url.searchParams.set('reason', status === 'past_due' ? 'payment_retry' : 'subscription_required');
        return carryAuthState(NextResponse.redirect(url));
      }
    } catch {
      const url = request.nextUrl.clone();
      url.pathname = '/billing-subscriptions';
      url.searchParams.set('reason', 'subscription_check_failed');
      return carryAuthState(NextResponse.redirect(url));
    }
  }

  // Permanent redirect: /sign-up-login-screen → /login
  if (pathname === '/sign-up-login-screen' || pathname.startsWith('/sign-up-login-screen/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return carryAuthState(NextResponse.redirect(url, { status: 301 }));
  }

  if (shouldNoIndex) {
    supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  if (
    user ||
    isProtected ||
    isClientPortal ||
    pathname === '/login' ||
    pathname.startsWith('/auth/')
  ) {
    carryAuthState(supabaseResponse);
  }
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
