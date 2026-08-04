import { MetadataRoute } from 'next';
import { getAllSlugs } from '@/lib/blog/articles';

const BASE_URL = 'https://fixmy.money';

export default function sitemap(): MetadataRoute.Sitemap {
  // Use the actual content revision date; changing this on every build sends a
  // misleading freshness signal to crawlers.
  const now = new Date('2026-07-18T00:00:00.000Z');

  const staticPages: MetadataRoute.Sitemap = [
    // Homepage
    { url: BASE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    
    // Main SEO Landing Pages
    { url: `${BASE_URL}/credit-repair-software`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${BASE_URL}/credit-repair-business-software`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${BASE_URL}/credit-repair-crm`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/credit-repair-dispute-software`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/credit-repair-dispute-letter-software`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/credit-repair-client-portal`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/credit-repair-billing-software`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/credit-repair-stripe-billing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/credit-repair-agency-dashboard`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/credit-repair-automation`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/credit-repair-audit-log`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/credit-repair-white-label-client-portal`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/credit-repair-software-for-small-agencies`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/credit-repair-software-with-client-login`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/credit-repair-cloud-alternative`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${BASE_URL}/best-credit-repair-software`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/croa-compliance-credit-repair-software`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/how-to-start-a-credit-repair-business`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    
    // Free Resource Pages
    { url: `${BASE_URL}/free-credit-repair-business-starter-kit`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/credit-repair-business-startup-checklist`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/resources`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    
    // Tool Pages
    { url: `${BASE_URL}/tools/credit-repair-business-startup-cost-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tools/credit-repair-pricing-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tools/credit-repair-client-intake-checklist`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tools/croa-compliance-checklist`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    
    // Partners Page
    { url: `${BASE_URL}/partners`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    
    // Main Pages
    { url: `${BASE_URL}/product-tour`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/demo`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    // Legal Pages
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/refund-policy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/cancellation-policy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/security`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/compliance`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  // Blog article pages — generated from the canonical articles list
  const blogPages: MetadataRoute.Sitemap = getAllSlugs()
    .filter((slug) => slug && slug !== ':slug' && slug !== '[slug]')
    .map((slug) => ({
      url: `${BASE_URL}/blog/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    }));

  return [...staticPages, ...blogPages];
}
