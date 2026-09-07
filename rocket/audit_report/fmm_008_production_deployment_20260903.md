# FMM-008 production deployment verification

Status: **PASS / CLOSED**

Authorized commit `bc8abf3bea33f2e7b471312479feea554ed5153a` was deployed as Sites version 168 (deployment `appgdep_6a99f4fd92bc8191b6278a217f7db96d`). The public deployment completed successfully at `https://fixmy-money.adamchamilton.chatgpt.site` using production environment revision 10.

Migration, recovery, and scheduling controls:

- Confirmed a restorable production physical schema/database backup from September 3, 2026 at 04:10:47 UTC before applying schema changes.
- Applied `20260903205959_fmm_008_durable_stripe_webhooks.sql` as recorded production migration `20260903222256_fmm_008_durable_stripe_webhooks` while preserving customer data.
- Configured `STRIPE_WEBHOOK_WORKER_SECRET` as a secret 48-byte random value; the value is not recorded in this evidence.
- Enabled the authenticated one-minute worker schedule as recorded migration `20260903223300_fmm_008_worker_schedule`. Cron job 1 is active, obtains its bearer credential from Supabase Vault, and targets `POST https://fixmy.money/api/internal/stripe/webhook-jobs`.
- A post-cleanup scheduled request returned HTTP 200. Intentional synthetic processing failures returned HTTP 503, providing the required failure signal while cron execution itself remained healthy.
- Production business-row counts were preserved: 92 billing events, 29 workspace entitlements, and 30 workspaces before and after verification.

Focused synthetic production verification: **PASS**

- durable event persistence and authenticated worker processing: PASS;
- unauthenticated worker rejection (HTTP 401): PASS;
- entitlement-binding failure retry with increasing attempt count and HTTP 503 visibility: PASS;
- duplicate event idempotency (one durable row): PASS;
- same-customer concurrency lock and older-before-newer completion: PASS;
- dead-letter transition, controlled replay, and successful completion: PASS;
- email outbox failure, retry, and successful completion: PASS;
- platform-admin failure visibility with anonymous denial: PASS; and
- synthetic cleanup: PASS — zero synthetic event, lock, outbox, or failure rows remain; the pre-test `webhook_failures` count of zero was restored.

The post-DDL security review produced no new FMM-008 warning/error. Informational notices reflect the intentional service-role-only RLS posture on internal queue tables; browser roles have no table privileges. The new outbox foreign-key index advisory is informational and does not affect correctness of this bounded deployment.

## Independent verification

On September 3, 2026, Craig Frankel independently verified FMM-008 in production and reported **PASS**. This satisfies the final closure gate; FMM-008 is formally **PASS / CLOSED**.
