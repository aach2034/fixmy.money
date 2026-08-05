import fs from 'node:fs';
import path from 'node:path';
import { getSeoHealthReport, type SeoHealthIssue } from '../src/lib/seo/health';
import { PRIVATE_ROUTE_PREFIXES, PUBLIC_SEO_PAGES, relatedSeoPages } from '../src/lib/seo/config';

const root = process.cwd();
const appRoot = path.join(root, 'src/app');
const issues: SeoHealthIssue[] = [...getSeoHealthReport().issues];

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const sourceFiles = walk(appRoot).filter(file => /\.(tsx|ts)$/.test(file));
const pageFiles = sourceFiles.filter(file => file.endsWith('/page.tsx'));
const routeByFile = new Map(pageFiles.map(file => {
  const relative = path.relative(appRoot, path.dirname(file)).replaceAll(path.sep, '/');
  return [file, relative ? `/${relative}` : '/'];
}));
const existingRoutes = new Set([...routeByFile.values()].filter(route => !route.includes('[')));
const dynamicRoutePatterns = [...routeByFile.values()].filter(route => route.includes('[')).map(route => new RegExp(`^${route.replace(/\[[^/]+\]/g, '[^/]+')}$`));
const linkedRoutes = new Set<string>();
for (const page of PUBLIC_SEO_PAGES) for (const related of relatedSeoPages(page.path)) linkedRoutes.add(related.path);

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/href\s*=\s*["'`]([^"'`?#]+)[^"'`]*["'`]/g)) {
    const href = match[1];
    if (!href.startsWith('/')) continue;
    const normalized = href.length > 1 ? href.replace(/\/$/, '') : '/';
    linkedRoutes.add(normalized);
    if (!existingRoutes.has(normalized) && !dynamicRoutePatterns.some(pattern => pattern.test(normalized)) && !normalized.startsWith('/assets/') && !normalized.startsWith('/api/') && !normalized.includes('${')) {
      issues.push({ severity: 'warning', code: 'broken_internal_link', path: path.relative(root, file), message: `Internal link target does not match a static route: ${normalized}` });
    }
  }
}

for (const [file, route] of routeByFile) {
  if (!PUBLIC_SEO_PAGES.some(page => page.path === route)) continue;
  const directory = path.dirname(file);
  const componentDirectory = path.join(directory, 'components');
  const routeFiles = [file, ...(fs.existsSync(componentDirectory) ? walk(componentDirectory).filter(candidate => /\.(tsx|ts)$/.test(candidate)) : [])];
  if (route === '/') routeFiles.push(...walk(path.join(appRoot, 'homepage')).filter(candidate => /\.(tsx|ts)$/.test(candidate)));
  const routeSource = [...new Set(routeFiles)].map(candidate => fs.readFileSync(candidate, 'utf8')).join('\n');
  const h1Count = (routeSource.match(/<h1(?:\s|>)/g) ?? []).length;
  if (h1Count === 0) issues.push({ severity: 'warning', code: 'missing_h1', path: route, message: 'No H1 was found in the route source.' });
  if (h1Count > 1) issues.push({ severity: 'warning', code: 'multiple_h1', path: route, message: `${h1Count} H1 elements were found in the route source.` });
  const imageTags = routeSource.match(/<(?:img|Image)\b[^>]*>/g) ?? [];
  if (imageTags.some(tag => !/\balt\s*=/.test(tag))) issues.push({ severity: 'warning', code: 'missing_image_alt', path: route, message: 'At least one image component has no alt attribute.' });
  if (/robots\s*:\s*\{[\s\S]*?index\s*:\s*false/.test(routeSource)) issues.push({ severity: 'error', code: 'public_noindex', path: route, message: 'A configured public page contains a noindex directive.' });
}

for (const page of PUBLIC_SEO_PAGES) {
  if (page.path !== '/' && !linkedRoutes.has(page.path)) issues.push({ severity: 'warning', code: 'orphaned_page', path: page.path, message: 'No static internal link to this public route was found.' });
}

for (const route of existingRoutes) {
  if (PRIVATE_ROUTE_PREFIXES.some(prefix => route === prefix || route.startsWith(`${prefix}/`)) && PUBLIC_SEO_PAGES.some(page => page.path === route)) issues.push({ severity: 'error', code: 'private_indexed', path: route, message: 'A private application route is present in the public SEO registry.' });
}

const report = { generatedAt: new Date().toISOString(), scannedPageCount: pageFiles.length, publicPageCount: PUBLIC_SEO_PAGES.length, errorCount: issues.filter(issue => issue.severity === 'error').length, warningCount: issues.filter(issue => issue.severity === 'warning').length, issues };
const reportDirectory = path.join(root, 'reports');
fs.mkdirSync(reportDirectory, { recursive: true });
fs.writeFileSync(path.join(reportDirectory, 'seo-health.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`SEO health: ${report.publicPageCount} public pages, ${report.errorCount} errors, ${report.warningCount} warnings`);
if (report.errorCount > 0) process.exitCode = 1;
