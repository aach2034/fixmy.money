import { MetadataRoute } from 'next';
import { PRIVATE_ROUTE_PREFIXES, SEO_SITE } from '@/lib/seo/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_ROUTE_PREFIXES.map(path => `${path}/`),
      },
    ],
    sitemap: `${SEO_SITE.url}/sitemap.xml`,
    host: SEO_SITE.url,
  };
}
