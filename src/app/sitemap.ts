import { MetadataRoute } from 'next';
import { getAllSlugs } from '@/lib/blog/articles';
import { canonicalUrl, PUBLIC_SEO_PAGES } from '@/lib/seo/config';

export default function sitemap(): MetadataRoute.Sitemap {
  // Use the actual content revision date; changing this on every build sends a
  // misleading freshness signal to crawlers.
  const now = new Date('2026-08-04T00:00:00.000Z');

  const staticPages: MetadataRoute.Sitemap = PUBLIC_SEO_PAGES.map(page => ({
    url: canonicalUrl(page.path),
    lastModified: new Date(page.updatedAt || now),
    changeFrequency: page.changeFrequency ?? 'monthly',
    priority: page.priority ?? 0.7,
  }));

  // Blog article pages — generated from the canonical articles list
  const blogPages: MetadataRoute.Sitemap = getAllSlugs()
    .filter((slug) => slug && slug !== ':slug' && slug !== '[slug]')
    .map((slug) => ({
      url: canonicalUrl(`/blog/${slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    }));

  return [...staticPages, ...blogPages];
}
