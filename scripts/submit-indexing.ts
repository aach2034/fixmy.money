#!/usr/bin/env node
/**
 * submit-indexing.ts
 * FixMy.Money — Search Engine Indexing Submission Script
 *
 * Usage:
 *   npx ts-node scripts/submit-indexing.ts
 *   npx ts-node scripts/submit-indexing.ts --urls https://fixmy.money/blog/post-1
 *
 * Environment variables required:
 *   INDEXNOW_KEY
 *   BING_WEBMASTER_API_KEY
 *   GOOGLE_SEARCH_CONSOLE_CLIENT_ID
 *   GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET
 *   GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN
 */

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

// ============================================================
// CONFIG
// ============================================================
const BASE_URL = 'https://fixmy.money';
const SITE_HOST = 'fixmy.money';
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';
const BING_API_KEY = process.env.BING_WEBMASTER_API_KEY || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN || '';

const RATE_LIMIT_MS = 1000; // 1 second between requests
const LOG_FILE = path.join(process.cwd(), 'indexing-log.json');

// ============================================================
// TYPES
// ============================================================
interface SubmissionResult {
  engine: string;
  url: string;
  status: 'success' | 'error' | 'skipped';
  statusCode?: number;
  message: string;
  timestamp: string;
}

interface SubmissionLog {
  lastRun: string;
  submittedUrls: string[];
  results: SubmissionResult[];
}

// ============================================================
// UTILITIES
// ============================================================
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(level: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN', message: string): void {
  const prefix = {
    INFO: '\x1b[36m[INFO]\x1b[0m',
    SUCCESS: '\x1b[32m[SUCCESS]\x1b[0m',
    ERROR: '\x1b[31m[ERROR]\x1b[0m',
    WARN: '\x1b[33m[WARN]\x1b[0m',
  }[level];
  console.log(`${prefix} ${message}`);
}

function loadLog(): SubmissionLog {
  try {
    if (fs.existsSync(LOG_FILE)) {
      return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return { lastRun: '', submittedUrls: [], results: [] };
}

function saveLog(logData: SubmissionLog): void {
  fs.writeFileSync(LOG_FILE, JSON.stringify(logData, null, 2));
}

function makeRequest(
  requestUrl: string,
  options: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(requestUrl);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = lib.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode || 0, body }));
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// ============================================================
// SITEMAP PARSER
// ============================================================
async function fetchSitemapUrls(): Promise<string[]> {
  log('INFO', `Fetching sitemap from ${SITEMAP_URL}`);
  try {
    const res = await makeRequest(SITEMAP_URL, {});
    const matches = res.body.match(/<loc>(.*?)<\/loc>/g) || [];
    const urls = matches
      .map(m => m.replace(/<\/?loc>/g, '').trim())
      .filter(u => u.startsWith(BASE_URL));
    log('SUCCESS', `Found ${urls.length} URLs in sitemap`);
    return urls;
  } catch (err) {
    log('ERROR', `Failed to fetch sitemap: ${err}`);
    return [];
  }
}

// ============================================================
// INDEXNOW SUBMISSION
// ============================================================
async function submitIndexNow(urls: string[]): Promise<SubmissionResult[]> {
  const results: SubmissionResult[] = [];
  const endpoints = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow',
  ];

  if (!INDEXNOW_KEY) {
    log('WARN', 'INDEXNOW_KEY not set — skipping IndexNow submission');
    return results;
  }

  for (const endpoint of endpoints) {
    log('INFO', `Submitting ${urls.length} URLs to IndexNow: ${endpoint}`);
    try {
      let body = JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${BASE_URL}/indexnow.txt`,
        urlList: urls,
      });

      const res = await makeRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body).toString(),
        },
        body,
      });

      const success = res.statusCode === 200 || res.statusCode === 202;
      const result: SubmissionResult = {
        engine: `IndexNow (${endpoint})`,
        url: urls.join(', ').slice(0, 100) + '...',
        status: success ? 'success' : 'error',
        statusCode: res.statusCode,
        message: success ? `Submitted ${urls.length} URLs` : `HTTP ${res.statusCode}: ${res.body.slice(0, 200)}`,
        timestamp: new Date().toISOString(),
      };
      results.push(result);

      if (success) {
        log('SUCCESS', `IndexNow ${endpoint}: ${urls.length} URLs submitted (HTTP ${res.statusCode})`);
      } else {
        log('ERROR', `IndexNow ${endpoint}: HTTP ${res.statusCode} — ${res.body.slice(0, 200)}`);
      }
    } catch (err) {
      results.push({
        engine: `IndexNow (${endpoint})`,
        url: '',
        status: 'error',
        message: String(err),
        timestamp: new Date().toISOString(),
      });
      log('ERROR', `IndexNow ${endpoint} failed: ${err}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return results;
}

// ============================================================
// BING URL SUBMISSION API
// ============================================================
async function submitBingUrls(urls: string[]): Promise<SubmissionResult[]> {
  const results: SubmissionResult[] = [];

  if (!BING_API_KEY) {
    log('WARN', 'BING_WEBMASTER_API_KEY not set — skipping Bing URL Submission API');
    return results;
  }

  log('INFO', `Submitting ${urls.length} URLs to Bing URL Submission API`);

  // Bing URL Submission API: POST /webmaster/api.svc/json/SubmitUrlbatch
  const bingEndpoint = `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch?apikey=${BING_API_KEY}`;

  try {
    let body = JSON.stringify({
      siteUrl: BASE_URL,
      urlList: urls.slice(0, 500), // Bing limit: 500 URLs per day
    });

    const res = await makeRequest(bingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body).toString(),
      },
      body,
    });

    const success = res.statusCode === 200;
    results.push({
      engine: 'Bing URL Submission API',
      url: `${urls.length} URLs`,
      status: success ? 'success' : 'error',
      statusCode: res.statusCode,
      message: success ? `Submitted ${urls.length} URLs to Bing` : `HTTP ${res.statusCode}: ${res.body.slice(0, 200)}`,
      timestamp: new Date().toISOString(),
    });

    if (success) {
      log('SUCCESS', `Bing URL Submission: ${urls.length} URLs submitted`);
    } else {
      log('ERROR', `Bing URL Submission: HTTP ${res.statusCode} — ${res.body.slice(0, 200)}`);
    }
  } catch (err) {
    results.push({
      engine: 'Bing URL Submission API',
      url: '',
      status: 'error',
      message: String(err),
      timestamp: new Date().toISOString(),
    });
    log('ERROR', `Bing URL Submission failed: ${err}`);
  }

  return results;
}

// ============================================================
// GOOGLE SEARCH CONSOLE — SITEMAP SUBMISSION
// ============================================================
async function getGoogleAccessToken(): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    log('WARN', 'Google Search Console credentials not set — skipping GSC submission');
    return null;
  }

  try {
    let body = new url.URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }).toString();

    const res = await makeRequest('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body).toString(),
      },
      body,
    });

    if (res.statusCode === 200) {
      const data = JSON.parse(res.body);
      return data.access_token;
    }
    log('ERROR', `Google token refresh failed: HTTP ${res.statusCode}`);
    return null;
  } catch (err) {
    log('ERROR', `Google token refresh error: ${err}`);
    return null;
  }
}

async function submitGoogleSitemap(): Promise<SubmissionResult[]> {
  const results: SubmissionResult[] = [];
  const accessToken = await getGoogleAccessToken();

  if (!accessToken) {
    results.push({
      engine: 'Google Search Console',
      url: SITEMAP_URL,
      status: 'skipped',
      message: 'Credentials not configured. Set GOOGLE_SEARCH_CONSOLE_CLIENT_ID, GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET, GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN',
      timestamp: new Date().toISOString(),
    });
    return results;
  }

  log('INFO', `Submitting sitemap to Google Search Console`);

  const sitemapPath = encodeURIComponent(SITEMAP_URL);
  const gscEndpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(BASE_URL)}/sitemaps/${sitemapPath}`;

  try {
    const res = await makeRequest(gscEndpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Length': '0',
      },
    });

    const success = res.statusCode === 200 || res.statusCode === 204;
    results.push({
      engine: 'Google Search Console',
      url: SITEMAP_URL,
      status: success ? 'success' : 'error',
      statusCode: res.statusCode,
      message: success ? 'Sitemap submitted to Google Search Console' : `HTTP ${res.statusCode}: ${res.body.slice(0, 200)}`,
      timestamp: new Date().toISOString(),
    });

    if (success) {
      log('SUCCESS', `Google Search Console: Sitemap submitted`);
    } else {
      log('ERROR', `Google Search Console: HTTP ${res.statusCode} — ${res.body.slice(0, 200)}`);
    }
  } catch (err) {
    results.push({
      engine: 'Google Search Console',
      url: SITEMAP_URL,
      status: 'error',
      message: String(err),
      timestamp: new Date().toISOString(),
    });
    log('ERROR', `Google Search Console failed: ${err}`);
  }

  return results;
}

// ============================================================
// BING SITEMAP SUBMISSION (via Webmaster Tools API)
// ============================================================
async function submitBingSitemap(): Promise<SubmissionResult[]> {
  const results: SubmissionResult[] = [];

  if (!BING_API_KEY) {
    results.push({
      engine: 'Bing Webmaster Tools',
      url: SITEMAP_URL,
      status: 'skipped',
      message: 'BING_WEBMASTER_API_KEY not set',
      timestamp: new Date().toISOString(),
    });
    return results;
  }

  log('INFO', `Submitting sitemap to Bing Webmaster Tools`);

  const bingEndpoint = `https://ssl.bing.com/webmaster/api.svc/json/AddSitemap?apikey=${BING_API_KEY}`;

  try {
    let body = JSON.stringify({
      siteUrl: BASE_URL,
      sitemapUrl: SITEMAP_URL,
    });

    const res = await makeRequest(bingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body).toString(),
      },
      body,
    });

    const success = res.statusCode === 200;
    results.push({
      engine: 'Bing Webmaster Tools',
      url: SITEMAP_URL,
      status: success ? 'success' : 'error',
      statusCode: res.statusCode,
      message: success ? 'Sitemap submitted to Bing Webmaster Tools' : `HTTP ${res.statusCode}: ${res.body.slice(0, 200)}`,
      timestamp: new Date().toISOString(),
    });

    if (success) {
      log('SUCCESS', `Bing Webmaster Tools: Sitemap submitted`);
    } else {
      log('ERROR', `Bing Webmaster Tools: HTTP ${res.statusCode}`);
    }
  } catch (err) {
    results.push({
      engine: 'Bing Webmaster Tools',
      url: SITEMAP_URL,
      status: 'error',
      message: String(err),
      timestamp: new Date().toISOString(),
    });
  }

  return results;
}

// ============================================================
// DEDUPLICATION
// ============================================================
function filterNewUrls(urls: string[], previousLog: SubmissionLog): string[] {
  const previousSet = new Set(previousLog.submittedUrls);
  const newUrls = urls.filter(u => !previousSet.has(u));
  const alreadySubmitted = urls.length - newUrls.length;
  if (alreadySubmitted > 0) {
    log('INFO', `Skipping ${alreadySubmitted} already-submitted URLs`);
  }
  return newUrls;
}

// ============================================================
// MAIN
// ============================================================
async function main(): Promise<void> {
  console.log('\n\x1b[1m=== FixMy.Money Search Engine Indexing Script ===\x1b[0m\n');

  const args = process.argv.slice(2);
  const urlsFlag = args.indexOf('--urls');
  let targetUrls: string[] = [];

  if (urlsFlag !== -1 && args[urlsFlag + 1]) {
    targetUrls = args.slice(urlsFlag + 1).filter(a => a.startsWith('http'));
    log('INFO', `Using ${targetUrls.length} URLs from command line`);
  } else {
    targetUrls = await fetchSitemapUrls();
  }

  if (targetUrls.length === 0) {
    log('ERROR', 'No URLs to submit. Exiting.');
    process.exit(1);
  }

  // Load previous log for deduplication
  const previousLog = loadLog();
  const newUrls = filterNewUrls(targetUrls, previousLog);

  if (newUrls.length === 0) {
    log('INFO', 'All URLs already submitted. Nothing new to submit.');
    log('INFO', 'To force resubmission, delete indexing-log.json');
    process.exit(0);
  }

  log('INFO', `Submitting ${newUrls.length} new URLs\n`);

  const allResults: SubmissionResult[] = [];

  // 1. IndexNow (Bing, Yandex, etc.)
  const indexNowResults = await submitIndexNow(newUrls);
  allResults.push(...indexNowResults);
  await sleep(RATE_LIMIT_MS);

  // 2. Bing URL Submission API
  const bingUrlResults = await submitBingUrls(newUrls);
  allResults.push(...bingUrlResults);
  await sleep(RATE_LIMIT_MS);

  // 3. Bing Sitemap
  const bingSitemapResults = await submitBingSitemap();
  allResults.push(...bingSitemapResults);
  await sleep(RATE_LIMIT_MS);

  // 4. Google Search Console
  const googleResults = await submitGoogleSitemap();
  allResults.push(...googleResults);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n\x1b[1m=== Submission Summary ===\x1b[0m');
  const successCount = allResults.filter(r => r.status === 'success').length;
  const errorCount = allResults.filter(r => r.status === 'error').length;
  const skippedCount = allResults.filter(r => r.status === 'skipped').length;

  console.log(`\x1b[32m✓ Success: ${successCount}\x1b[0m`);
  console.log(`\x1b[31m✗ Errors: ${errorCount}\x1b[0m`);
  console.log(`\x1b[33m⚠ Skipped: ${skippedCount}\x1b[0m`);

  if (errorCount > 0) {
    console.log('\n\x1b[1mErrors:\x1b[0m');
    allResults.filter(r => r.status === 'error').forEach(r => {
      console.log(`  ${r.engine}: ${r.message}`);
    });
  }

  // Save log
  const updatedLog: SubmissionLog = {
    lastRun: new Date().toISOString(),
    submittedUrls: [...new Set([...previousLog.submittedUrls, ...newUrls])],
    results: [...previousLog.results, ...allResults].slice(-500), // Keep last 500 results
  };
  saveLog(updatedLog);
  log('SUCCESS', `Log saved to ${LOG_FILE}`);

  console.log('\n\x1b[1mNext Steps:\x1b[0m');
  console.log('  1. Verify Google Search Console: https://search.google.com/search-console');
  console.log('  2. Verify Bing Webmaster Tools: https://www.bing.com/webmasters');
  console.log('  3. Check IndexNow status: https://www.bing.com/indexnow');
  console.log('  4. Run again after publishing new pages\n');
}

main().catch(err => {
  log('ERROR', `Fatal error: ${err}`);
  process.exit(1);
});
