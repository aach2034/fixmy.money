import { PRIVATE_ROUTE_PREFIXES, PUBLIC_SEO_PAGES, SEO_PAGES, canonicalUrl } from './config';

export interface SeoHealthIssue { severity: 'error' | 'warning'; code: string; path: string; message: string; }

export function getSeoHealthReport() {
  const issues: SeoHealthIssue[] = [];
  const titles = new Map<string, string[]>();
  const descriptions = new Map<string, string[]>();

  for (const page of PUBLIC_SEO_PAGES) {
    if (!page.title.trim()) issues.push({ severity: 'error', code: 'missing_title', path: page.path, message: 'SEO title is missing.' });
    if (!page.description.trim()) issues.push({ severity: 'error', code: 'missing_description', path: page.path, message: 'Meta description is missing.' });
    if (canonicalUrl(page.path) !== `${canonicalUrl(page.path).split('?')[0]}`) issues.push({ severity: 'error', code: 'canonical_query', path: page.path, message: 'Canonical URL contains query parameters.' });
    if (PRIVATE_ROUTE_PREFIXES.some(prefix => page.path === prefix || page.path.startsWith(`${prefix}/`))) issues.push({ severity: 'error', code: 'private_indexed', path: page.path, message: 'A private route is configured for indexing.' });
    titles.set(page.title, [...(titles.get(page.title) ?? []), page.path]);
    descriptions.set(page.description, [...(descriptions.get(page.description) ?? []), page.path]);
  }

  for (const [title, paths] of titles) if (paths.length > 1) for (const path of paths) issues.push({ severity: 'warning', code: 'duplicate_title', path, message: `Duplicate title: ${title}` });
  for (const [description, paths] of descriptions) if (paths.length > 1) for (const path of paths) issues.push({ severity: 'warning', code: 'duplicate_description', path, message: `Duplicate description: ${description}` });

  return { generatedAt: new Date().toISOString(), pageCount: Object.keys(SEO_PAGES).length, publicPageCount: PUBLIC_SEO_PAGES.length, errorCount: issues.filter(issue => issue.severity === 'error').length, warningCount: issues.filter(issue => issue.severity === 'warning').length, issues };
}
