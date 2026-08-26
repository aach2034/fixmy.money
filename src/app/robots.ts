import { MetadataRoute } from 'next';
import { PRIVATE_ROUTE_PREFIXES, SEO_SITE } from '@/lib/seo/config';

export default function robots(): MetadataRoute.Robots {
  const disallow = PRIVATE_ROUTE_PREFIXES.flatMap(path => [path, `${path}/`]);
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${SEO_SITE.url}/sitemap.xml`,
    host: SEO_SITE.url,
  };
}
