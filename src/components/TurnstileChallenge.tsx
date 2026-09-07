'use client';

import { useEffect, useRef } from 'react';

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileApi = {
  render(
    element: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: 'auto';
      size: 'flexible';
      callback(token: string): void;
      'expired-callback'(): void;
      'error-callback'(): void;
    },
  ): string;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing || document.createElement('script');
    const onLoad = () => {
      if (window.turnstile) resolve(window.turnstile);
      else {
        script.remove();
        reject(new Error('Turnstile unavailable'));
      }
    };
    const onError = () => {
      script.remove();
      reject(new Error('Turnstile unavailable'));
    };

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
}

export default function TurnstileChallenge({
  generation,
  siteKey,
  onToken,
  onExpired,
  onError,
}: {
  generation: number;
  siteKey: string;
  onToken(token: string, generation: number): void;
  onExpired(): void;
  onError(): void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetId = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action: 'marketing_lead',
          theme: 'auto',
          size: 'flexible',
          callback: (token) => onToken(token, generation),
          'expired-callback': onExpired,
          'error-callback': onError,
        });
      })
      .catch(() => {
        if (!cancelled) onError();
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [generation, onError, onExpired, onToken, siteKey]);

  return <div ref={containerRef} aria-label="Security verification" />;
}
