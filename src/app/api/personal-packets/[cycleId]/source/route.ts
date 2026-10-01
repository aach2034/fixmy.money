import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { parseWithAdapter } from '@/lib/creditReport/adapters';
import { determineAnalyzerOutcome } from '@/lib/creditReport/analyzerOutcome';
import { stripRawReportArtifacts } from '@/lib/creditReport/aiPrivacy';
import { safeNormalizeText, type SupportedProvider } from '@/lib/creditReport/parser';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES = 1024 * 1024;
const PROVIDERS = new Set<SupportedProvider>([
  'smartcredit', 'myscoreiq', 'identityiq', 'myfreescorenow', 'privacyguard',
  'experian', 'transunion', 'equifax', 'annualcreditreport', 'creditkarma', 'unknown',
]);
const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store' },
});

async function boundedBody(request: NextRequest): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } catch { return null; }
}

/** Stores a consumer-owned, high-confidence structured source; never retains raw text. */
export async function POST(request: NextRequest, context: { params: Promise<{ cycleId: string }> }) {
  if (process.env.PERSONAL_PACKET_WORKFLOW_ENABLED !== 'true') return json({ error: 'workflow_on_hold' }, 503);
  if (request.headers.get('origin') !== request.nextUrl.origin) return json({ error: 'forbidden' }, 403);
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) return json({ error: 'invalid_request' }, 413);
  const { cycleId } = await context.params;
  if (!UUID.test(cycleId)) return json({ error: 'not_found' }, 404);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'authentication_required' }, 401);
  const admin = getAdminClient();
  const { data: cycle, error: cycleError } = await admin.from('consumer_service_cycles')
    .select('id,state,cycle_started_at,cycle_ends_at,cancellation_expires_at')
    .eq('id', cycleId).eq('consumer_id', user.id).maybeSingle();
  if (cycleError || !cycle) return json({ error: 'not_found' }, 404);
  const now = Date.now();
  if (cycle.state !== 'active_unbilled_service' ||
    now < Date.parse(cycle.cancellation_expires_at) ||
    now < Date.parse(cycle.cycle_started_at) || now > Date.parse(cycle.cycle_ends_at)) {
    return json({ error: 'cycle_not_active' }, 409);
  }
  const raw = await boundedBody(request);
  if (!raw) return json({ error: 'invalid_request' }, 400);
  let body: { provider?: unknown; textContent?: unknown };
  try { body = JSON.parse(raw); } catch { return json({ error: 'invalid_request' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
    typeof body.provider !== 'string' || !PROVIDERS.has(body.provider as SupportedProvider) ||
    typeof body.textContent !== 'string' || body.textContent.length < 100) {
    return json({ error: 'invalid_request' }, 400);
  }
  const text = safeNormalizeText(body.textContent);
  if (text.length < 100) return json({ error: 'source_unreadable' }, 422);
  const commitKey = `personal:${createHash('sha256').update(cycleId).update('\0').update(text).digest('hex')}`;
  const existing = await admin.from('parsed_credit_reports').select('id,status')
    .eq('owner_id', user.id).is('client_id', null).eq('import_commit_key', commitKey).maybeSingle();
  if (existing.error) return json({ error: 'source_unavailable' }, 503);
  if (existing.data) return json({ reportId: existing.data.id, status: existing.data.status, reused: true });

  // The parser can include source snippets in diagnostic objects; only normalized
  // account facts and severity-only warning metadata are persisted.
  const parsed = parseWithAdapter(text, body.provider as SupportedProvider);
  const outcome = determineAnalyzerOutcome(parsed);
  if (outcome.state !== 'success' || parsed.unsupportedSections.includes('accounts') ||
    parsed.warnings.some(warning => warning.severity === 'error')) {
    return json({ error: 'source_requires_review', reasonCodes: outcome.reasons }, 422);
  }
  const savedAt = new Date().toISOString();
  const { data: report, error: insertError } = await admin.from('parsed_credit_reports').insert({
    owner_id: user.id, client_id: null, import_commit_key: commitKey,
    provider: parsed.detectedProvider, provider_confidence: parsed.providerConfidence,
    parser_version: parsed.parserVersion, overall_confidence: parsed.sectionConfidence.overall,
    section_confidence: parsed.sectionConfidence,
    sections_parsed: Object.entries(parsed.sectionConfidence).filter(([, score]) => score > 0).map(([section]) => section),
    sections_missed: parsed.unsupportedSections,
    warnings: parsed.warnings.map(warning => ({ section: warning.section, severity: warning.severity })),
    personal_info: parsed.clientInfo, scores: parsed.scores,
    accounts_count: parsed.accounts.length, negative_count: parsed.accounts.filter(account => account.isNegative).length,
    collections_count: parsed.collections.length, inquiries_count: parsed.inquiries.length,
    public_records_count: parsed.publicRecords.length,
    raw_text: '', file_name: '', file_type: '', status: 'saved', created_at: savedAt, saved_at: savedAt,
    import_method: 'consumer_text', all_accounts: stripRawReportArtifacts(parsed.accounts),
    all_inquiries: parsed.inquiries, public_records: parsed.publicRecords,
    report_date: parsed.reportDate, importing_user_id: user.id,
  }).select('id,status').single();
  if (insertError) {
    // A concurrent identical submission may win the unique index race.
    if (insertError.code === '23505') {
      const retry = await admin.from('parsed_credit_reports').select('id,status')
        .eq('owner_id', user.id).is('client_id', null).eq('import_commit_key', commitKey).maybeSingle();
      if (retry.data) return json({ reportId: retry.data.id, status: retry.data.status, reused: true });
    }
    return json({ error: 'source_unavailable' }, 503);
  }
  return json({ reportId: report.id, status: report.status, reused: false }, 201);
}
