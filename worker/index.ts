import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { contentSecurityPolicyFor, immutableAssetCacheControl } from './security-controls';
import {
  cleanupExpiredRateLimits,
  enforceLeadRateLimit,
  leadResponse,
  type D1Binding,
} from './lead-abuse';

interface Env {
  ASSETS?: { fetch(request: Request): Promise<Response> };
  DB?: D1Binding;
  LEAD_RATE_LIMIT_SALT?: string;
  TURNSTILE_SECRET_KEY?: string;
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const LEAD_OFFER = "evidence-first-agency-starter-kit";
const LEAD_CONSENT =
  "Send me the Evidence-First Agency Starter Kit and occasional FixMy.Money product and workflow emails. I can unsubscribe at any time.";

function withSecurityHeaders(response: Response, request?: Request): Response {
  const secured = new Response(response.body, response);
  secured.headers.set(
    "Content-Security-Policy",
    contentSecurityPolicyFor(request?.url || 'https://fixmy.money'),
  );
  secured.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self \"https://js.stripe.com\")",
  );
  const cacheControl = request ? immutableAssetCacheControl(new URL(request.url).pathname) : null;
  if (cacheControl) secured.headers.set('Cache-Control', cacheControl);
  return secured;
}

async function captureMarketingLead(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return leadResponse({ error: "Method not allowed." }, 405);
  }

  if (!env.DB) {
    console.error("[LeadCapture] D1 binding DB is unavailable.");
    return leadResponse({ error: "Email signup is temporarily unavailable." }, 503);
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 4096) {
    return leadResponse({ error: "Request is too large." }, 413);
  }

  let payload: { email?: unknown; source?: unknown; website?: unknown; challengeToken?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return leadResponse({ error: "Invalid request." }, 400);
  }

  // Honeypot fields are treated as successful so bots do not learn how to bypass them.
  if (typeof payload.website === "string" && payload.website.trim()) {
    return leadResponse({ ok: true });
  }

  const limited = await enforceLeadRateLimit(request, env, payload.challengeToken);
  if (limited) return limited;

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const source =
    typeof payload.source === "string" && /^[a-z0-9_-]{1,64}$/.test(payload.source)
      ? payload.source
      : "homepage";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (!emailPattern.test(email) || email.length > 254) {
    return leadResponse({ error: "Enter a valid work email address." }, 400);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO marketing_leads (
        email, offer, source, consent_text, consented_at, last_requested_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(email, offer) DO UPDATE SET
        source = excluded.source,
        consent_text = excluded.consent_text,
        consented_at = CURRENT_TIMESTAMP,
        last_requested_at = CURRENT_TIMESTAMP,
        request_count = marketing_leads.request_count + 1`
    )
      .bind(email, LEAD_OFFER, source, LEAD_CONSENT)
      .run();
  } catch (error) {
    console.error("[LeadCapture] Failed to save signup.", error);
    return leadResponse({ error: "We could not save your signup. Please try again." }, 500);
  }

  return leadResponse({
    ok: true,
    downloadUrl: "/resources/evidence-first-agency-starter-kit",
  });
}

export { captureMarketingLead, enforceLeadRateLimit, withSecurityHeaders };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/marketing/lead") {
      return withSecurityHeaders(await captureMarketingLead(request, env), request);
    }
    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return withSecurityHeaders(await handleImageOptimization(
        request,
        {
          fetchAsset: (path) => env.ASSETS
            ? env.ASSETS.fetch(new Request(new URL(path, request.url)))
            : fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            if (!env.IMAGES) {
              return new Response(body);
            }
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality });
            return result.response();
          },
        },
        allowedWidths,
      ), request);
    }
    return withSecurityHeaders(await handler.fetch(request, env, ctx), request);
  },
  async scheduled(_controller: unknown, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!env.DB) {
      console.error(JSON.stringify({ event: 'lead_rate_limit_cleanup_unavailable' }));
      return;
    }
    ctx.waitUntil(
      cleanupExpiredRateLimits(env.DB)
        .then((deleted) => {
          console.info(JSON.stringify({ event: 'lead_rate_limit_cleanup', deleted }));
        })
        .catch(() => {
          console.error(JSON.stringify({ event: 'lead_rate_limit_cleanup_failed' }));
        }),
    );
  },
};
