import type { Metadata } from 'next';

export const SEO_SITE = {
  name: 'FixMy.Money',
  url: 'https://fixmy.money',
  description: 'Credit-repair business software for professionals and agencies to manage clients, credit reports, disputes, billing, and documented workflows.',
  logo: '/assets/images/fixmy-money-mark-v2.png',
  ogImage: '/og-ai-analysis.jpg',
} as const;

export type SeoContentType = 'website' | 'product' | 'article' | 'tool' | 'legal';
export type IndexStatus = 'index' | 'noindex';

export interface SeoPageConfig {
  path: string;
  title: string;
  description: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  type?: SeoContentType;
  indexStatus?: IndexStatus;
  publishedAt?: string;
  updatedAt: string;
  parent?: string;
  priority?: number;
  changeFrequency?: 'weekly' | 'monthly' | 'yearly';
}

const UPDATED_AT = '2026-08-05';

const pages: SeoPageConfig[] = [
  { path: '/', title: 'Credit Repair Business Software & CRM', description: 'FixMy.Money helps credit-repair professionals manage clients, import credit reports, organize dispute workflows, create editable letters, and track agency operations.', primaryKeyword: 'credit repair software', secondaryKeywords: ['credit repair business software', 'credit repair CRM'], type: 'product', updatedAt: UPDATED_AT, priority: 1, changeFrequency: 'weekly' },
  { path: '/product-tour', title: 'Credit Repair Software Features', description: 'Explore FixMy.Money tools for credit report imports, client management, dispute workflows, editable letters, billing, and agency operations.', primaryKeyword: 'credit repair software features', secondaryKeywords: ['credit repair automation', 'credit repair client management'], type: 'product', updatedAt: UPDATED_AT, priority: .9 },
  { path: '/pricing', title: 'Credit Repair Software Pricing', description: 'Compare FixMy.Money plans for credit-repair businesses: Personal $39, Start $99, and Grow $199, with a $1 paid trial for 14 days.', primaryKeyword: 'credit repair software pricing', secondaryKeywords: ['credit repair business software pricing'], type: 'product', updatedAt: UPDATED_AT, priority: .9 },
  { path: '/credit-repair-software', title: 'Credit Repair Software for Professionals', description: 'Manage credit reports, clients, evidence, dispute drafts, and agency workflows in one credit repair business software platform.', primaryKeyword: 'credit repair software', secondaryKeywords: ['credit repair business software', 'credit dispute software'], type: 'product', updatedAt: UPDATED_AT, priority: .95 },
  { path: '/credit-repair-business-software', title: 'Credit Repair Business Software', description: 'Run client intake, report review, dispute workflows, document organization, billing, and team operations with FixMy.Money.', primaryKeyword: 'credit repair business software', secondaryKeywords: ['credit repair CRM', 'credit repair automation'], type: 'product', updatedAt: UPDATED_AT, priority: .95 },
  { path: '/credit-repair-crm', title: 'Credit Repair CRM & Client Management', description: 'Organize client records, tasks, communications, report reviews, and dispute activity with credit repair CRM software built for agencies.', primaryKeyword: 'credit repair CRM', secondaryKeywords: ['credit repair client management'], type: 'product', updatedAt: UPDATED_AT, priority: .9 },
  { path: '/credit-repair-dispute-software', title: 'Credit Dispute Software for Agencies', description: 'Organize evidence, review report data, create editable dispute drafts, and document each round with credit dispute software for professionals.', primaryKeyword: 'credit dispute software', secondaryKeywords: ['credit repair automation', 'credit repair letter software'], type: 'product', updatedAt: UPDATED_AT, priority: .9 },
  { path: '/credit-repair-dispute-letter-software', title: 'Credit Repair Letter Software', description: 'Create, edit, review, and organize evidence-linked dispute letters inside a documented credit-repair agency workflow.', primaryKeyword: 'credit repair letter software', secondaryKeywords: ['credit dispute software'], type: 'product', updatedAt: UPDATED_AT, priority: .9 },
  { path: '/credit-repair-automation', title: 'Credit Repair Automation Software', description: 'Automate repeatable credit-repair administration while keeping evidence review, approvals, and client-specific decisions visible.', primaryKeyword: 'credit repair automation', secondaryKeywords: ['credit dispute software'], type: 'product', updatedAt: UPDATED_AT, priority: .9 },
  { path: '/croa-workflow', title: 'CROA Workflow Software', description: 'Support documented CROA-aware workflows for agreements, service timing, client records, approvals, and agency operations.', primaryKeyword: 'CROA workflow software', secondaryKeywords: ['credit repair compliance software'], type: 'product', updatedAt: UPDATED_AT, priority: .85 },
  { path: '/croa-compliance-credit-repair-software', title: 'CROA Compliance Workflow Software', description: 'Learn how credit-repair business software can support documented CROA workflows without replacing professional legal advice.', primaryKeyword: 'CROA workflow software', secondaryKeywords: ['credit repair compliance software'], type: 'product', updatedAt: UPDATED_AT, priority: .85 },
  { path: '/credit-repair-audit-log', title: 'Credit Repair Audit Log Software', description: 'See how activity history helps agencies document client, dispute, letter, billing, and team workflow events.', primaryKeyword: 'credit repair audit log', secondaryKeywords: ['credit repair business software'], type: 'product', updatedAt: UPDATED_AT, priority: .85 },
  { path: '/credit-repair-white-label-client-portal', title: 'White-Label Credit Repair Client Portal', description: 'Give clients a branded place to review progress and information with white-label credit repair software features for agencies.', primaryKeyword: 'white-label credit repair software', secondaryKeywords: ['credit repair client portal'], type: 'product', updatedAt: UPDATED_AT, priority: .85 },
  { path: '/credit-repair-client-portal', title: 'Credit Repair Client Portal Software', description: 'Provide clients with secure access to relevant progress, documents, and workflow information through a credit repair client portal.', primaryKeyword: 'credit repair client portal', secondaryKeywords: ['credit repair client management'], type: 'product', updatedAt: UPDATED_AT, priority: .85 },
  { path: '/credit-repair-billing-software', title: 'Credit Repair Billing Software', description: 'Connect billing activity with client and agency workflows using credit repair business software built for service operations.', primaryKeyword: 'credit repair billing software', secondaryKeywords: ['credit repair business software'], type: 'product', updatedAt: UPDATED_AT, priority: .8 },
  { path: '/credit-repair-stripe-billing', title: 'Stripe Billing for Credit Repair Businesses', description: 'Use Stripe-powered subscription and payment workflows alongside client management in FixMy.Money.', primaryKeyword: 'credit repair Stripe billing', secondaryKeywords: ['credit repair billing software'], type: 'product', updatedAt: UPDATED_AT, priority: .8 },
  { path: '/credit-repair-agency-dashboard', title: 'Credit Repair Agency Dashboard', description: 'View clients, tasks, reports, dispute activity, billing, and operational work from one credit repair agency dashboard.', primaryKeyword: 'credit repair agency dashboard', secondaryKeywords: ['credit repair CRM'], type: 'product', updatedAt: UPDATED_AT, priority: .85 },
  { path: '/credit-repair-software-for-small-agencies', title: 'Credit Repair Software for Small Agencies', description: 'Manage clients, reports, dispute work, documents, and billing with credit repair software designed for growing agencies.', primaryKeyword: 'credit repair software for small agencies', secondaryKeywords: ['credit repair business software'], type: 'product', updatedAt: UPDATED_AT, priority: .85 },
  { path: '/credit-repair-software-with-client-login', title: 'Credit Repair Software With Client Login', description: 'Combine agency workflows with a client login for sharing relevant progress, documents, and account information.', primaryKeyword: 'credit repair software with client login', secondaryKeywords: ['credit repair client portal'], type: 'product', updatedAt: UPDATED_AT, priority: .85 },
  { path: '/credit-repair-cloud-alternative', title: 'Credit Repair Cloud Alternative', description: 'Compare the workflow capabilities agencies should evaluate when choosing a Credit Repair Cloud alternative.', primaryKeyword: 'Credit Repair Cloud alternative', secondaryKeywords: ['credit repair software comparison'], type: 'product', updatedAt: UPDATED_AT, priority: .85 },
  { path: '/best-credit-repair-software', title: 'How to Choose Credit Repair Software', description: 'Compare practical criteria for credit repair software, including report imports, CRM, dispute workflows, client access, billing, and audit history.', primaryKeyword: 'best credit repair software', secondaryKeywords: ['credit repair software comparison'], type: 'article', updatedAt: UPDATED_AT, priority: .85 },
  { path: '/resources', title: 'Credit Repair Business Guides & Tools', description: 'Browse practical guides, checklists, and free tools for starting and operating a credit-repair business.', primaryKeyword: 'credit repair business guides', secondaryKeywords: ['credit repair business tools'], type: 'website', updatedAt: UPDATED_AT, priority: .8 },
  { path: '/blog', title: 'Credit Repair Business Software Blog', description: 'Practical articles on credit repair software, agency workflows, client management, automation, documentation, and operations.', primaryKeyword: 'credit repair software blog', secondaryKeywords: ['credit repair business guides'], type: 'website', updatedAt: UPDATED_AT, priority: .8, changeFrequency: 'weekly' },
  { path: '/how-to-start-a-credit-repair-business', title: 'How to Start a Credit Repair Business', description: 'A practical guide to planning a credit-repair business, including operations, software, documentation, pricing, and compliance considerations.', primaryKeyword: 'how to start a credit repair business', secondaryKeywords: ['credit repair business software'], type: 'article', updatedAt: UPDATED_AT, priority: .8 },
  { path: '/credit-repair-business-startup-checklist', title: 'Credit Repair Business Startup Checklist', description: 'Use this startup checklist to plan your credit-repair business operations, software, documentation, service workflow, and client experience.', primaryKeyword: 'credit repair business startup checklist', type: 'tool', updatedAt: UPDATED_AT, priority: .75 },
  { path: '/free-credit-repair-business-starter-kit', title: 'Free Credit Repair Business Starter Kit', description: 'Get a practical starter kit for planning credit-repair business operations, client workflows, documentation, and software needs.', primaryKeyword: 'credit repair business starter kit', type: 'tool', updatedAt: UPDATED_AT, priority: .75 },
  { path: '/tools/credit-repair-business-startup-cost-calculator', title: 'Credit Repair Business Startup Cost Calculator', description: 'Estimate common startup costs for a credit-repair business with an editable planning calculator.', primaryKeyword: 'credit repair business startup cost calculator', type: 'tool', updatedAt: UPDATED_AT, parent: '/resources', priority: .75 },
  { path: '/tools/credit-repair-pricing-calculator', title: 'Credit Repair Service Pricing Calculator', description: 'Model credit-repair service pricing using your estimated costs, workload, and business assumptions.', primaryKeyword: 'credit repair pricing calculator', type: 'tool', updatedAt: UPDATED_AT, parent: '/resources', priority: .75 },
  { path: '/tools/credit-repair-client-intake-checklist', title: 'Credit Repair Client Intake Checklist', description: 'Use a practical client intake checklist to organize identity, report, agreement, authorization, and onboarding information.', primaryKeyword: 'credit repair client intake checklist', type: 'tool', updatedAt: UPDATED_AT, parent: '/resources', priority: .75 },
  { path: '/tools/croa-compliance-checklist', title: 'CROA Workflow Checklist', description: 'Review operational CROA workflow considerations for agreements, disclosures, service timing, records, and billing. Not legal advice.', primaryKeyword: 'CROA compliance checklist', type: 'tool', updatedAt: UPDATED_AT, parent: '/resources', priority: .75 },
  { path: '/security', title: 'FixMy.Money Security', description: 'Learn about the security practices and data-handling controls described for the FixMy.Money business software platform.', primaryKeyword: 'credit repair software security', type: 'website', updatedAt: UPDATED_AT, priority: .6 },
  { path: '/compliance', title: 'Credit Repair Software Compliance Workflows', description: 'Learn how FixMy.Money supports documented business workflows while leaving legal decisions and professional responsibility with the agency.', primaryKeyword: 'credit repair compliance software', type: 'website', updatedAt: UPDATED_AT, priority: .65 },
  { path: '/about', title: 'About FixMy.Money', description: 'Learn about FixMy.Money, business software built for credit-repair professionals, agencies, entrepreneurs, and financial service businesses.', primaryKeyword: 'FixMy.Money', type: 'website', updatedAt: UPDATED_AT, priority: .6 },
  { path: '/contact', title: 'Contact FixMy.Money', description: 'Contact the FixMy.Money team with questions about credit-repair business software, product capabilities, pricing, or support.', primaryKeyword: 'FixMy.Money contact', type: 'website', updatedAt: UPDATED_AT, priority: .6 },
  { path: '/demo', title: 'FixMy.Money Product Demo', description: 'Explore a product demonstration of FixMy.Money credit-repair business software for professionals and agencies.', primaryKeyword: 'credit repair software demo', type: 'product', updatedAt: UPDATED_AT, priority: .7 },
  { path: '/partners', title: 'FixMy.Money Partners', description: 'Learn about partnership opportunities connected to FixMy.Money credit-repair business software.', primaryKeyword: 'credit repair software partners', type: 'website', updatedAt: UPDATED_AT, priority: .6 },
  { path: '/terms', title: 'Terms of Service', description: 'Read the FixMy.Money terms of service for use of the software platform.', primaryKeyword: 'FixMy.Money terms', type: 'legal', updatedAt: UPDATED_AT, priority: .3, changeFrequency: 'yearly' },
  { path: '/privacy', title: 'Privacy Policy', description: 'Read the FixMy.Money privacy policy and information about data handling.', primaryKeyword: 'FixMy.Money privacy', type: 'legal', updatedAt: UPDATED_AT, priority: .3, changeFrequency: 'yearly' },
  { path: '/refund-policy', title: 'Refund Policy', description: 'Read the FixMy.Money refund policy for software purchases and subscriptions.', primaryKeyword: 'FixMy.Money refund policy', type: 'legal', updatedAt: UPDATED_AT, priority: .25, changeFrequency: 'yearly' },
  { path: '/cancellation-policy', title: 'Cancellation Policy', description: 'Read the FixMy.Money subscription cancellation policy.', primaryKeyword: 'FixMy.Money cancellation policy', type: 'legal', updatedAt: UPDATED_AT, priority: .25, changeFrequency: 'yearly' },
];

export const SEO_PAGES = Object.freeze(Object.fromEntries(pages.map(page => [page.path, page]))) as Readonly<Record<string, SeoPageConfig>>;
export const PUBLIC_SEO_PAGES = Object.freeze(pages.filter(page => page.indexStatus !== 'noindex'));

export const PRIVATE_ROUTE_PREFIXES = Object.freeze([
  '/admin', '/api', '/auth', '/checkout', '/dashboard', '/clients', '/client-portal/dashboard',
  '/client-portal/login', '/demo-mode', '/disputes', '/dispute-wizard', '/onboarding', '/settings',
  '/workspace-setup', '/login', '/signup', '/forgot-password', '/sign-up-login-screen',
  '/appointments', '/billing-subscriptions', '/client-management', '/client-pipeline', '/debt-elimination',
  '/dispute-letter-management', '/finance', '/financial-health', '/launch-submissions', '/live-chat',
  '/notifications', '/revenue-forecasting', '/workflow-task-management', '/credit-report-import',
]);

export function canonicalUrl(path: string) {
  const clean = path === '/' ? '' : `/${path.replace(/^\/+|\/+$/g, '')}`;
  return `${SEO_SITE.url}${clean}`;
}

export function createSeoMetadata(path: string, overrides: Partial<SeoPageConfig> = {}): Metadata {
  const base = SEO_PAGES[path];
  if (!base) throw new Error(`Missing SEO configuration for ${path}`);
  const page = { ...base, ...overrides };
  const canonical = canonicalUrl(page.path);
  const title = `${page.title} | ${SEO_SITE.name}`;
  return {
    title: page.title,
    description: page.description,
    keywords: [page.primaryKeyword, ...(page.secondaryKeywords ?? [])],
    alternates: { canonical },
    robots: page.indexStatus === 'noindex' ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { title, description: page.description, url: canonical, siteName: SEO_SITE.name, type: page.type === 'article' ? 'article' : 'website', images: [{ url: SEO_SITE.ogImage, width: 1731, height: 909, alt: `${SEO_SITE.name} credit repair business software` }] },
    twitter: { card: 'summary_large_image', title, description: page.description, images: [SEO_SITE.ogImage] },
  };
}

export function breadcrumbItems(path: string) {
  const page = SEO_PAGES[path];
  if (!page || path === '/') return [{ name: 'Home', url: SEO_SITE.url }];
  const items: Array<{ name: string; url: string }> = [{ name: 'Home', url: SEO_SITE.url }];
  if (page.parent && SEO_PAGES[page.parent]) items.push({ name: SEO_PAGES[page.parent].title, url: canonicalUrl(page.parent) });
  items.push({ name: page.title, url: canonicalUrl(path) });
  return items;
}

export function relatedSeoPages(path: string, limit = 4) {
  const current = SEO_PAGES[path];
  if (!current) return [];
  const terms = new Set([current.primaryKeyword, ...(current.secondaryKeywords ?? [])].flatMap(term => term.toLowerCase().split(/\s+/)));
  return PUBLIC_SEO_PAGES.filter(page => page.path !== path && page.type !== 'legal')
    .map(page => ({ page, score: [page.primaryKeyword, ...(page.secondaryKeywords ?? [])].join(' ').toLowerCase().split(/\s+/).filter(term => terms.has(term)).length }))
    .sort((a, b) => b.score - a.score || b.page.priority! - a.page.priority!)
    .slice(0, limit)
    .map(({ page }) => page);
}
