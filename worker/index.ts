import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
} from 'vinext/server/image-optimization';
import handler from 'vinext/server/app-router-entry';
import { contentSecurityPolicyFor, immutableAssetCacheControl } from './security-controls';
import { cleanupExpiredRateLimits, emitLeadSecurityEvent } from './lead-abuse';
import {
  captureMarketingLead,
  captureReopeningWaitlist,
  type LeadCaptureEnv,
} from './lead-capture';
import {
  addRuntimePublicAttributesToHtml,
  getRuntimePublicAttributes,
  type RuntimePublicEnv,
} from './runtime-public-config';

interface Env extends LeadCaptureEnv, RuntimePublicEnv {
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

type HtmlElement = { setAttribute(name: string, value: string): void };
type HtmlRewriterInstance = {
  on(selector: string, handlers: { element(element: HtmlElement): void }): HtmlRewriterInstance;
  transform(response: Response): Response;
};
declare const HTMLRewriter: {
  new (): HtmlRewriterInstance;
};

function createCspNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

async function withSecurityHeaders(
  response: Response,
  request?: Request,
  env?: RuntimePublicEnv,
): Promise<Response> {
  let secured = new Response(response.body, response);
  const isHtml = secured.headers.get('Content-Type')?.toLowerCase().includes('text/html') ?? false;
  const nonce = isHtml ? createCspNonce() : undefined;
  secured.headers.set(
    'Content-Security-Policy',
    contentSecurityPolicyFor(request?.url || 'https://fixmy.money', nonce),
  );
  secured.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  secured.headers.set('X-Content-Type-Options', 'nosniff');
  secured.headers.set('X-Frame-Options', 'DENY');
  secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  secured.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")');
  const cacheControl = request ? immutableAssetCacheControl(new URL(request.url).pathname) : null;
  if (cacheControl) secured.headers.set('Cache-Control', cacheControl);
  if (nonce) {
    const publicAttributes = getRuntimePublicAttributes(env);
    if (typeof HTMLRewriter === 'undefined') {
      const html = await secured.text();
      secured = new Response(
        addRuntimePublicAttributesToHtml(html, publicAttributes)
          .replace(/<script(?=[\s>])/gi, `<script nonce="${nonce}"`),
        {
          status: secured.status,
          statusText: secured.statusText,
          headers: secured.headers,
        },
      );
      return secured;
    }
    let rewriter = new HTMLRewriter();
    if (publicAttributes) {
      rewriter = rewriter.on('html', {
        element: element => {
          Object.entries(publicAttributes).forEach(([name, value]) => element.setAttribute(name, value));
        },
      });
    }
    secured = rewriter
      .on('script', { element: element => element.setAttribute('nonce', nonce) })
      .transform(secured);
  }
  return secured;
}

export { captureMarketingLead, captureReopeningWaitlist, withSecurityHeaders };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/marketing/lead') {
      return await withSecurityHeaders(await captureMarketingLead(request, env), request, env);
    }
    if (url.pathname === '/api/reopening-waitlist') {
      return await withSecurityHeaders(await captureReopeningWaitlist(request, env), request, env);
    }
    if (url.pathname === '/_vinext/image') {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return await withSecurityHeaders(await handleImageOptimization(
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
      ), request, env);
    }
    return await withSecurityHeaders(await handler.fetch(request, env, ctx), request, env);
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
        .catch(() => emitLeadSecurityEvent(
          { event: 'lead_rate_limit_cleanup_failed' },
          env,
        )),
    );
  },
};
