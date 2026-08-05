import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isPartixDatabase, getConnectedProjectRef } from '@/lib/supabase/partix-guard';
import { PRIVATE_ROUTE_PREFIXES } from '@/lib/seo/config';

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

// Routes that require onboarding to be complete before access is granted.
// If onboarding_completed is false, user is redirected to /onboarding.
const ONBOARDING_GATED_PATHS = [
  '/dashboard',
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
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'trial_active']);
const FULL_ACCESS_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export async function middleware(request: NextRequest) {
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

  injectTokenFromHeader(request);
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const shouldNoIndex = PRIVATE_ROUTE_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)) || request.nextUrl.searchParams.has('filter') || request.nextUrl.searchParams.has('page') || request.nextUrl.searchParams.has('sort');

  // Client portal routes — redirect to client portal login if not authenticated
  const clientPortalPaths = ['/client-portal/dashboard'];
  const isClientPortal = clientPortalPaths.some((p) => pathname.startsWith(p));

  if (!user && isClientPortal) {
    const url = request.nextUrl.clone();
    url.pathname = '/client-portal/login';
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated users away from protected routes
  const protectedPaths = [
    '/dashboard',
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
    // NOTE: /demo-mode is intentionally NOT in this list.
    // It is a public interactive demo/conversion asset.
    // Demo isolation is enforced at the data layer (demoData.ts synthetic fixtures only).
    '/admin',
  ];

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ONBOARDING GATE (server-side):
  // If the user is authenticated but has NOT completed onboarding,
  // block access to all app routes and redirect to /onboarding.
  // This prevents the dashboard from ever rendering — no flash, no data fetch.
  const isOnboardingGated = ONBOARDING_GATED_PATHS.some((p) => pathname.startsWith(p));

  if (user && isOnboardingGated && !pathname.startsWith('/onboarding')) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      // If profile missing or onboarding not completed → redirect to /onboarding
      if (!profile || !profile.onboarding_completed) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      }
    } catch {
      // On DB error, redirect to onboarding as a safe fallback
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
  }

  // SUBSCRIPTION GATE (server-side): Stripe webhooks are the source of truth.
  // A failed renewal keeps full access for 3 days. From day 4 onward, only the
  // billing recovery surface remains available; payment success clears the
  // failure timestamp and restores access automatically.
  const isSubscriptionGated = SUBSCRIPTION_GATED_PATHS.some((p) => pathname.startsWith(p));
  if (user && isSubscriptionGated) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      const status = profile?.subscription_status || '';
      let failedAt: number | null = null;

      if (status === 'past_due') {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user.id)
          .single();

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
        return NextResponse.redirect(url);
      }
    } catch {
      const url = request.nextUrl.clone();
      url.pathname = '/billing-subscriptions';
      url.searchParams.set('reason', 'subscription_check_failed');
      return NextResponse.redirect(url);
    }
  }

  // Permanent redirect: /sign-up-login-screen → /login
  if (pathname === '/sign-up-login-screen' || pathname.startsWith('/sign-up-login-screen/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url, { status: 301 });
  }

  if (shouldNoIndex) {
    supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
