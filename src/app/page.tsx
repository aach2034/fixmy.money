import React from 'react';
import type { Metadata } from 'next';
import HomepageContent from './homepage/components/HomepageContent';
import { createSeoMetadata } from '@/lib/seo/config';

export const metadata: Metadata = createSeoMetadata('/');

export default function HomePage() {
  return <HomepageContent />;
}
