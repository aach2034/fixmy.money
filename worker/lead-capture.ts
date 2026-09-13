import {
  emitLeadSecurityEvent,
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
export const LEAD_REQUEST_MAX_BYTES = 4096;

type LeadPayload = {
  email?: unknown;
  source?: unknown;
  website?: unknown;
  challengeToken?: unknown;
};

type LeadPayloadResult =
  | { payload: LeadPayload; response?: never }
  | { payload?: never; response: Response };

async function readLeadPayload(request: Request): Promise<LeadPayloadResult> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) {
      return { response: leadResponse({ error: 'Invalid request.' }, 400) };
    }
    if (Number(declaredLength) > LEAD_REQUEST_MAX_BYTES) {
      return { response: leadResponse({ error: 'Request is too large.' }, 413) };
    }
  }

  if (!request.body) {
    return { response: leadResponse({ error: 'Invalid request.' }, 400) };
  }

  const reader = request.body.getReader();
  const bytes = new Uint8Array(LEAD_REQUEST_MAX_BYTES);
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      if (value.byteLength > LEAD_REQUEST_MAX_BYTES - bytesRead) {
        await reader.cancel().catch(() => undefined);
        return { response: leadResponse({ error: 'Request is too large.' }, 413) };
      }
      bytes.set(value, bytesRead);
      bytesRead += value.byteLength;
    }
  } catch {
    return { response: leadResponse({ error: 'Invalid request.' }, 400) };
  } finally {
    reader.releaseLock();
  }

  try {
    const parsed = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, bytesRead)),
    ) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { response: leadResponse({ error: 'Invalid request.' }, 400) };
    }
    return { payload: parsed as LeadPayload };
  } catch {
    return { response: leadResponse({ error: 'Invalid request.' }, 400) };
  }
}

async function captureLead(request: Request, env: LeadCaptureEnv, options: { offer: string; consent: string; defaultSource: string; success: Record<string, unknown> }): Promise<Response> {
  if (request.method !== 'POST') return leadResponse({ error: 'Method not allowed.' }, 405);
  const body = await readLeadPayload(request);
  if (body.response) return body.response;
  if (!env.DB) return leadResponse({ error: 'Email signup is temporarily unavailable.' }, 503);
  const payload = body.payload;
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
  } catch {
    await emitLeadSecurityEvent({ event: 'lead_capture_persistence_failed' }, env);
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
