import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { isPublicSignupOpen, signupClosedPayload } from '@/lib/signup/closure';
import { getSupabasePublicConfig } from '@/lib/supabase/public-config';
import { isBusinessPlan } from '@/lib/stripe/plans';
import { BUSINESS_USE_POLICY_VERSION } from '@/lib/signup/business-policy';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type SignupPayload = {
  adminName?: unknown;
  captchaToken?: unknown;
  companyName?: unknown;
  email?: unknown;
  password?: unknown;
  plan?: unknown;
  termsAccepted?: unknown;
  businessUseAccepted?: unknown;
  businessPolicyVersion?: unknown;
};

function noStoreJson(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  if (!isPublicSignupOpen()) {
    return noStoreJson(signupClosedPayload(), 403);
  }

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > 8192) {
    return noStoreJson({ error: 'Request is too large.' }, 413);
  }

  let payload: SignupPayload;
  try {
    payload = await request.json() as SignupPayload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return noStoreJson({ error: 'Invalid request.' }, 400);
    }
  } catch {
    return noStoreJson({ error: 'Invalid request.' }, 400);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const adminName = typeof payload.adminName === 'string' ? payload.adminName.trim() : '';
  const companyName = typeof payload.companyName === 'string' ? payload.companyName.trim() : '';
  const plan = payload.plan;
  const captchaToken = typeof payload.captchaToken === 'string' ? payload.captchaToken.trim() : '';

  if (!isBusinessPlan(plan)) {
    return noStoreJson({ error: 'New accounts are for businesses on Start or Grow. Select a business plan.', code: 'BUSINESS_PLAN_REQUIRED' }, 400);
  }
  if (payload.termsAccepted !== true || payload.businessUseAccepted !== true || payload.businessPolicyVersion !== BUSINESS_USE_POLICY_VERSION) {
    return noStoreJson({ error: 'Accept the current Terms of Service and Business Use Policy to continue.', code: 'BUSINESS_DECLARATION_REQUIRED' }, 400);
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return noStoreJson({ error: 'Enter a valid email address.' }, 400);
  }
  if (password.length < 12 || password.length > 128) {
    return noStoreJson({ error: 'Use a password between 12 and 128 characters.' }, 400);
  }
  if (!adminName || adminName.length > 100 || !companyName || companyName.length > 120) {
    return noStoreJson({ error: 'Enter your name and company name.' }, 400);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fixmy.money';
  let publicConfig: ReturnType<typeof getSupabasePublicConfig>;
  try {
    publicConfig = getSupabasePublicConfig();
  } catch {
    console.error('[Signup] Supabase authentication is not configured.');
    return noStoreJson({ error: 'Account creation is temporarily unavailable.' }, 503);
  }

  const supabase = createClient(publicConfig.url, publicConfig.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken: captchaToken || undefined,
      data: {
        full_name: adminName,
        company_name: companyName,
        plan,
        // User-editable declarations are NOT verified eligibility, authority,
        // or entitlement. Paid activation remains separately disabled.
        business_use_declaration: {
          version: BUSINESS_USE_POLICY_VERSION,
          accepted_at: new Date().toISOString(),
          terms_accepted: true,
        },
      },
      emailRedirectTo: `${siteUrl}/auth/callback?type=signup&plan=${encodeURIComponent(plan)}`,
    },
  });

  if (error) {
    console.error('[Signup] Supabase rejected account creation:', error.code || error.message);
    if (error.message.toLowerCase().includes('captcha')) {
      return noStoreJson({ error: 'Complete the security verification and try again.', code: 'CHALLENGE_REQUIRED' }, 400);
    }
    if (error.status === 429) {
      return noStoreJson({ error: 'Too many attempts. Please wait and try again.' }, 429);
    }
    return noStoreJson({ error: 'Account creation is temporarily unavailable. Please try again.' }, 503);
  }

  // Keep this response identical for new and already-registered addresses.
  return noStoreJson({ ok: true }, 202);
}
