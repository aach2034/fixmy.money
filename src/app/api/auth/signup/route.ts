import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { isPublicSignupOpen, signupClosedPayload } from '@/lib/signup/closure';

const ALLOWED_PLANS = new Set(['starter', 'professional', 'agency']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type SignupPayload = {
  adminName?: unknown;
  captchaToken?: unknown;
  companyName?: unknown;
  email?: unknown;
  password?: unknown;
  plan?: unknown;
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
  } catch {
    return noStoreJson({ error: 'Invalid request.' }, 400);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const adminName = typeof payload.adminName === 'string' ? payload.adminName.trim() : '';
  const companyName = typeof payload.companyName === 'string' ? payload.companyName.trim() : '';
  const plan = typeof payload.plan === 'string' && ALLOWED_PLANS.has(payload.plan)
    ? payload.plan
    : 'professional';
  const captchaToken = typeof payload.captchaToken === 'string' ? payload.captchaToken.trim() : '';

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return noStoreJson({ error: 'Enter a valid email address.' }, 400);
  }
  if (password.length < 12 || password.length > 128) {
    return noStoreJson({ error: 'Use a password between 12 and 128 characters.' }, 400);
  }
  if (!adminName || adminName.length > 100 || !companyName || companyName.length > 120) {
    return noStoreJson({ error: 'Enter your name and company name.' }, 400);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fixmy.money';
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Signup] Supabase authentication is not configured.');
    return noStoreJson({ error: 'Account creation is temporarily unavailable.' }, 503);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
