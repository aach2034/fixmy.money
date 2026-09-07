import {
  enforceLeadRateLimit,
  leadResponse,
  type D1Binding,
  type LeadAbuseEnv,
} from './lead-abuse';

export interface LeadCaptureEnv extends LeadAbuseEnv {
  DB?: D1Binding;
}

const LEAD_OFFER = 'evidence-first-agency-starter-kit';
const LEAD_CONSENT = 'Send me the Evidence-First Agency Starter Kit and occasional FixMy.Money product and workflow emails. I can unsubscribe at any time.';
const REOPENING_OFFER = 'reopening-one-month-free-2026-10-25';
const REOPENING_CONSENT = 'Notify me when FixMy.Money reopens on October 25, 2026 and reserve my eligibility for one full month free when I activate after reopening.';

async function captureLead(request: Request, env: LeadCaptureEnv, options: { offer: string; consent: string; defaultSource: string; success: Record<string, unknown> }): Promise<Response> {
  if (request.method !== 'POST') return leadResponse({ error: 'Method not allowed.' }, 405);
  if (!env.DB) return leadResponse({ error: 'Email signup is temporarily unavailable.' }, 503);
  if (Number(request.headers.get('content-length') || '0') > 4096) return leadResponse({ error: 'Request is too large.' }, 413);

  let payload: { email?: unknown; source?: unknown; website?: unknown; challengeToken?: unknown };
  try {
    payload = await request.json() as typeof payload;
  } catch {
    return leadResponse({ error: 'Invalid request.' }, 400);
  }
  // Honeypot fields are treated as successful so bots do not learn how to bypass them.
  if (typeof payload.website === 'string' && payload.website.trim()) return leadResponse({ ok: true });

  const limited = await enforceLeadRateLimit(request, env, payload.challengeToken);
  if (limited) return limited;
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const source = typeof payload.source === 'string' && /^[a-z0-9_-]{1,64}$/.test(payload.source) ? payload.source : options.defaultSource;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return leadResponse({ error: 'Enter a valid email address.' }, 400);

  try {
    await env.DB.prepare(
      `INSERT INTO marketing_leads (email, offer, source, consent_text, consented_at, last_requested_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(email, offer) DO UPDATE SET
         source = excluded.source,
         consent_text = excluded.consent_text,
         consented_at = CURRENT_TIMESTAMP,
         last_requested_at = CURRENT_TIMESTAMP,
         request_count = marketing_leads.request_count + 1`
    ).bind(email, options.offer, source, options.consent).run();
  } catch (error) {
    console.error('[LeadCapture] Failed to save signup.', error);
    return leadResponse({ error: 'We could not save your signup. Please try again.' }, 500);
  }
  return leadResponse({ ok: true, ...options.success });
}

export function captureMarketingLead(request: Request, env: LeadCaptureEnv): Promise<Response> {
  return captureLead(request, env, { offer: LEAD_OFFER, consent: LEAD_CONSENT, defaultSource: 'homepage', success: { downloadUrl: '/resources/evidence-first-agency-starter-kit' } });
}

export function captureReopeningWaitlist(request: Request, env: LeadCaptureEnv): Promise<Response> {
  return captureLead(request, env, { offer: REOPENING_OFFER, consent: REOPENING_CONSENT, defaultSource: 'reopening_list', success: { reopeningDate: '2026-10-25', offer: 'one_month_free' } });
}
