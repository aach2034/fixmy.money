# FMM-001 production deployment evidence

Status: **PASS — awaiting Craig Frankel independent verification**

FMM-001 is deployed but is not formally closed.

## Release

- Reviewed implementation: `f736009d27b49f6724ac98058b78b82e4871c5ab`.
- Production-schema compatibility correction: `015c578ebad959bb1666ca798785a91ea5e007e0`.
- Foreign-key index correction and deployed source: `20c1373df3bd4c486e057be0649331bafe2aa0bc`.
- Sites v165 deployed successfully with runtime environment revision 9.
- Production health reports the server-side OpenAI credential configured, the intended Supabase project connected, and no required environment variables missing.

## Database verification

- Applied `fmm_001_ai_gateway_controls` and `fmm_001_ai_usage_actor_index` successfully.
- Preserved the legacy AI usage ledger under `public.ai_usage_events_legacy_fmm001`; its row count remained 0.
- The new ledger has RLS enabled and denies all table access to `anon` and `authenticated`; reservation and finalization RPCs also deny authenticated execution.
- Service-role-only usage accounting, operation/model validation, request rate, daily/monthly request quotas, token quota, concurrency control, and finalization were exercised inside a production transaction and passed.
- All synthetic usage rows were rolled back; the production ledger remained at 0 rows.
- Post-migration advisors report no missing foreign-key index for the new ledger. Remaining FMM-001 advisor notices are informational: no RLS policy is intentional because client roles have no grants, and new indexes have not yet accumulated usage.

## Application verification

- `https://fixmy.money/` returned HTTP 200.
- An allowlisted request without authentication returned HTTP 401, confirming the gateway is enabled and fails closed on authentication.
- Client-selected model input returned HTTP 400.
- An unallowlisted operation returned HTTP 400.
- Unsupported media type returned HTTP 415.
- An oversized request returned HTTP 413.
- Usage GET without authentication returned HTTP 401; usage mutation returned HTTP 405.
- Relevant Worker invocations completed with outcome `ok`; no runtime exception was observed.
- Local focused tests passed 32/32, TypeScript passed, focused lint passed, and the production build passed.

## Closure gate

Craig Frankel must independently verify the affected AI gateway behavior and report PASS before FMM-001 may be formally marked **PASS / CLOSED**.
