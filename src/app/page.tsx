import React from 'react';
import type { Metadata } from 'next';
import HomepageContent from './homepage/components/HomepageContent';

export const metadata: Metadata = {
  title: 'AI Credit Report Analysis & Dispute Software',
  description:
  'Use AI to read imported credit reports, compare bureau data, flag suspected inconsistencies, and guide human-verified dispute workflows.',
  keywords: [
    'AI credit report analysis',
    'credit report inconsistency detection',
    'credit repair dispute software',
    'credit audit software',
    'credit repair agency software',
  ],
  openGraph: {
    title: 'AI Credit Report Analysis & Dispute Software | FixMy.Money',
    description:
    'Read reports, compare bureaus, flag suspected inconsistencies, and move verified findings into a guided dispute workflow.',
    type: 'website',
    url: 'https://fixmy.money',
    siteName: 'FixMy.Money',
    images: [
    {
      url: '/og-ai-analysis.jpg',
      width: 1731,
      height: 909,
      alt: 'FixMy.Money AI-assisted credit report analysis and dispute workflow'
    }]

  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Credit Report Analysis & Dispute Software | FixMy.Money',
    description:
    'AI-assisted report reading, bureau comparison, inconsistency detection, and human-verified dispute guidance.',
    images: ['/og-ai-analysis.jpg'],
  },
  alternates: {
    canonical: 'https://fixmy.money'
  }
};

export default function HomePage() {
  return <HomepageContent />;
}
