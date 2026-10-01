import { createHash } from 'node:crypto';

export const PERSONAL_PACKET_ENGINE_VERSION = 'personal-packet-1';
export const PERSONAL_PACKET_RULESET_VERSION = 'conservative-facts-1';

const sha = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const field = (value: unknown, max = 160): string => typeof value === 'string'
  ? value.replace(/[\r\n\t]+/g, ' ').replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[redacted]')
    .replace(/\s+/g, ' ').trim().slice(0, max)
  : '';
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const money = (value: unknown): string => {
  const amount = Number(value);
  return value !== null && value !== '' && Number.isFinite(amount) && amount >= 0
    ? `$${amount.toFixed(2)}` : 'not provided';
};
const masked = (value: unknown): string => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 4 ? `ending ${digits.slice(-4)}` : 'number not provided';
};

export interface PacketAccount {
  id: string;
  creditor: string;
  bureau: string;
  account: string;
  status: string;
  balance: string;
}

export interface SupportedClaim {
  accountId: string;
  assertion: string;
  evidenceDocumentId: string;
  confirmedByConsumer: boolean;
}

export interface PacketContents {
  sourceSha256: string;
  sourceSnapshot: string;
  accounts: PacketAccount[];
  findings: string;
  actionPlan: string;
  disputeDocuments: string | null;
  noSupportedDispute: string | null;
  packet: string;
  hashes: { findings: string; actionPlan: string; decision: string; packet: string };
}

export class PacketInputError extends Error {
  constructor(readonly code: string) { super(code); }
}

export function normalizePacketAccounts(source: unknown): PacketAccount[] {
  if (!Array.isArray(source) || source.length === 0 || source.length > 500) {
    throw new PacketInputError('MISSING_OR_UNREADABLE_REPORT');
  }
  const accounts = source.map((value, index) => {
    const row = record(value);
    if (!row) throw new PacketInputError('PARSER_FAILURE');
    const creditor = field(row.creditorName ?? row.creditor_name ?? row.furnisherName ?? row.furnisher_name);
    const bureau = field(row.bureau ?? (Array.isArray(row.bureaus) ? row.bureaus[0] : null), 40);
    if (!creditor || !bureau) throw new PacketInputError('PARSER_FAILURE');
    return {
      id: field(row.id, 80) || `account-${index + 1}`,
      creditor,
      bureau,
      account: masked(row.accountNumberMasked ?? row.account_number_masked),
      status: field(row.accountStatus ?? row.status, 80) || 'not provided',
      balance: money(row.balance),
    };
  });
  return accounts.sort((a, b) =>
    `${a.creditor}|${a.account}|${a.bureau}|${a.id}`.localeCompare(`${b.creditor}|${b.account}|${b.bureau}|${b.id}`));
}

export function buildPersonalPacket(input: {
  reportId: string;
  source: unknown;
  inquiries?: unknown;
  publicRecords?: unknown;
  claims: readonly SupportedClaim[];
  cycleStartAt: string;
  cycleEndAt: string;
}): PacketContents {
  const accounts = normalizePacketAccounts(input.source);
  const accountById = new Map(accounts.map(account => [account.id, account]));
  const accountIdCount = new Map<string, number>();
  for (const account of accounts) accountIdCount.set(account.id, (accountIdCount.get(account.id) ?? 0) + 1);
  const summarizeRows = (source: unknown, label: string): string[] => {
    if (source === null || source === undefined) return [];
    if (!Array.isArray(source) || source.length > 200) throw new PacketInputError('PARSER_FAILURE');
    return source.map((value, index) => {
      const row = record(value);
      if (!row) throw new PacketInputError('PARSER_FAILURE');
      const name = field(row.creditorName ?? row.creditor_name ?? row.name ?? row.type, 120);
      const bureau = field(row.bureau, 40) || 'bureau not provided';
      const date = field(row.date ?? row.inquiryDate ?? row.date_filed, 40) || 'date not provided';
      return `${label} ${index + 1}: ${name || 'name not provided'}; ${bureau}; ${date}.`;
    });
  };
  const inquiries = summarizeRows(input.inquiries, 'Inquiry');
  const publicRecords = summarizeRows(input.publicRecords, 'Public record');
  const sourceSnapshot = JSON.stringify({ accounts, inquiries, publicRecords }, null, 2);
  const sourceSha256 = sha(sourceSnapshot);
  const sourceFacts = accounts.map((account, index) =>
    `${index + 1}. ${account.creditor}; ${account.bureau}; ${account.account}; ` +
    `reported status: ${account.status}; reported balance: ${account.balance}.`);
  const groups = new Map<string, PacketAccount[]>();
  for (const account of accounts) {
    if (account.account === 'number not provided') continue;
    const key = `${account.creditor.toLowerCase()}|${account.account}`;
    groups.set(key, [...(groups.get(key) ?? []), account]);
  }
  const inconsistencies: string[] = [];
  for (const group of groups.values()) {
    if (new Set(group.map(item => item.bureau)).size < 2) continue;
    if (new Set(group.map(item => `${item.status}|${item.balance}`)).size > 1) {
      inconsistencies.push(`${group[0].creditor} (${group[0].account}): reported status or balance differs across bureaus. ` +
        'Reporting dates or source formatting may explain the difference; this is not a verified error.');
    }
  }
  const findings = [
    'PERSONAL CREDIT REVIEW — WRITTEN FINDINGS',
    `Service period: ${input.cycleStartAt} through ${input.cycleEndAt}`,
    `Structured source identifier: ${input.reportId}`,
    `Structured source SHA-256: ${sourceSha256}`,
    '', 'SOURCE FACTS (as supplied; not independently verified)',
    ...sourceFacts, ...inquiries, ...publicRecords,
    '', 'DETECTED INCONSISTENCIES (review prompts, not errors)',
    ...(inconsistencies.length ? inconsistencies : ['No cross-bureau inconsistency was detected in the readable data.']),
    '', 'SYSTEM INFERENCES',
    'The items above warrant a consumer review of original reports and records. A difference alone does not establish inaccuracy.',
  ].join('\n');
  const actionPlan = [
    'PERSONAL ACTION PLAN',
    '1. Obtain and retain current reports from the applicable bureaus using free consumer channels.',
    '2. Compare source facts with your own statements and documents; record reporting dates.',
    inconsistencies.length
      ? '3. Prioritize the listed differences for manual review before deciding whether any dispute is warranted.'
      : '3. No inconsistency was detected; review your records for omissions or changes before taking further action.',
    '4. Gather supporting documents for any specific factual claim; do not dispute accurate information.',
    '5. You decide whether to contact a bureau or furnisher. FixMy.Money does not transmit disputes.',
    'No score improvement, removal, investigation result, or credit approval is promised.',
  ].join('\n');
  const supported = input.claims.filter(claim =>
    claim.confirmedByConsumer === true && accountById.has(claim.accountId) &&
    accountIdCount.get(claim.accountId) === 1 &&
    field(claim.assertion, 300).length >= 10 && /^[0-9a-f-]{36}$/i.test(claim.evidenceDocumentId));
  const disputeDocuments = supported.length ? [
    'CONSUMER-DIRECTED DISPUTE DRAFTS — NOT SENT',
    'Use only if the statement remains true after you review your records. You decide whether and where to send a dispute.',
    ...supported.map((claim, index) => {
      const account = accountById.get(claim.accountId)!;
      return `${index + 1}. To: ${account.bureau}\nRe: ${account.creditor}, ${account.account}\n` +
        `I request an investigation of this reported item. My factual concern is: ${field(claim.assertion, 300)}.\n` +
        `Supporting document reference: ${claim.evidenceDocumentId}. Please review the enclosed evidence and report the results to me.\n` +
        'Consumer: review, personalize, and attach your own supporting documents before sending.';
    }),
  ].join('\n\n') : null;
  const noSupportedDispute = supported.length ? null : [
    'NO SUPPORTED DISPUTE CONCLUSION',
    'No specific consumer-confirmed factual claim with a linked supporting document was available for this packet.',
    'Automated flags and cross-bureau differences alone are not a good-faith basis for a dispute draft.',
  ].join('\n');
  const packet = [
    'FIXMY.MONEY — PERSONAL CREDIT REVIEW AND ACTION PACKET',
    'This packet documents a completed review; it is not legal advice or a promise of a credit outcome.',
    '', findings, '', actionPlan, '', disputeDocuments ?? noSupportedDispute!,
  ].join('\n');
  return {
    sourceSha256, sourceSnapshot, accounts, findings, actionPlan, disputeDocuments, noSupportedDispute, packet,
    hashes: {
      findings: sha(findings), actionPlan: sha(actionPlan),
      decision: sha(disputeDocuments ?? noSupportedDispute!), packet: sha(packet),
    },
  };
}
