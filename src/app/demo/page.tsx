import React from 'react';
import type { Metadata } from 'next';
import DemoContent from './components/DemoContent';

export const metadata: Metadata = {
  title: 'Demo | Fix My Money - See It In Action',
  description: 'Schedule a demo of Fix My Money. See how our credit repair software works and how it can help your agency.',
  keywords: ['demo', 'product demo', 'schedule demo'],
  openGraph: {
    title: 'Demo | Fix My Money',
    description: 'Schedule a demo of Fix My Money. See how our credit repair software works.',
    type: 'website',
    url: 'https://fixmy.money/demo',
    siteName: 'Fix My Money',
    images: [
    {
      url: "https://img.rocket.new/generatedImages/rocket_gen_img_10d904fe9-1771892181441.png",
      width: 1200,
      height: 630,
      alt: 'Demo - Fix My Money'
    }]

  },
  alternates: {
    canonical: 'https://fixmy.money/demo'
  }
};

export default function DemoPage() {
  return <DemoContent />;
}