import React from 'react';
import type { Metadata } from 'next';
import HomepageContent from './components/HomepageContent';

export const metadata: Metadata = {
  title: 'FixMy.Money | Credit Repair Software for Modern Agencies',
  description:
  'Credit repair software for modern agencies. Manage clients, dispute workflows, billing, documents, and progress tracking from one organized workspace. FixMy.Money provides business software for credit repair professionals.',
  keywords: [
  'credit repair software',
  'credit repair business software',
  'credit repair agency software',
  'Credit Repair Cloud alternative',
  'credit repair CRM',
  'credit repair dispute software',
  'credit repair client portal',
  'credit repair workflow software'],

  openGraph: {
    title: 'FixMy.Money | Credit Repair Software for Modern Agencies',
    description:
    'Credit repair software for modern agencies. Manage clients, dispute workflows, billing, documents, and progress tracking from one organized workspace.',
    type: 'website',
    url: 'https://fixmy.money',
    siteName: 'FixMy.Money',
    images: [
    {
      url: "https://img.rocket.new/generatedImages/rocket_gen_img_11dbd8980-1781307885069.png",
      width: 1200,
      height: 630,
      alt: 'FixMy.Money - Credit Repair Software for Agencies'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FixMy.Money | Credit Repair Software for Modern Agencies',
    description:
    'Credit repair software for modern agencies. Manage clients, dispute workflows, billing, documents, and progress tracking from one organized workspace.'
  },
  alternates: {
    canonical: 'https://fixmy.money'
  }
};

export default function HomepagePage() {
  return <HomepageContent />;
}