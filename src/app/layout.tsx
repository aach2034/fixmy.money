import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import StructuredData from '@/components/seo/StructuredData';
import { createSeoMetadata } from '@/lib/seo/config';
import { globalSchemaGraph } from '@/lib/seo/schema';
import SeoRuntime from '@/components/seo/SeoRuntime';
import SeoInternalLinks from '@/components/seo/SeoInternalLinks';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};

export const metadata: Metadata = {
  ...createSeoMetadata('/'),
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://fixmy.money'),
  title: {
    default: 'Credit Repair Business Software & CRM | FixMy.Money',
    template: '%s | FixMy.Money',
  },
  applicationName: 'FixMy.Money',
  category: 'Business software',
  creator: 'FixMy.Money',
  publisher: 'FixMy.Money',
  formatDetection: { email: false, address: false, telephone: false },

  icons: {
    icon: [{ url: '/assets/images/fixmy-money-mark-v2.png', type: 'image/png', sizes: '1254x1254' }],
    apple: [{ url: '/assets/images/fixmy-money-mark-v2.png', type: 'image/png', sizes: '1254x1254' }],
  },
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

        <StructuredData data={globalSchemaGraph()} />

      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-slate-950 focus:shadow-lg"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <Suspense fallback={null}>
            <GoogleAnalytics />
            <SeoRuntime />
          </Suspense>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <SeoInternalLinks />
          <Toaster />
        </AuthProvider>
      </body>
    </html>);

}
