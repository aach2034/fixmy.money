# FMM-007 production verification

Status: **REMEDIATION DEPLOYED — INDEPENDENT RETEST PENDING**

Independent verifier: **Craig Frankel**

Production received the two hash-qualified FMM-007 migrations, Sites version 160 from `b850f4897880e3b362e7ad924321e3a67c631a33`, and `send-email` version 11 with JWT verification and an explicit selected-workspace recipient check.

Verification result:

- 47/47 production tenant-isolation assertions passed in a rollback-only transaction.
- 27/27 workspaces have an active owner membership; 14/14 client dossiers have an explicit workspace-client relationship; 149/149 credit accounts are workspace-bound.
- Cross-workspace reads and writes, mixed-tenant foreign keys, unauthorized invitations, invitation reuse, unauthorized portal relationships, and tenant-key mutation all failed closed.
- No synthetic test rows remained. Existing customer, billing, document, storage-object, Auth user, identity, and session counts remained unchanged.
- Site, Edge Function, Auth, Data API, and Storage logs showed no server errors. Unauthenticated email access returned HTTP 401.

## Independent-verification defect and remediation

Independent verification found that a confirmation link opened outside the browser that initiated signup could confirm the new identity without establishing its PKCE session, after which an older local session resumed. FMM-007 remained open.

The bounded remediation was deployed as Sites version 162 from `e29a538cc84f17dd7368e67c3b4e24432d7821cc`:

- the callback accepts the Supabase-recommended one-time token-hash flow and verifies that the returned access token and session identify the same new user before redirecting;
- failed, missing, or mismatched exchanges clear only local Supabase auth material and stop at sign-in instead of resuming another account;
- auth cookie responses and auth-dependent redirects propagate mandatory private/no-store headers;
- staff and client-portal signups both route through the identity-bound callback; and
- the production Confirm sign up template now uses `RedirectTo` plus `TokenHash`. A reload confirmed the saved production template exactly matches the reviewed source template.

Release checks passed: 10/10 new session-isolation regressions, 43/43 focused auth/readiness checks, TypeScript, targeted lint, and the production build. The complete unrelated application suite remained at 979 passing and the same three pre-existing credit-report assertion failures. Anonymous production smoke tests confirmed missing and invalid verification credentials fail closed, remove only a dummy local auth cookie, and return private/no-store responses. No real account or session was used for deployment validation.

No production customer record, Auth identity, server-side session, billing record, subscription, document, or storage object was deleted or modified by this remediation. Formal closure is prohibited until Craig Frankel personally repeats the new-user verification and records an independent PASS. FMM-004 remains unauthorized.
