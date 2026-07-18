import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap'
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://fixmy.money'),
  title: 'FixMy.Money | Credit Repair Software for Agencies',
  description:
  'FixMy.Money is business software for credit repair professionals. Manage clients, disputes, billing, and compliance. 14-day free trial, no credit card required. Software only—no consumer credit repair services.',
  keywords: [
  'credit repair software',
  'credit repair business software',
  'credit repair CRM',
  'credit repair automation',
  'credit repair client portal',
  'CROA-compliant software',
  'credit dispute software',
  'credit repair agency software'],

  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }]
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://fixmy.money',
    siteName: 'FixMy.Money',
    title: 'FixMy.Money | Credit Repair Software for Agencies',
    description: 'Business software for credit repair professionals. Manage clients, disputes, billing, and compliance. 14-day free trial.',
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
    description: 'Business software for credit repair professionals. Manage clients, disputes, billing, and compliance. 14-day free trial.'
  },
  alternates: {
    canonical: 'https://fixmy.money'
  }
};

export default function RootLayout({
  children
}: Readonly<{children: React.ReactNode;}>) {
  const isProduction = process.env.NEXT_PUBLIC_SITE_URL === 'https://fixmy.money';

  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <head>
        {/* Preconnect to GA origins for faster analytics loading */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'FixMy.Money',
              url: 'https://fixmy.money',
              logo: "https://img.rocket.new/generatedImages/rocket_gen_img_1127282a2-1782158663296.png",
              description: 'Business software for credit repair professionals',
              sameAs: [
              'https://twitter.com/fixmymoney',
              'https://linkedin.com/company/fixmymoney'],

              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Customer Support',
                availableLanguage: 'en'
              }
            })

          }} />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fcreediltflow2597back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.19" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></head>
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
        {isProduction &&
        <>
            <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
            strategy="afterInteractive" />
          
            <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', 'G-XXXXXXXXXX');
                `
            }} />
          
          </>
        }
      </body>
    </html>);

}