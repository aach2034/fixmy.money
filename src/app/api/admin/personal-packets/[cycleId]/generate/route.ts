import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireRecentPlatformAdmin } from '@/lib/admin/authorization';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  buildPersonalPacket, PacketInputError, PERSONAL_PACKET_ENGINE_VERSION,
  PERSONAL_PACKET_RULESET_VERSION, type SupportedClaim,
} from '@/lib/personalPacket/generator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUCKET = 'personal-review-packets';
const sha = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store' },
});

export async function ensurePrivateArtifact(path: string, content: string, expectedHash: string) {
  const storage = getAdminClient().storage.from(BUCKET);
  const { error: uploadError } = await storage.upload(path, Buffer.from(content, 'utf8'), {
    contentType: 'text/plain', upsert: false,
  });
  if (uploadError) {
    // A retry may meet an existing object; accept it only when its bytes match.
    const { data: prior, error: readError } = await storage.download(path);
    if (readError || !prior || sha(await prior.text()) !== expectedHash) {
      throw new PacketInputError('ARTIFACT_WRITE_FAILED');
    }
  }
  const { data: stored, error: verifyError } = await storage.download(path);
  if (verifyError || !stored || sha(await stored.text()) !== expectedHash) {
    throw new PacketInputError('ARTIFACT_HASH_MISMATCH');
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ cycleId: string }> }) {
  if (process.env.PERSONAL_PACKET_WORKFLOW_ENABLED !== 'true') return json({ error: 'workflow_on_hold' }, 503);
  if (request.headers.get('origin') !== request.nextUrl.origin) return json({ error: 'forbidden' }, 403);
  if (Number(request.headers.get('content-length') || 0) > 1024) return json({ error: 'invalid_request' }, 400);
  const { cycleId } = await context.params;
  if (!UUID.test(cycleId)) return json({ error: 'not_found' }, 404);
  const session = await requireRecentPlatformAdmin('personal_packet_generation');
  let reportId: string;
  try {
    const raw = await request.text();
    if (raw.length > 1024) return json({ error: 'invalid_request' }, 400);
    const body = JSON.parse(raw) as { reportId?: unknown };
    if (!body || Array.isArray(body) || typeof body !== 'object' ||
      typeof body.reportId !== 'string' || !UUID.test(body.reportId)) return json({ error: 'invalid_request' }, 400);
    reportId = body.reportId;
  } catch { return json({ error: 'invalid_request' }, 400); }

  const admin = getAdminClient();
  const { data: cycle, error: cycleError } = await admin.from('consumer_service_cycles')
    .select('id,consumer_id,state,cycle_started_at,cycle_ends_at,cancellation_expires_at,contract_version,disclosure_version,packet_storage_path,packet_sha256')
    .eq('id', cycleId).maybeSingle();
  if (cycleError || !cycle) return json({ error: 'cycle_not_found' }, 404);
  if (cycle.state === 'completed_unbilled') {
    if (!cycle.packet_storage_path?.startsWith(`${cycle.consumer_id}/${cycle.id}/`) || !cycle.packet_sha256) {
      return json({ error: 'packet_unavailable' }, 503);
    }
    const { data: existing, error: existingError } = await admin.storage.from(BUCKET).download(cycle.packet_storage_path);
    if (existingError || !existing || sha(await existing.text()) !== cycle.packet_sha256) {
      return json({ error: 'packet_unavailable' }, 503);
    }
    return json({ id: cycle.id, state: cycle.state, packetSha256: cycle.packet_sha256, billingEnabled: false });
  }
  if (cycle.state !== 'service_completion_pending' || Date.now() < Date.parse(cycle.cycle_ends_at) ||
    Date.now() < Date.parse(cycle.cancellation_expires_at)) return json({ error: 'cycle_not_ready' }, 409);

  const { data: report, error: reportError } = await admin.from('parsed_credit_reports')
    .select('id,owner_id,client_id,status,created_at,saved_at,overall_confidence,provider_confidence,section_confidence,sections_missed,all_accounts,all_inquiries,public_records,warnings,parser_version')
    .eq('id', reportId).eq('owner_id', cycle.consumer_id).is('client_id', null).maybeSingle();
  if (reportError || !report) return json({ error: 'report_not_found' }, 404);
  const received = Date.parse(report.created_at || '');
  if (report.status !== 'saved' || !report.saved_at ||
    !Number.isFinite(received) || received < Date.parse(cycle.cycle_started_at) ||
    received > Date.parse(cycle.cycle_ends_at) ||
    !Number.isFinite(Date.parse(report.saved_at)) || Date.parse(report.saved_at) < received ||
    Date.parse(report.saved_at) > Date.now() || !report.parser_version ||
    Number(report.overall_confidence) < 60 || Number(report.provider_confidence) < 60 ||
    Number(report.section_confidence?.accounts ?? 0) < 50 ||
    (Array.isArray(report.sections_missed) && report.sections_missed.includes('accounts')) ||
    (Array.isArray(report.warnings) && report.warnings.some((warning: unknown) =>
      warning && typeof warning === 'object' && (warning as { severity?: unknown }).severity === 'error'))) {
    return json({ error: 'source_processing_incomplete' }, 409);
  }

  try {
    const { data: facts, error: factsError } = await admin.from('evidence_facts')
      .select('id,source_reference,fact_value,evidence_document_id')
      .eq('owner_id', cycle.consumer_id).is('client_id', null)
      .eq('confirmed_by_user', true).eq('confirmed_by', cycle.consumer_id)
      .order('id', { ascending: true }).limit(100);
    if (factsError) throw new PacketInputError('EVIDENCE_LOOKUP_FAILED');
    const candidateFacts = (facts ?? []).filter(fact =>
      fact.source_reference && typeof fact.source_reference === 'object' &&
      fact.source_reference.reportId === reportId && typeof fact.source_reference.accountId === 'string' &&
      typeof fact.evidence_document_id === 'string');
    const documentIds = [...new Set(candidateFacts.map(fact => fact.evidence_document_id as string))];
    const { data: documents, error: docsError } = documentIds.length
      ? await admin.from('evidence_documents')
        .select('id,owner_id,client_id,storage_bucket,storage_path')
        .eq('owner_id', cycle.consumer_id).is('client_id', null).in('id', documentIds)
      : { data: [], error: null };
    if (docsError) throw new PacketInputError('EVIDENCE_LOOKUP_FAILED');
    const available = new Set<string>();
    for (const doc of documents ?? []) {
      if (doc.storage_bucket !== 'evidence-documents' ||
        !doc.storage_path.startsWith(`${cycle.consumer_id}/`)) continue;
      const { data: exists, error } = await admin.storage.from('evidence-documents').exists(doc.storage_path);
      if (!error && exists === true) available.add(doc.id);
    }
    const claims: SupportedClaim[] = candidateFacts.filter(fact => available.has(fact.evidence_document_id as string))
      .map(fact => ({ accountId: fact.source_reference.accountId as string,
        assertion: fact.fact_value, evidenceDocumentId: fact.evidence_document_id as string,
        confirmedByConsumer: true }));
    const contents = buildPersonalPacket({ reportId, source: report.all_accounts,
      inquiries: report.all_inquiries, publicRecords: report.public_records, claims,
      cycleStartAt: cycle.cycle_started_at, cycleEndAt: cycle.cycle_ends_at });
    const prefix = `${cycle.consumer_id}/${cycle.id}`;
    const decisionName = contents.disputeDocuments ? 'dispute-documents' : 'no-supported-dispute';
    const generatedAt = new Date().toISOString();
    const artifacts = [
      { kind: 'source-snapshot', content: contents.sourceSnapshot, hash: contents.sourceSha256 },
      { kind: 'findings', content: contents.findings, hash: contents.hashes.findings },
      { kind: 'action-plan', content: contents.actionPlan, hash: contents.hashes.actionPlan },
      { kind: decisionName, content: contents.disputeDocuments ?? contents.noSupportedDispute!, hash: contents.hashes.decision },
      { kind: 'packet', content: contents.packet, hash: contents.hashes.packet },
    ];
    for (const artifact of artifacts) {
      await ensurePrivateArtifact(`${prefix}/${artifact.kind}.txt`, artifact.content, artifact.hash);
    }
    const component = (kind: string, hash: string) => ({
      artifactId: `${prefix}/${kind}.txt`, sha256: hash, completedAt: generatedAt,
    });
    const evidence: Record<string, unknown> = {
      consumerId: cycle.consumer_id, cycleId: cycle.id,
      cycleStartAt: cycle.cycle_started_at, cycleEndAt: cycle.cycle_ends_at,
      cancellationExpiresAt: cycle.cancellation_expires_at,
      contractVersion: cycle.contract_version, disclosureVersion: cycle.disclosure_version,
      sourceReceivedAt: report.created_at, sourceArtifactId: report.id,
      sourceSnapshotArtifactId: `${prefix}/source-snapshot.txt`,
      sourceProcessedAt: report.saved_at, parserVersion: report.parser_version,
      sourceSha256: contents.sourceSha256, materiallyNewSource: true,
      parsingStatus: 'complete', analysisStatus: 'complete',
      analysisEngineVersion: PERSONAL_PACKET_ENGINE_VERSION,
      rulesetVersion: PERSONAL_PACKET_RULESET_VERSION,
      findings: component('findings', contents.hashes.findings),
      actionPlan: component('action-plan', contents.hashes.actionPlan),
      packet: component('packet', contents.hashes.packet),
      deliveryVerifiedAt: new Date().toISOString(),
    };
    if (contents.disputeDocuments) evidence.disputeDocuments = component(decisionName, contents.hashes.decision);
    else evidence.noSupportedDispute = component(decisionName, contents.hashes.decision);
    const { data: completed, error: completionError } = await admin.rpc('record_personal_packet_completion', {
      p_cycle_id: cycle.id, p_actor_id: session.user.id, p_evidence: evidence,
      p_packet_path: `${prefix}/packet.txt`, p_packet_sha256: contents.hashes.packet,
    });
    if (completionError || !completed) throw new PacketInputError('COMPLETION_NOT_RECORDED');
    return json({ id: cycle.id, state: 'completed_unbilled', packetSha256: contents.hashes.packet,
      notification: 'in_app_record_only', billingEnabled: false });
  } catch (error) {
    const code = error instanceof PacketInputError ? error.code : 'PACKET_GENERATION_FAILED';
    return json({ error: code }, 503);
  }
}
