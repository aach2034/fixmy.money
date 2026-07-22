import React from 'react';
import type { Metadata } from 'next';
import HomepageContent from './homepage/components/HomepageContent';

export const metadata: Metadata = {
  title: 'Evidence-First Credit Repair Agency Software',
  description:
  'Verify credit-report evidence, prepare authorized disputes, record human approval, and track bureau outcomes in one auditable agency workflow.',
  openGraph: {
    title: 'Evidence-First Credit Repair Agency Software | FixMy.Money',
    description:
    'Turn credit-report evidence into a documented, human-approved agency workflow.',
    type: 'website',
    url: 'https://fixmy.money',
    siteName: 'FixMy.Money',
    images: [
    {
      url: '/og.png',
      width: 1200,
      height: 630,
      alt: 'FixMy.Money evidence-first agency workflow'
    }]

  },
  twitter: {
    card: 'summary_large_image',
    title: 'Evidence-First Credit Repair Agency Software | FixMy.Money',
    description:
    'Turn credit-report evidence into a documented, human-approved agency workflow.',
    images: ['/og.png'],
  },
  alternates: {
    canonical: 'https://fixmy.money'
  }
};

export default function HomePage() {
  return <HomepageContent />;
}
