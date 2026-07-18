import React from 'react';
import type { Metadata } from 'next';
import HomepageContent from './homepage/components/HomepageContent';

export const metadata: Metadata = {
  title: 'Credit Repair Software for Agencies',
  description:
  'Business software for credit repair professionals. Manage clients, disputes, billing, and compliance. AI-assisted drafts, client portals, Stripe billing. $1 for 14 days.',
  openGraph: {
    title: 'Credit Repair Software for Agencies | FixMy.Money',
    description:
    'Business software for credit repair professionals. Manage clients, disputes, billing, and compliance. $1 for 14 days.',
    type: 'website',
    url: 'https://fixmy.money',
    siteName: 'FixMy.Money',
    images: [
    {
      url: '/og.png',
      width: 1200,
      height: 630,
      alt: 'FixMy.Money - Credit Repair Software for Agencies'
    }]

  },
  twitter: {
    card: 'summary_large_image',
    title: 'Credit Repair Software for Agencies | FixMy.Money',
    description:
    'Business software for credit repair professionals. Manage clients, disputes, billing, and compliance. $1 for 14 days.',
    images: ['/og.png'],
  },
  alternates: {
    canonical: 'https://fixmy.money'
  }
};

export default function HomePage() {
  return <HomepageContent />;
}
