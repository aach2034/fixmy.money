# FMM-006 local remediation evidence

Status: **PASS — LOCAL REMEDIATION; not deployed**

FMM-006 now has a bounded private client-document workflow:

- a private `client-documents` bucket with a 10 MB limit, an explicit PDF/JPEG/PNG/WEBP allowlist, and authenticated workspace/relationship-scoped SELECT, INSERT, UPDATE, and DELETE policies;
- server-side metadata and magic-byte validation, same-origin and authenticated portal-relationship authorization, and canonical tenant object paths;
- a pending → durable Storage write → uploaded state machine that cannot report success before Storage and metadata finalization both succeed;
- idempotent completed-upload replay plus compensating object/metadata cleanup for interrupted, Storage-failed, and metadata-finalization-failed attempts;
- 60-second private signed access, with RLS authorization before server-only signing and restricted compatibility for identity-bound legacy paths; and
- restored portal upload/open controls without any public URL creation or direct browser Storage write.

Focused verification:

- FMM-006 validation/storage/failure/authorization tests: **14/14 passed**.
- TypeScript: **PASS**.
- Targeted lint: **PASS** with no findings.
- Vinext production build: **PASS** across all five stages.

The migration was created with pinned Supabase CLI 2.116.0. A live local migration/RLS execution was unavailable because this host has no Docker runtime; production authorization must therefore require a migration dry run/review and same-/cross-tenant synthetic Storage verification before FMM-006 can be considered deployed. No production migration, Storage policy/configuration change, customer-data mutation, or deployment occurred.

Production requires separate authorization to apply `20260903190954_fmm_006_private_client_documents.sql`, deploy the exact FMM-006 commit only after the migration succeeds, exercise same-tenant upload/signed download and cross-tenant denial with synthetic records, verify invalid/oversized/disguised content fails closed, confirm cleanup removes every synthetic object and row, and record independent verification evidence before closure.
