import React from 'react';
import type { Metadata } from 'next';
import PricingContent from './components/PricingContent';

export const metadata: Metadata = {
  title: 'Pricing | Fix My Money - Credit Repair Software',
  description: 'Simple pricing for credit repair agencies. Starter $49, Professional $129, Agency $249. $1 today for 14 days.',
  keywords: ['pricing', 'plans', 'subscription'],
  openGraph: {
    title: 'Pricing | Fix My Money',
    description: 'Simple, transparent pricing for credit repair agencies. $1 today for 14 days.',
    type: 'website',
    url: 'https://fixmy.money/pricing',
    siteName: 'Fix My Money',
    images: [
    {
      url: 'https://img.rocket.new/generatedImages/rocket_gen_img_1b2e8019a-1768371610847.png',
      width: 1200,
      height: 630,
      alt: 'Pricing - Fix My Money'
    }]

  },
  alternates: {
    canonical: 'https://fixmy.money/pricing'
  }
};

export default function PricingPage() {
  return <PricingContent />;
}
