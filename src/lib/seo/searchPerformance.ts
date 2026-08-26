export interface SearchPerformanceRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  previousClicks?: number;
  previousImpressions?: number;
}

export interface SeoOpportunity {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  recommendedAction: string;
  priorityScore: number;
}

export interface SearchPerformanceSummary {
  configured: boolean;
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
  opportunities: SeoOpportunity[];
  winners: SearchPerformanceRow[];
  decliners: SearchPerformanceRow[];
  setupRequired: string[];
}

const SETUP_REQUIRED = [
  'Connect Google Search Console property for https://fixmy.money',
  'Provide a server-side Google service account or OAuth credential with Search Console read access',
  'Schedule a recurring job to import query/page performance into this report',
];

export function isSearchConsoleConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(String(env.GOOGLE_SEARCH_CONSOLE_SITE_URL ?? '').trim() && String(env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ?? '').trim() && String(env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ?? '').trim());
}

function weightedPosition(rows: SearchPerformanceRow[]): number {
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  if (impressions === 0) return 0;
  return rows.reduce((sum, row) => sum + row.position * row.impressions, 0) / impressions;
}

export function analyzeSearchPerformance(
  rows: SearchPerformanceRow[],
  env: NodeJS.ProcessEnv = process.env
): SearchPerformanceSummary {
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const averagePosition = weightedPosition(rows);

  const opportunities = rows
    .filter(row => row.impressions >= 50)
    .filter(row => row.position >= 5 && row.position <= 30)
    .filter(row => row.ctr < 0.04)
    .map(row => ({
      query: row.query,
      page: row.page,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      recommendedAction: recommendAction(row),
      priorityScore: Math.round((row.impressions * (31 - row.position) * (0.04 - row.ctr)) / 10),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 10);

  const winners = rows
    .filter(row => row.previousClicks != null && row.clicks - row.previousClicks >= 5)
    .sort((a, b) => (b.clicks - (b.previousClicks ?? 0)) - (a.clicks - (a.previousClicks ?? 0)))
    .slice(0, 5);

  const decliners = rows
    .filter(row => row.previousClicks != null && (row.previousClicks ?? 0) - row.clicks >= 5)
    .sort((a, b) => ((b.previousClicks ?? 0) - b.clicks) - ((a.previousClicks ?? 0) - a.clicks))
    .slice(0, 5);

  const configured = isSearchConsoleConfigured(env);

  return {
    configured,
    clicks,
    impressions,
    ctr,
    averagePosition,
    opportunities,
    winners,
    decliners,
    setupRequired: configured ? [] : SETUP_REQUIRED,
  };
}

function recommendAction(row: SearchPerformanceRow): string {
  if (row.position <= 10 && row.ctr < 0.02) return 'Improve title/meta description to better match the query intent and add a clearer CTA.';
  if (row.position <= 20) return 'Expand the page answer with a concrete example, FAQ, and related internal links.';
  return 'Strengthen topical coverage and internal links before considering a new page.';
}
