import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
} from 'vinext/server/image-optimization';
import handler from 'vinext/server/app-router-entry';
import { contentSecurityPolicyFor, immutableAssetCacheControl } from './security-controls';
import { cleanupExpiredRateLimits } from './lead-abuse';
import {
  captureMarketingLead,
  captureReopeningWaitlist,
  type LeadCaptureEnv,
} from './lead-capture';

interface Env extends LeadCaptureEnv {
  ASSETS?: { fetch(request: Request): Promise<Response> };
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

function withSecurityHeaders(response: Response, request?: Request): Response {
  const secured = new Response(response.body, response);
  secured.headers.set(
    'Content-Security-Policy',
    contentSecurityPolicyFor(request?.url || 'https://fixmy.money'),
  );
  secured.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  secured.headers.set('X-Content-Type-Options', 'nosniff');
  secured.headers.set('X-Frame-Options', 'DENY');
  secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  secured.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")');
  const cacheControl = request ? immutableAssetCacheControl(new URL(request.url).pathname) : null;
  if (cacheControl) secured.headers.set('Cache-Control', cacheControl);
  return secured;
}

export { captureMarketingLead, captureReopeningWaitlist, withSecurityHeaders };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/marketing/lead') {
      return withSecurityHeaders(await captureMarketingLead(request, env), request);
    }
    if (url.pathname === '/api/reopening-waitlist') {
      return withSecurityHeaders(await captureReopeningWaitlist(request, env), request);
    }
    if (url.pathname === '/_vinext/image') {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return withSecurityHeaders(await handleImageOptimization(
        request,
        {
          fetchAsset: path => env.ASSETS
            ? env.ASSETS.fetch(new Request(new URL(path, request.url)))
            : fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            if (!env.IMAGES) return new Response(body);
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
