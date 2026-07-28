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
  title: 'AI Credit Report Analysis & Dispute Software | FixMy.Money',
  description:
    'Use AI to read imported credit reports, compare bureau data, flag suspected inconsistencies, and guide human-verified dispute workflows.',
  applicationName: 'FixMy.Money',
  category: 'Business software',
  creator: 'FixMy.Money',
  publisher: 'FixMy.Money',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },

  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }]
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://fixmy.money',
    siteName: 'FixMy.Money',
    title: 'AI Credit Report Analysis & Dispute Software | FixMy.Money',
    description: 'Read reports, compare bureaus, flag suspected inconsistencies, and move verified findings into a guided dispute workflow.',
    images: [
    {
      url: '/og-ai-analysis.png',
      width: 1731,
      height: 909,
      alt: 'FixMy.Money AI-assisted credit report analysis and dispute workflow'
    }]

  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Credit Report Analysis & Dispute Software | FixMy.Money',
    description: 'AI-assisted report reading, bureau comparison, inconsistency detection, and human-verified dispute guidance.',
    images: ['/og-ai-analysis.png'],
  }
};

export default function RootLayout({
  children
}: Readonly<{children: React.ReactNode;}>) {
  const isProduction = process.env.NEXT_PUBLIC_SITE_URL === 'https://fixmy.money';
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <head>
        {/* Preconnect to GA origins for faster analytics loading */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />

        <Script
          id="google-tag-manager"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PQQ9V4XT');`,
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://fixmy.money/#organization',
                  name: 'FixMy.Money',
                  url: 'https://fixmy.money/',
                  logo: {
                    '@type': 'ImageObject',
                    url: 'https://fixmy.money/assets/images/fix_my_money_logo-1780535345534.png',
                  },
                  description: 'Business software for credit repair professionals and agencies.',
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://fixmy.money/#website',
                  url: 'https://fixmy.money/',
                  name: 'FixMy.Money',
                  publisher: { '@id': 'https://fixmy.money/#organization' },
                  inLanguage: 'en-US',
                },
              ],
            })

          }} />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fcreediltflow2597back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.19" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PQQ9V4XT"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
        {isProduction && gaMeasurementId &&
        <>
            <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive" />
          
            <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaMeasurementId}');
                `
            }} />
          
          </>
        }
      </body>
    </html>);

}
