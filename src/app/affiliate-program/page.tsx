import React from 'react';
import type { Metadata } from 'next';
import AffiliateProgramContent from './components/AffiliateProgramContent';

export const metadata: Metadata = {
  title: 'Affiliate Program | Fix My Money',
  description: 'Join the Fix My Money affiliate program. Earn recurring commissions by referring credit repair agencies.',
  keywords: ['affiliate program', 'affiliate', 'referral', 'commission'],
  openGraph: {
    title: 'Affiliate Program | Fix My Money',
    description: 'Join the Fix My Money affiliate program. Earn recurring commissions by referring credit repair agencies.',
    type: 'website',
    url: 'https://fixmy.money/affiliate-program',
    siteName: 'Fix My Money',
    images: [
    {
      url: "https://img.rocket.new/generatedImages/rocket_gen_img_12b439874-1768715397556.png",
      width: 1200,
      height: 630,
      alt: 'Affiliate Program - Fix My Money'
    }]

  },
  alternates: {
    canonical: 'https://fixmy.money/affiliate-program'
  }
};

export default function AffiliateProgramPage() {
  return <AffiliateProgramContent />;
}