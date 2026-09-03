# FMM-002 local remediation evidence

Status: **PASS — LOCAL TECHNICAL REMEDIATION; not deployed**

## Approved decisions

- **D-02:** OCR and minimization occur locally/server-side. Raw reports, OCR text, direct identifiers, account numbers, addresses, and unrestricted free text never enter an external-AI request. External processing is limited to the versioned minimized schema, requires current affirmative consent, no-training terms, and configured retention of no more than 30 days.
- **D-03:** New raw/OCR artifacts are not persisted. Historical raw fields and OCR cache objects have a bounded purge path. Normalized service data remains subject to the approved service-necessity, 30-day export/deletion, 12-month content-free audit, 35-day backup-expiry, legal-hold, restoration-replay, and processor-deletion policy.

These technical decisions do not substitute for counsel, privacy-owner, processor/DPA, or independent privacy/security approval.

OpenAI's current data-control documentation states that API data is not used for training unless the customer opts in, default abuse-monitoring logs may retain customer content for up to 30 days, and Zero Data Retention or Modified Abuse Monitoring requires prior approval. The application therefore treats the no-training/retention policy as an explicit fail-closed production configuration gate: https://developers.openai.com/api/docs/guides/your-data

## Minimum data flow and threat controls

1. The signed-in user uploads a report for local/browser or first-party server OCR and deterministic parsing.
2. Raw bytes and OCR text stay out of external-AI routes and are not stored in report tables or OCR cache objects.
3. Optional AI review accepts only a report UUID plus the current disclosure version and affirmative consent.
4. The server loads only the authorized workspace's normalized report fields, maps them to bounded categorical aggregates, and performs a final forbidden-field/identifier check.
5. The server-controlled `credit_report_analysis` operation uses the existing model allowlist, entitlement checks, quotas, rate/concurrency limits, usage accounting, and fail-closed provider behavior. The generic client AI route cannot select this internal operation.
6. The provider response is returned with `private, no-store`, marked for human review, and is not persisted by this flow.

Threats covered: direct raw-file transmission, prompt smuggling through arbitrary text, nested forbidden fields, client-selected model/operation, cross-workspace report lookup, missing/outdated consent, unapproved processor policy, oversized payloads, identifier leakage, and provider/accounting failure.

## Lifecycle controls prepared locally

- Active import paths store normalized fields only and recursively remove raw extraction artifacts from JSON snapshots/tradelines.
- The migration clears historical raw text and nested raw-artifact keys, adds database constraints preventing their reintroduction, and allows the new internal operation in the server usage ledger.
- The bounded storage purge script inventories only `ocr-cache` and `ocr-temp`, defaults to dry-run, requires an explicit execution confirmation, deletes through the Storage API, and verifies zero remaining objects.
- Stored AI usage contains counts/tokens/status only, not report content. Operational enforcement of the approved 12-month ledger retention, 35-day backup expiry/restoration deletion replay, legal holds, verified export/deletion SLA, and downstream processor deletion remains a privacy/counsel release gate shared with FMM-021.

## Production gates

Before deployment: obtain processor/DPA and no-training/retention approval; privacy/counsel approval of disclosure and lifecycle terms; independent privacy/security review; backup/restore confirmation; and separate authorization for the irreversible database/storage purge, migration, runtime policy configuration, feature enablement, and focused synthetic verification. No customer report may be replayed to the provider.

## Local verification

- Focused FMM-002 and containment tests: **19/19 passed**.
- Combined affected AI/OCR regression run: **49/49 passed**.
- TypeScript: **passed**.
- Focused lint: **passed**.
- Production build: **passed**.
- Read-only production metadata query confirmed every table/column required by the prepared migration; no production data or configuration changed.
