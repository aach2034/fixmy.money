import { AIGatewayError } from "@/lib/ai/gateway";

export const FMM002_DISCLOSURE_VERSION = "fmm-002-d02-v1" as const;
export const FMM002_EXTERNAL_SCHEMA_VERSION = "fmm-002-minimized-v1" as const;
export const FMM002_MAX_EXTERNAL_PAYLOAD_CHARS = 3_500;

const MAX_ACCOUNT_GROUPS = 12;
const MAX_EXTERNAL_FINDINGS = 8;
const MAX_SOURCE_ACCOUNTS = 500;
const MAX_SOURCE_ITEMS = 200;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RAW_ARTIFACT_KEYS = new Set([
  "rawText",
  "raw_text",
  "raw_text_source",
  "textContent",
  "unparsedBlocks",
  "rawBlocks",
  "blockDispositions",
  "normalizedText",
]);

type BureauClass = "equifax" | "experian" | "transunion" | "multiple" | "unknown";
type ProviderClass =
  | "annualcreditreport"
  | "equifax"
  | "experian"
  | "identityiq"
  | "myfreescorenow"
  | "myscoreiq"
  | "privacyguard"
  | "smartcredit"
  | "transunion"
  | "other";
type ConfidenceBand = "low" | "medium" | "high" | "unknown";
type ScoreBand = "poor" | "fair" | "good" | "very_good" | "exceptional" | "unknown";
type AccountClass = "revolving" | "installment" | "mortgage" | "auto" | "student_loan" | "collection" | "other";
type StatusClass = "current" | "late" | "collection" | "charge_off" | "closed" | "unknown";
type AmountBand = "zero" | "under_500" | "500_1999" | "2000_9999" | "10000_plus" | "unknown";
type RiskFlag = "negative" | "collection" | "charge_off" | "late";
type EvidenceStrength = "strong" | "moderate" | "insufficient" | "unknown";
type EvidenceReference = "cross_bureau_report_comparison" | "report_derived_candidate";
type EvidenceNeededCategory =
  | "consumer_confirmation"
  | "account_agreement"
  | "billing_statement"
  | "payment_record"
  | "furnisher_record"
  | "investigation_response"
  | "other_document";

export interface CreditReportAnalysisRequest {
  parsedReportId: string;
  consent: true;
  disclosureVersion: typeof FMM002_DISCLOSURE_VERSION;
}

export interface MinimizedExternalReportV1 {
  schemaVersion: typeof FMM002_EXTERNAL_SCHEMA_VERSION;
  providerClass: ProviderClass;
  extractionConfidence: ConfidenceBand;
  scoreBands: Array<{ bureau: BureauClass; band: ScoreBand }>;
  accountGroups: Array<{
    bureau: BureauClass;
    accountClass: AccountClass;
    statusClass: StatusClass;
    balanceBand: AmountBand;
    pastDueBand: AmountBand;
    flags: RiskFlag[];
    count: number;
  }>;
  omittedAccountGroups: number;
  hardInquiryCounts: Array<{ bureau: BureauClass; count: number }>;
  publicRecordCount: number;
}

export interface MinimizedExternalFindingV1 {
  reference: `finding-${number}`;
  issueType: string;
  affectedBureaus: BureauClass[];
  confidence: ConfidenceBand;
  evidenceStrength: EvidenceStrength;
  evidenceReferences: EvidenceReference[];
  evidenceNeededCategories: EvidenceNeededCategory[];
}

const ALLOWED_ISSUE_TYPES = new Set([
  "balance_discrepancy",
  "status_discrepancy",
  "charge_off_status_discrepancy",
  "collection_status_discrepancy",
  "payment_status_discrepancy",
  "past_due_discrepancy",
  "high_balance_discrepancy",
  "credit_limit_discrepancy",
  "date_discrepancy",
  "collection_activity_before_opening",
  "last_payment_date_discrepancy",
  "account_type_discrepancy",
  "responsibility_discrepancy",
  "payment_history_discrepancy",
  "remarks_discrepancy",
  "potential_duplicate_obligation",
  "potentially_obsolete_reporting",
  "original_creditor_discrepancy",
  "collection_balance_discrepancy",
  "paid_account_reporting_balance",
  "open_after_documented_closure",
  "late_payment_discrepancy",
  "ownership_identity_review",
  "mixed_file_indicator",
  "potential_reinsertion",
  "post_dispute_material_change",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

function finiteNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function boundedCount(value: number): number {
  return Math.max(0, Math.min(10_000, Math.trunc(value)));
}

function bureauClass(value: unknown): BureauClass {
  const normalized = String(value ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.includes("equifax")) return "equifax";
  if (normalized.includes("experian")) return "experian";
  if (normalized.includes("transunion")) return "transunion";
  if (normalized.includes("multiple")) return "multiple";
  return "unknown";
}

function providerClass(value: unknown): ProviderClass {
  const normalized = String(value ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const allowed = new Set<ProviderClass>([
    "annualcreditreport",
    "equifax",
    "experian",
    "identityiq",
    "myfreescorenow",
    "myscoreiq",
    "privacyguard",
    "smartcredit",
    "transunion",
  ]);
  return allowed.has(normalized as ProviderClass) ? normalized as ProviderClass : "other";
}

function confidenceBand(value: unknown): ConfidenceBand {
  const numeric = finiteNumber(value);
  if (numeric === null) return "unknown";
  if (numeric < 50) return "low";
  if (numeric < 75) return "medium";
  return "high";
}

function scoreBand(value: unknown): ScoreBand {
  const numeric = finiteNumber(value);
  if (numeric === null || numeric < 300 || numeric > 850) return "unknown";
  if (numeric < 580) return "poor";
  if (numeric < 670) return "fair";
  if (numeric < 740) return "good";
  if (numeric < 800) return "very_good";
  return "exceptional";
}

function accountClass(value: unknown): AccountClass {
  const normalized = String(value ?? "").toLowerCase();
  if (/collection/.test(normalized)) return "collection";
  if (/mortgage|home loan/.test(normalized)) return "mortgage";
  if (/auto|vehicle/.test(normalized)) return "auto";
  if (/student/.test(normalized)) return "student_loan";
  if (/revolv|credit card|charge card/.test(normalized)) return "revolving";
  if (/installment|personal loan/.test(normalized)) return "installment";
  return "other";
}

function statusClass(account: Record<string, unknown>): StatusClass {
  if (account.isCollection === true || account.is_collection === true) return "collection";
  if (account.isChargeOff === true || account.is_charge_off === true) return "charge_off";
  if (account.isLate === true || account.is_late === true) return "late";
  const normalized = String(account.accountStatus ?? account.status ?? "").toLowerCase();
  if (/charge.?off/.test(normalized)) return "charge_off";
  if (/collection/.test(normalized)) return "collection";
  if (/late|delinquent|past due/.test(normalized)) return "late";
  if (/closed|paid/.test(normalized)) return "closed";
  if (/current|open|satisfactory/.test(normalized)) return "current";
  return "unknown";
}

function amountBand(value: unknown): AmountBand {
  const numeric = finiteNumber(value);
  if (numeric === null || numeric < 0) return "unknown";
  if (numeric === 0) return "zero";
  if (numeric < 500) return "under_500";
  if (numeric < 2_000) return "500_1999";
  if (numeric < 10_000) return "2000_9999";
  return "10000_plus";
}

function riskFlags(account: Record<string, unknown>): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (account.isNegative === true || account.is_negative === true) flags.push("negative");
  if (account.isCollection === true || account.is_collection === true) flags.push("collection");
  if (account.isChargeOff === true || account.is_charge_off === true) flags.push("charge_off");
  if (account.isLate === true || account.is_late === true) flags.push("late");
  return flags;
}

function evidenceNeededCategory(value: unknown): EvidenceNeededCategory {
  const normalized = String(value ?? "").toLowerCase();
  if (/consumer|confirm|identity/.test(normalized)) return "consumer_confirmation";
  if (/agreement|contract/.test(normalized)) return "account_agreement";
  if (/statement|invoice/.test(normalized)) return "billing_statement";
  if (/payment|receipt|bank record/.test(normalized)) return "payment_record";
  if (/furnisher|creditor|account record/.test(normalized)) return "furnisher_record";
  if (/investigation|response|result/.test(normalized)) return "investigation_response";
  return "other_document";
}

export function parseCreditReportAnalysisRequest(value: unknown): CreditReportAnalysisRequest {
  if (!isRecord(value) || !hasExactKeys(value, ["consent", "disclosureVersion", "parsedReportId"])) {
    throw new AIGatewayError(
      "REPORT_AI_INVALID_REQUEST",
      400,
      "Expected only parsedReportId, consent, and disclosureVersion.",
    );
  }
  if (typeof value.parsedReportId !== "string" || !UUID_PATTERN.test(value.parsedReportId)) {
    throw new AIGatewayError("REPORT_AI_INVALID_REQUEST", 400, "Invalid parsed report identifier.");
  }
  if (value.consent !== true || value.disclosureVersion !== FMM002_DISCLOSURE_VERSION) {
    throw new AIGatewayError(
      "REPORT_AI_CONSENT_REQUIRED",
      400,
      "Current report-analysis disclosure consent is required.",
    );
  }
  return {
    parsedReportId: value.parsedReportId,
    consent: true,
    disclosureVersion: FMM002_DISCLOSURE_VERSION,
  };
}

export function stripRawReportArtifacts<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => stripRawReportArtifacts(item)) as T;
  }
  if (!isRecord(value)) return value;

  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!RAW_ARTIFACT_KEYS.has(key)) sanitized[key] = stripRawReportArtifacts(item);
  }
  return sanitized as T;
}

export function minimizeReportForExternalAI(value: unknown): MinimizedExternalReportV1 {
  if (!isRecord(value)) {
    throw new AIGatewayError("REPORT_AI_DATA_INVALID", 422, "Stored report data is invalid.");
  }

  const sourceScores = Array.isArray(value.scores) ? value.scores.slice(0, MAX_SOURCE_ITEMS) : [];
  const scoreMap = new Map<BureauClass, ScoreBand>();
  for (const item of sourceScores) {
    if (!isRecord(item)) continue;
    const bureau = bureauClass(item.bureau);
    if (bureau === "unknown") continue;
    scoreMap.set(bureau, scoreBand(item.score ?? item.value));
  }

  const sourceAccounts = Array.isArray(value.accounts)
    ? value.accounts.slice(0, MAX_SOURCE_ACCOUNTS)
    : Array.isArray(value.all_accounts)
      ? value.all_accounts.slice(0, MAX_SOURCE_ACCOUNTS)
      : [];
  const groups = new Map<string, MinimizedExternalReportV1["accountGroups"][number]>();
  for (const item of sourceAccounts) {
    if (!isRecord(item)) continue;
    const group = {
      bureau: bureauClass(item.bureau),
      accountClass: accountClass(item.accountType ?? item.account_type),
      statusClass: statusClass(item),
      balanceBand: amountBand(item.balance),
      pastDueBand: amountBand(item.pastDue ?? item.past_due),
      flags: riskFlags(item),
      count: 1,
    } satisfies MinimizedExternalReportV1["accountGroups"][number];
    const key = JSON.stringify({ ...group, count: undefined });
    const existing = groups.get(key);
    if (existing) existing.count = boundedCount(existing.count + 1);
    else groups.set(key, group);
  }

  const allGroups = [...groups.values()];
  const sourceInquiries = Array.isArray(value.inquiries)
    ? value.inquiries.slice(0, MAX_SOURCE_ITEMS)
    : Array.isArray(value.all_inquiries)
      ? value.all_inquiries.slice(0, MAX_SOURCE_ITEMS)
      : [];
  const inquiryCounts = new Map<BureauClass, number>();
  for (const item of sourceInquiries) {
    if (!isRecord(item)) continue;
    if (String(item.type ?? "hard").toLowerCase() !== "hard") continue;
    const bureau = bureauClass(item.bureau);
    inquiryCounts.set(bureau, boundedCount((inquiryCounts.get(bureau) ?? 0) + 1));
  }

  const sourcePublicRecords = Array.isArray(value.publicRecords)
    ? value.publicRecords
    : Array.isArray(value.public_records)
      ? value.public_records
      : [];
  const payload: MinimizedExternalReportV1 = {
    schemaVersion: FMM002_EXTERNAL_SCHEMA_VERSION,
    providerClass: providerClass(value.provider ?? value.detectedProvider),
    extractionConfidence: confidenceBand(value.overall_confidence ?? value.overallConfidence),
    scoreBands: [...scoreMap.entries()].map(([bureau, band]) => ({ bureau, band })),
    accountGroups: allGroups.slice(0, MAX_ACCOUNT_GROUPS),
    omittedAccountGroups: Math.max(0, allGroups.length - MAX_ACCOUNT_GROUPS),
    hardInquiryCounts: [...inquiryCounts.entries()].map(([bureau, count]) => ({ bureau, count })),
    publicRecordCount: boundedCount(sourcePublicRecords.length),
  };
  assertMinimizedReportIsSafe(payload);
  return payload;
}

export function assertMinimizedReportIsSafe(payload: MinimizedExternalReportV1): void {
  const serialized = JSON.stringify(payload);
  if (serialized.length > FMM002_MAX_EXTERNAL_PAYLOAD_CHARS) {
    throw new AIGatewayError("REPORT_AI_PAYLOAD_TOO_LARGE", 413, "Minimized report exceeds the provider limit.");
  }
  const forbiddenKeys = /"(?:rawText|raw_text|raw_text_source|textContent|name|ssn|dob|address|accountNumber|account_number|creditor|furnisher|remarks|notes)"\s*:/i;
  const identifierPatterns = /\b\d{3}-\d{2}-\d{4}\b|\b\d{12,19}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
  if (forbiddenKeys.test(serialized) || identifierPatterns.test(serialized)) {
    throw new AIGatewayError("REPORT_AI_MINIMIZATION_FAILED", 422, "Report minimization failed closed.");
  }
}

export function minimizeFindingsForExternalAI(value: unknown): MinimizedExternalFindingV1[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_EXTERNAL_FINDINGS).flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const rawIssueType = String(item.issue_type ?? "").toLowerCase();
    const issueType = ALLOWED_ISSUE_TYPES.has(rawIssueType)
      ? rawIssueType
      : "potential_reporting_discrepancy";
    const rawBureaus = Array.isArray(item.affected_bureaus) ? item.affected_bureaus : [];
    const affectedBureaus = [...new Set(rawBureaus.map(bureauClass))]
      .filter(bureau => bureau !== "unknown");
    const rawStrength = String(item.evidence_strength ?? "").toLowerCase();
    const evidenceStrength: EvidenceStrength = ["strong", "moderate", "insufficient"].includes(rawStrength)
      ? rawStrength as EvidenceStrength
      : "unknown";
    const availableEvidence = Array.isArray(item.evidence_currently_available)
      ? item.evidence_currently_available
      : [];
    const evidenceReferences: EvidenceReference[] = availableEvidence.length > 0 || affectedBureaus.length > 1
      ? ["cross_bureau_report_comparison"]
      : ["report_derived_candidate"];
    const rawNeeded = Array.isArray(item.evidence_still_needed) ? item.evidence_still_needed : [];
    const evidenceNeededCategories = [...new Set(rawNeeded.map(evidenceNeededCategory))].slice(0, 4);

    return [{
      reference: `finding-${index + 1}` as const,
      issueType,
      affectedBureaus,
      confidence: confidenceBand(item.confidence_level),
      evidenceStrength,
      evidenceReferences,
      evidenceNeededCategories,
    }];
  });
}

export function buildExternalReportPrompt(
  payload: MinimizedExternalReportV1,
  findings: MinimizedExternalFindingV1[] = [],
): string {
  assertMinimizedReportIsSafe(payload);
  const prompt = [
    "Review only the supplied candidate findings against the minimized report summary.",
    "Do not invent facts, findings, evidence, accounts, or issue categories. Do not flag anything not listed as a candidate.",
    "An anomaly is not automatically a dispute. Do not decide which bureau is correct unless the supplied evidence proves it.",
    "For each supported candidate, cite its finding reference and one supplied evidence reference. State evidence limits and that a human must review before dispute preparation.",
    "End with exactly: ADDITIONAL_FINDINGS: none",
    JSON.stringify({ reportSummary: payload, candidateFindings: findings }),
  ].join("\n");
  const forbidden = /\b\d{3}-\d{2}-\d{4}\b|\b\d{12,19}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
  if (prompt.length > 4_000 || forbidden.test(prompt)) {
    throw new AIGatewayError("REPORT_AI_MINIMIZATION_FAILED", 422, "Report minimization failed closed.");
  }
  return prompt;
}

export function isReportAIProcessorPolicyApproved(env: NodeJS.ProcessEnv = process.env): boolean {
  const retentionDays = Number(env.REPORT_AI_PROCESSOR_RETENTION_DAYS);
  return env.REPORT_AI_PROCESSOR_POLICY_VERSION === FMM002_DISCLOSURE_VERSION
    && env.REPORT_AI_PROCESSOR_NO_TRAINING === "true"
    && Number.isInteger(retentionDays)
    && retentionDays >= 0
    && retentionDays <= 30;
}
