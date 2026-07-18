// IndexNow API Key — fixed key used for all submissions
// The corresponding key file is served at /[key].txt via the public folder
export const INDEXNOW_API_KEY = 'a1b2c3d4e5f6789012345678901234ab';
export const INDEXNOW_KEY_LOCATION = `https://fixmy.money/${INDEXNOW_API_KEY}.txt`;
export const BASE_URL = 'https://fixmy.money';

// IndexNow-enabled search engine endpoints
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://yandex.com/indexnow',
  'https://search.seznam.cz/indexnow',
  'https://api.indexnow.org/IndexNow',
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

// Public pages that should be submitted to IndexNow
export const PUBLIC_PAGES = [
  BASE_URL,
  `${BASE_URL}/credit-repair-software`,
  `${BASE_URL}/credit-repair-business-software`,
  `${BASE_URL}/credit-repair-crm`,
  `${BASE_URL}/credit-repair-automation`,
  `${BASE_URL}/pricing`,
  `${BASE_URL}/blog`,
  `${BASE_URL}/demo`,
  `${BASE_URL}/knowledge-base`,
  `${BASE_URL}/affiliate-program`,
];

// Excluded private/protected paths
const EXCLUDED_PREFIXES = [
  '/dashboard',
  '/client-portal',
  '/client-management',
  '/client-pipeline',
  '/dispute-letter-management',
  '/ai-dispute-analyzer',
  '/financial-health',
  '/revenue-forecasting',
  '/debt-elimination',
  '/appointments',
  '/billing-subscriptions',
  '/workflow-task-management',
  '/workspace-setup',
  '/sign-up-login-screen',
  '/auth',
  '/api',
  '/admin',
  '/settings',
  '/billing',
];

export function isPublicUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return !EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
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
    const body = {
      host: 'fixmy.money',
      key: INDEXNOW_API_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
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
  return submitUrlsToIndexNow(PUBLIC_PAGES);
}

export function getSubmissionLog(): SubmissionLogEntry[] {
  return [...submissionLog];
}

export function getSubmissionQueue(): QueueItem[] {
  return [...submissionQueue];
}
