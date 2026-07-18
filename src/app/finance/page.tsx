import React from 'react';
import type { Metadata } from 'next';
import FinanceContent from './components/FinanceContent';

export const metadata: Metadata = {
  title: 'FixMy.Finance | Credit Education & Financial Resources Powered by FixMy.Money',
  description:
    'Free credit repair education, business finance articles, and financial tools. Powered by FixMy.Money — the AI credit repair software for professionals.',
  keywords: [
    'credit repair education',
    'credit repair tips',
    'how to start a credit repair business',
    'credit dispute guide',
    'credit score improvement',
    'financial education',
    'credit repair compliance',
    'CROA guide',
    'FCRA explained',
  ],
  openGraph: {
    title: 'FixMy.Finance | Credit Education & Financial Resources',
    description:
      'Free credit repair education, business finance articles, and financial tools. Powered by FixMy.Money.',
    type: 'website',
    url: 'https://fixmy.money/finance',
    siteName: 'FixMy.Finance',
  },
  alternates: {
    canonical: 'https://fixmy.money/finance',
  },
};

export default function FinancePage() {
  return <FinanceContent />;
}
