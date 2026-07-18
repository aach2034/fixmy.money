import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/_next/',
          '/dashboard/',
          '/admin/',
          '/auth/',
          '/sign-up-login-screen/',
          '/workspace-setup/',
          '/onboarding/',
          '/checkout/',
          '/client-portal/dashboard/',
          '/launch-submissions/',
          '/billing-subscriptions/',
          '/client-management/',
          '/workflow-task-management/',
          '/revenue-forecasting/',
          '/financial-health/',
          '/appointments/',
          '/live-chat/',
          '/ai-dispute-analyzer/',
          '/ai-financial-coach/',
          '/dispute-letter-management/',
          '/disputes/',
          '/finance/',
          '/debt-elimination/',
          '/credit-repair-automation/',
          '/settings/',
          '/billing/',
          '/client-pipeline/',
        ],
      },
    ],
    sitemap: 'https://fixmy.money/sitemap.xml',
    host: 'https://fixmy.money',
  };
}