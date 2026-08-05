import React from 'react';
import type { Metadata } from 'next';
import PricingContent from './components/PricingContent';
import { createSeoMetadata } from '@/lib/seo/config';

export const metadata: Metadata = createSeoMetadata('/pricing');

export default function PricingPage() {
  return <PricingContent />;
}
