import React from 'react';
import type { Metadata } from 'next';
import CreditRepairCloudAlternativeContent from './components/CreditRepairCloudAlternativeContent';

export const metadata: Metadata = {
  title: 'Credit Repair Cloud Alternative | Better Software for Agencies',
  description:
  'Looking for a Credit Repair Cloud alternative? Fix My Money offers AI-powered disputes, modern dashboard, Stripe billing, and better support. Compare features and pricing.',
  keywords: [
  'credit repair cloud alternative',
  'credit repair cloud vs fixmymoney',
  'best credit repair software',
  'credit repair cloud competitor'],

  openGraph: {
    title: 'Credit Repair Cloud Alternative | Better Software for Agencies',
    description:
    'Looking for a Credit Repair Cloud alternative? Fix My Money offers AI-powered disputes, modern dashboard, Stripe billing, and better support.',
    type: 'website',
    url: 'https://fixmy.money/credit-repair-cloud-alternative',
    siteName: 'Fix My Money',
    images: [
    {
      url: "https://img.rocket.new/generatedImages/rocket_gen_img_1127282a2-1782158663296.png",
      width: 1200,
      height: 630,
      alt: 'Credit Repair Cloud Alternative'
    }]

  },
  alternates: {
    canonical: 'https://fixmy.money/credit-repair-cloud-alternative'
  }
};

export default function CreditRepairCloudAlternativePage() {
  return <CreditRepairCloudAlternativeContent />;
}