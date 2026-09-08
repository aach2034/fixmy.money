import type { BuiltConsumerLetter } from './consumerLetter';

interface AuditInsertResult {
  error: { message?: string } | null;
}

interface AuditClient {
  from(table: 'audit_logs'): {
    insert(value: Record<string, unknown>): PromiseLike<AuditInsertResult>;
  };
}

export function buildLetterProvenanceAuditRow(params: {
  ownerId: string;
  clientId: string;
  actorEmail?: string;
  letterRecordId: string;
  letterReference: string;
  letterTable: 'dispute_letters' | 'generated_dispute_letters';
  letter: BuiltConsumerLetter;
}) {
  return {
    owner_id: params.ownerId,
    client_id: params.clientId,
    action: 'dispute_generated',
    actor_name: '',
    actor_email: params.actorEmail ?? '',
    actor_ip: '',
    description: `Evidence-specific ${params.letter.bureau} dispute draft generated`,
    metadata: {
      schema_version: 1,
      letter_table: params.letterTable,
      letter_record_id: params.letterRecordId,
      letter_reference: params.letterReference,
      bureau: params.letter.bureau,
      paragraph_count: params.letter.provenance.length,
      paragraphs: params.letter.provenance,
      attachments: params.letter.attachments.map(attachment => ({ id: attachment.id, label: attachment.label })),
    },
  };
}

export async function recordLetterProvenance(client: AuditClient, params: Parameters<typeof buildLetterProvenanceAuditRow>[0]) {
  const { error } = await client.from('audit_logs').insert(buildLetterProvenanceAuditRow(params));
  if (error) throw new Error(`Letter provenance could not be recorded: ${error.message ?? 'unknown audit error'}`);
}
