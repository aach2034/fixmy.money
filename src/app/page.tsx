import React from 'react';
import type { Metadata } from 'next';
import HomepageContent from './homepage/components/HomepageContent';

export const metadata: Metadata = {
  title: 'AI Credit Repair Software & Dispute Tools',
  description:
  'AI credit repair software that organizes credit reports, surfaces cross-bureau inconsistencies, and creates editable, evidence-linked dispute drafts.',
  keywords: [
    'AI credit report analysis',
    'credit report inconsistency detection',
    'credit repair dispute software',
    'credit audit software',
    'credit repair agency software',
    'AI dispute letter generator',
    'credit repair software for individuals',
  ],
  openGraph: {
    title: 'AI Credit Repair Software & Dispute Tools | FixMy.Money',
    description:
    'Turn uploaded credit reports into organized review candidates and editable, evidence-linked dispute drafts with AI assistance.',
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
    title: 'AI Credit Repair Software & Dispute Tools | FixMy.Money',
    description:
    'Organize reports, surface cross-bureau inconsistencies, and create editable dispute drafts with AI assistance.',
    images: ['/og-ai-analysis.jpg'],
  },
  alternates: {
    canonical: 'https://fixmy.money'
  }
};

export default function HomePage() {
  return <HomepageContent />;
}
