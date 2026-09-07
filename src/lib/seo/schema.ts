import { SEO_SITE, SEO_PAGES, breadcrumbItems, canonicalUrl } from './config';
import { CHECKOUT_PLANS, TRIAL_CONFIG } from '@/lib/stripe/plans';

export function organizationSchema() {
  return { '@type': 'Organization', '@id': `${SEO_SITE.url}/#organization`, name: SEO_SITE.name, url: `${SEO_SITE.url}/`, logo: { '@type': 'ImageObject', url: canonicalUrl(SEO_SITE.logo) }, description: SEO_SITE.description };
}

export function softwareSchema() {
  return {
    '@type': ['SoftwareApplication', 'Product'], '@id': `${SEO_SITE.url}/#software`, name: SEO_SITE.name,
    applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: `${SEO_SITE.url}/`, description: SEO_SITE.description,
    brand: { '@id': `${SEO_SITE.url}/#organization` },
    offers: CHECKOUT_PLANS.map(plan => ({ '@type': 'Offer', name: plan.name, price: plan.monthlyPrice, priceCurrency: 'USD', url: canonicalUrl(`/checkout?plan=${plan.id}`), description: `$${TRIAL_CONFIG.chargeCents / 100} paid trial for ${TRIAL_CONFIG.durationDays} days, then $${plan.monthlyPrice} per month.` })),
  };
}

export function breadcrumbSchema(path: string) {
  return { '@type': 'BreadcrumbList', itemListElement: breadcrumbItems(path).map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url })) };
}

export function faqSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };
}

export function pageSchema(path: string) {
  const page = SEO_PAGES[path];
  if (!page) return null;
  return { '@type': page.type === 'article' ? 'Article' : 'WebPage', '@id': `${canonicalUrl(path)}#page`, url: canonicalUrl(path), name: page.title, description: page.description, isPartOf: { '@id': `${SEO_SITE.url}/#website` }, breadcrumb: { '@id': `${canonicalUrl(path)}#breadcrumb` }, ...(page.type === 'article' ? { datePublished: page.publishedAt ?? page.updatedAt, dateModified: page.updatedAt, publisher: { '@id': `${SEO_SITE.url}/#organization` } } : {}) };
}

export function globalSchemaGraph() {
  return { '@context': 'https://schema.org', '@graph': [organizationSchema(), { '@type': 'WebSite', '@id': `${SEO_SITE.url}/#website`, url: `${SEO_SITE.url}/`, name: SEO_SITE.name, publisher: { '@id': `${SEO_SITE.url}/#organization` }, inLanguage: 'en-US' }, softwareSchema()] };
}

export function routeSchemaGraph(path: string) {
  const page = pageSchema(path);
  return { '@context': 'https://schema.org', '@graph': [breadcrumbSchema(path), ...(page ? [page] : [])] };
}
