import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import GoogleAnalytics from '@/components/GoogleAnalytics';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://fixmy.money'),
  title: {
    default: 'AI Credit Repair Software & Dispute Tools | FixMy.Money',
    template: '%s | FixMy.Money',
  },
  description:
    'AI credit repair software that organizes credit reports, surfaces cross-bureau inconsistencies, and creates editable, evidence-linked dispute drafts.',
  applicationName: 'FixMy.Money',
  category: 'Business software',
  creator: 'FixMy.Money',
  publisher: 'FixMy.Money',
  alternates: { canonical: '/' },
  formatDetection: { email: false, address: false, telephone: false },
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
    icon: [{ url: '/assets/images/fixmy-money-mark-v2.png', type: 'image/png', sizes: '1254x1254' }],
    apple: [{ url: '/assets/images/fixmy-money-mark-v2.png', type: 'image/png', sizes: '1254x1254' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://fixmy.money',
    siteName: 'FixMy.Money',
    title: 'AI Credit Repair Software & Dispute Tools | FixMy.Money',
    description: 'Turn uploaded credit reports into organized review candidates and editable, evidence-linked dispute drafts with AI assistance.',
    images: [
    {
      url: '/og-ai-analysis.jpg',
      width: 1731,
      height: 909,
      alt: 'FixMy.Money AI-assisted credit report analysis and dispute workflow'
    }]

  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Credit Repair Software & Dispute Tools | FixMy.Money',
    description: 'Organize reports, surface cross-bureau inconsistencies, and create editable dispute drafts with AI assistance.',
    images: ['/og-ai-analysis.jpg'],
  }
};

export default function RootLayout({
  children
}: Readonly<{children: React.ReactNode;}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to GA origins for faster analytics loading */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />

        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-8MPF8KLDVG"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-8MPF8KLDVG', { send_page_view: false });`,
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
                    url: 'https://fixmy.money/assets/images/fixmy-money-mark-v2.png',
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

      </head>
      <body>
        <AuthProvider>
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>);

}
