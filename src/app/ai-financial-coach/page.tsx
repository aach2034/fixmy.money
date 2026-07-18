import React from 'react';
import type { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import AIFinancialCoachContent from './components/AIFinancialCoachContent';

export const metadata: Metadata = {
  title: 'AI Financial Coach | Credit Repair Guidance',
  description: 'Get personalized financial coaching from our AI assistant. Learn credit repair strategies and business growth tips.',
  keywords: ['AI coach', 'financial coaching', 'credit repair guidance', 'business coaching'],
  openGraph: {
    title: 'AI Financial Coach | Credit Repair Guidance',
    description: 'Get personalized financial coaching from our AI assistant. Learn credit repair strategies and business growth tips.',
    type: 'website',
    url: 'https://fixmy.money/ai-financial-coach',
    siteName: 'Fix My Money',
    images: [
    {
      url: "https://img.rocket.new/generatedImages/rocket_gen_img_10fc9582c-1772339689732.png",
      width: 1200,
      height: 630,
      alt: 'AI Financial Coach'
    }]

  },
  alternates: {
    canonical: 'https://fixmy.money/ai-financial-coach'
  }
};

export default function AIFinancialCoachPage() {
  return (
    <AppLayout>
      <AIFinancialCoachContent />
    </AppLayout>);

}