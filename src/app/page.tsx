import React from 'react';
import type { Metadata } from 'next';
import HomepageContent from './homepage/components/HomepageContent';

export const metadata: Metadata = {
  title: 'FixMy.Money | Credit Repair Software for Agencies',
  description:
  'Business software for credit repair professionals. Manage clients, disputes, billing, and compliance. AI-assisted drafts, client portals, Stripe billing. 14-day free trial, no credit card required.',
  keywords: [
  'credit repair software',
  'credit repair business software',
  'credit repair CRM',
  'credit repair automation',
  'credit repair client portal',
  'CROA-compliant software',
  'credit dispute software',
  'credit repair agency software'],

  openGraph: {
    title: 'FixMy.Money | Credit Repair Software for Agencies',
    description:
    'Business software for credit repair professionals. Manage clients, disputes, billing, and compliance. 14-day free trial.',
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
    title: 'FixMy.Money | Credit Repair Software for Agencies',
    description:
    'Business software for credit repair professionals. Manage clients, disputes, billing, and compliance. 14-day free trial.'
  },
  alternates: {
    canonical: 'https://fixmy.money'
  }
};

export default function HomePage() {
  return <HomepageContent />;
}