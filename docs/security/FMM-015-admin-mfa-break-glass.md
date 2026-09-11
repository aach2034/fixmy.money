# FMM-015 administrator MFA, recovery, and break-glass runbook

Status: source procedure only. Running any production step requires separate, explicit production authorization.

## Control standard

- Keep at least two active administrator identities under independent human control. Each identity must have its own password or identity-provider account and its own verified TOTP factor.
- An active `platform_admins` row is necessary but never sufficient. Protected administrator pages require a verified TOTP factor and an AAL2 session on every request.
- `/admin/security` is the only bootstrap exception. It requires a valid, active database-backed administrator identity and exposes only enrollment, challenge, self-revocation, and self-factor-removal operations.
- Lower-risk customer classification/retention changes may use `requireRecentPlatformAdmin(...)`. Every destructive customer, billing, subscription, refund, deletion, administrator, factor, recovery, break-glass, or session-revocation operation must instead use the two-minute `requireOneTimePlatformAdmin(...)` flow bound to the exact action, target, material parameters, administrator, Supabase `session_id`, and a single-consumption nonce.
- Revocation records database time and every current Supabase session ID before global sign-out. The application and MFA-aware RLS predicate reject explicitly revoked sessions regardless of JWT timestamp or clock skew, and RLS requires at least one server-confirmed factor ID in application-owned administrator state.

## Normal self-service recovery

1. Use a still-working verified factor to complete a fresh TOTP challenge.
2. From `/admin/security`, complete a fresh challenge and authorize removal of the exact factor. The server performs the removal and invokes an idempotent revocation fallback. A trigger on the supported `auth.audit_log_entries` table consumes `factor_unenrolled`/`factor_deleted` events, matches the registered factor ID, clears application-owned MFA eligibility, advances revocation state, and deny-lists current sessions when provider-side removal occurs outside the application. The flow then refreshes and globally signs out the Auth session and destroys local step-up cookies.
3. Sign in again with the administrator's primary credential. The new primary-authentication timestamp must be newer than the revocation epoch.
4. Enroll a replacement authenticator, verify it to reach AAL2, and confirm a protected `/admin` request succeeds.
5. Confirm an older browser session is denied and record the audit event IDs in the incident ticket. Never record OTPs, QR payloads, factor IDs, tokens, cookies, or secrets.

## Break-glass recovery when the normal factor is unavailable

Two people are required: the independently controlled break-glass superadministrator and a security witness. Stop if either identity, the affected user ID, or the incident authorization is ambiguous.

1. Record the incident/ticket ID, affected administrator user ID, reason, approving security owner, witness, and UTC start time. Do not include credentials or customer content.
2. Using the trusted administrative database path, set the affected `platform_admins.active` value to `false` and advance `sessions_revoked_after` to the current database time in one transaction. This immediately denies application and browser-role administrator access.
3. In Supabase Auth administration, revoke the affected user's sessions and initiate the approved password/identity-provider recovery flow. Remove a lost factor only through the Auth administrator control and only after identity verification. Do not delete the Auth user.
4. Verify the affected identity is denied from `/admin`, `/admin/security`, admin server actions, and direct admin-table access. Wait at least one configured JWT lifetime before treating provider-side access-token expiry as complete; the application epoch remains the immediate control.
5. When the primary credential is recovered, set `active = true` while keeping the new revocation epoch. The user may now reach only `/admin/security` until a new TOTP factor is enrolled and challenged.
6. Have the recovered administrator enroll and verify a new TOTP factor. The witness confirms AAL2, a protected admin request, denial from the old session, and a new recent-auth challenge for a sensitive action.
7. Close the incident with immutable audit event IDs, timestamps, actor/witness identities, and results. Rotate any credential or secret actually exposed; do not rotate production secrets merely as a test.

## Lost or compromised break-glass identity

- Keep the affected identity inactive. Use the second independently controlled administrator to perform the same recovery procedure.
- If fewer than two independently controlled verified administrators remain, stop rollout and all administrator mutations. Restore redundancy before continuing.
- If no administrator can authenticate, escalate to the Supabase organization owner through the approved identity-verification/support process. Do not weaken RLS, remove the AAL2 check, create a shared account, or expose the service-role key to regain access.

## Rollback

- Application rollback: restore the previously captured application version and its environment configuration. Do not delete administrator factors, identities, audit events, or the revocation epoch.
- Database rollback is normally unnecessary: the new column is additive and the MFA-aware helper is forward-compatible. Reverting it would re-enable AAL1 direct database access and therefore requires a security incident decision, a maintenance window, and an equivalent compensating access block.
- If a source rollback predates `ADMIN_STEP_UP_SECRET`, keep administrator routes disabled until a reviewed replacement control is available. Never bypass MFA simply to restore availability.

## Verification checklist

- Two independent active administrators, both with verified TOTP.
- Supabase Auth audit-log storage in Postgres is enabled and a test `factor_unenrolled` event reaches the application-owned revocation state before enforcement is activated.
- AAL1, missing-AAL, inactive-role, ordinary-customer, cross-tenant, revoked-session, expired step-up, tampered step-up, and stale-authentication attempts are denied.
- AAL2 plus a fresh TOTP challenge grants a 15-minute session-bound step-up for lower-risk changes only. Destructive authorization expires within two minutes and is exact-intent, action-bound, target-bound, session-bound, and one-time.
- Global sign-out advances the application revocation epoch and old sessions fail immediately.
- Customer/billing/subscription/refund/data-deletion/admin mutation inventory contains no unguarded destructive operation.
- Audit metadata contains no authentication material.
