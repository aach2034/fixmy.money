'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

const SHARE_TITLE = 'Three details to compare across your credit reports';
const SHARE_TEXT =
  'Compare balances and status, important dates, and account identifiers. Potential differences need investigation and do not automatically establish an error.';

type ShareState = 'idle' | 'shared' | 'copied' | 'error';

export default function HomepageShareButton() {
  const [state, setState] = useState<ShareState>('idle');

  async function copyShareLink(url: string) {
    await navigator.clipboard.writeText(url);
    trackEvent('education_share_completed', {
      content_id: 'three-credit-report-details',
      share_method: 'copy_link',
    });
    setState('copied');
  }

  async function handleShare() {
    const url = new URL('/#three-details-to-compare', window.location.origin).toString();
    setState('idle');

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url });
        trackEvent('education_share_completed', {
          content_id: 'three-credit-report-details',
          share_method: 'native_share',
        });
        setState('shared');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    try {
      await copyShareLink(url);
    } catch {
      setState('error');
    }
  }

  const completed = state === 'shared' || state === 'copied';

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#b8cec4] bg-white px-4 py-2.5 text-sm font-extrabold text-[#17352d] shadow-sm transition hover:-translate-y-0.5 hover:border-[#7eac98] hover:bg-[#f7fbf9]"
      >
        {completed ? <Check className="size-4 text-[#267a31]" aria-hidden="true" /> : <Share2 className="size-4 text-[#267a31]" aria-hidden="true" />}
        {state === 'shared' ? 'Shared' : state === 'copied' ? 'Link copied' : 'Share this checklist'}
      </button>
      <p className="min-h-5 text-xs leading-5 text-[#617069]" aria-live="polite">
        {state === 'error' ? 'Sharing is unavailable. Copy this page address from your browser.' : 'Shares this public guide only—never report information.'}
      </p>
    </div>
  );
}
