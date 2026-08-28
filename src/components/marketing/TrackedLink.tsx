'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { appendAttributionToHref, captureCurrentAttribution } from '@/lib/attribution';
import { trackCtaClick, trackEvent } from '@/lib/analytics';

type TrackedLinkProps = ComponentProps<typeof Link> & {
  eventLabel: string;
  eventLocation: string;
};

export default function TrackedLink({
  href,
  eventLabel,
  eventLocation,
  onClick,
  ...props
}: TrackedLinkProps) {
  const resolvedHref = typeof href === 'string' ? appendAttributionToHref(href) : href;

  return (
    <Link
      href={resolvedHref}
      onClick={(event) => {
        captureCurrentAttribution();
        trackCtaClick(eventLabel, typeof resolvedHref === 'string' ? resolvedHref : String(href), eventLocation);
        if (eventLocation.includes('affiliate') || eventLocation.includes('creator')) {
          trackEvent('affiliate_referral', { cta_location: eventLocation });
        }
        if (eventLocation.includes('professional')) {
          trackEvent('professional_lead', { cta_location: eventLocation });
        }
        if (eventLocation.includes('mortgage')) {
          trackEvent('mortgage_partner_lead', { cta_location: eventLocation });
        }
        onClick?.(event);
      }}
      {...props}
    />
  );
}
