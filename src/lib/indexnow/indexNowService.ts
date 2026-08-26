import { getAllSlugs } from '@/lib/blog/articles';
import { canonicalUrl, PRIVATE_ROUTE_PREFIXES, PUBLIC_SEO_PAGES, SEO_SITE } from '@/lib/seo/config';

export const BASE_URL = SEO_SITE.url;

export function getIndexNowKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const key = String(env.INDEXNOW_KEY ?? '').trim();
  return /^[a-zA-Z0-9-]{8,128}$/.test(key) ? key : null;
}

export function getIndexNowKeyLocation(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.INDEXNOW_KEY_LOCATION ?? `${BASE_URL}/indexnow.txt`).trim();
}

// IndexNow-enabled search engine endpoints
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
];

export interface SubmissionLogEntry {
  url: string;
  submittedAt: string;
  engine: string;
  status: number | null;
  success: boolean;
  error?: string;
  attempt: number;
}

export interface QueueItem {
  url: string;
  attempts: number;
  lastAttempt?: string;
  success: boolean;
}

// In-memory submission log (persists per server instance)
const submissionLog: SubmissionLogEntry[] = [];
const submissionQueue: QueueItem[] = [];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export function getPublicIndexableUrls(): string[] {
  const urls = [
    ...PUBLIC_SEO_PAGES.map(page => canonicalUrl(page.path)),
    ...getAllSlugs().map(slug => canonicalUrl(`/blog/${slug}`)),
  ];
  return [...new Set(urls)].filter(isPublicUrl);
}

// Excluded private/protected paths
const EXCLUDED_PREFIXES = [
  ...PRIVATE_ROUTE_PREFIXES,
];

export function isPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const canonicalHost = new URL(BASE_URL).host;
    const path = parsed.pathname.replace(/\/$/, '') || '/';
    if (parsed.protocol !== 'https:' || parsed.host !== canonicalHost) return false;
    return !EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  } catch {
    return false;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function submitToEngine(
  engine: string,
  urls: string[],
  attempt: number
): Promise<SubmissionLogEntry[]> {
  const logs: SubmissionLogEntry[] = [];
  const now = new Date().toISOString();

  try {
    const key = getIndexNowKey();
    if (!key) throw new Error('INDEXNOW_KEY is not configured.');

    const body = {
      host: new URL(BASE_URL).host,
      key,
      keyLocation: getIndexNowKeyLocation(),
      urlList: urls,
    };

    const response = await fetch(engine, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });

    let success = response.status === 200 || response.status === 202;

    for (const url of urls) {
      const entry: SubmissionLogEntry = {
        url,
        submittedAt: now,
        engine,
        status: response.status,
        success,
        attempt,
      };
      if (!success) {
        entry.error = `HTTP ${response.status}: ${response.statusText}`;
      }
      logs.push(entry);
      submissionLog.push(entry);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    for (const url of urls) {
      const entry: SubmissionLogEntry = {
        url,
        submittedAt: now,
        engine,
        status: null,
        success: false,
        error: errorMsg,
        attempt,
      };
      logs.push(entry);
      submissionLog.push(entry);
    }
  }

  return logs;
}

export async function submitUrlsToIndexNow(
  urls: string[]
): Promise<SubmissionLogEntry[]> {
  const publicUrls = urls.filter(isPublicUrl);
  if (publicUrls.length === 0) return [];

  const allLogs: SubmissionLogEntry[] = [];

  for (const engine of INDEXNOW_ENDPOINTS) {
    let attempt = 1;
    let success = false;

    while (attempt <= MAX_RETRIES && !success) {
      if (attempt > 1) {
        await sleep(RETRY_DELAY_MS * attempt);
      }

      const logs = await submitToEngine(engine, publicUrls, attempt);
      allLogs.push(...logs);

      success = logs.every((l) => l.success);

      if (!success) {
        attempt++;
      }
    }
  }

  // Update queue items
  for (const url of publicUrls) {
    const existing = submissionQueue.find((q) => q.url === url);
    const succeeded = allLogs.some((l) => l.url === url && l.success);
    if (existing) {
      existing.attempts++;
      existing.lastAttempt = new Date().toISOString();
      existing.success = succeeded;
    } else {
      submissionQueue.push({
        url,
        attempts: 1,
        lastAttempt: new Date().toISOString(),
        success: succeeded,
      });
    }
  }

  return allLogs;
}

export async function submitAllPublicPages(): Promise<SubmissionLogEntry[]> {
  return submitUrlsToIndexNow(getPublicIndexableUrls());
}

export function getSubmissionLog(): SubmissionLogEntry[] {
  return [...submissionLog];
}

export function getSubmissionQueue(): QueueItem[] {
  return [...submissionQueue];
}
