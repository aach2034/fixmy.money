# FMM-007 production deployment runbook

Status: **DEPLOYED; TECHNICAL VERIFICATION PASS; INDEPENDENT SIGN-OFF PENDING**

Finding: **FMM-007 — Fix workspace/client tenancy**

Production project: `agxzfdyvewptjwdfuvwq`

Production deployment completed: **September 3, 2026 UTC**

## Qualified change set

Apply only these forward migrations, in order:

1. `20260903024247_fmm_007_workspace_client_tenancy.sql`
   - SHA-256: `be6d6e42ccde553f93b7361061f1655c82ba10b3693a98159dc4abd4d5bda41a`
2. `20260903024321_fmm_007_tenant_constraints_and_policies.sql`
   - SHA-256: `0becd086cae722580315ca7437686c4259bb4fec362b4781e73d08a36bb6fa0f`

Then deploy the matching application and `send-email` Edge Function changes from the same reviewed revision. Do not replay any older migration, use a destructive schema reset, delete or merge a customer row, move a storage object, or modify billing or subscription state.

## Accepted preflight

Read-only production checks on September 2, 2026 established:

- 27 Auth users, profiles, workspaces, and distinct workspace owners;
- 14 client dossiers across 11 owners, with no missing workspace or owner/workspace mismatch;
- zero existing portal-account, portal-record, portal-document, or chat rows;
- 149 credit-account rows with a valid client/owner chain and a safely derivable workspace;
- 13 existing Evidence storage objects whose six UUID prefixes all identify current workspace owners; and
- zero mismatches in credit accounts, report uploads, dispute letters, client dossiers, storage prefixes, or workspace-owner uniqueness.

The migration package preserved these shapes in a disposable production-shaped database and passed all 47 tenant-isolation assertions. TypeScript, the production build, and 21 focused application tests also passed.

## Controlled deployment sequence

1. Name the production operator and independent verifier, confirm a current recoverable database backup/PITR point, and record the reviewed application revision and SHA-256 hashes of both migration files.
2. Repeat the read-only preflight counts and mismatch queries. Stop if any value differs from the accepted preflight unless the difference is explained and independently reviewed.
3. Record protected row counts and hashes for customer, Auth, billing, subscription, document, storage, and session state.
4. Apply migration 1 in its own controlled transaction. Confirm 27 owner memberships, 14 workspace-client relationships, zero rejected or ambiguous mappings, and unchanged protected row counts.
5. Apply migration 2 in its own controlled transaction. Confirm all 149 credit accounts received the workspace derived from their existing client/owner chain and that every constraint, trigger, grant, and RLS policy is present.
6. Deploy the matching application and `send-email` Edge Function changes together. Do not remove maintenance mode as part of FMM-007.
7. Run the 47-assertion database tenant-isolation suite plus authenticated smoke tests for owner, admin, specialist, viewer, multi-workspace staff, portal consumer, shared consumer across agencies, and unrelated user.
8. Verify invitation tokens are stored only as SHA-256 digests, can be accepted once only by the intended verified Auth email, and bind the exact workspace/client relationship.
9. Re-run security and performance advisors, production integrity queries, protected row counts/hashes, storage counts, and application/Edge Function logs. Obtain independent-verifier sign-off before marking FMM-007 closed.

## Mandatory stop conditions

Stop without further production changes if any migration errors, a preflight mismatch, an ambiguous mapping, a missing identity/workspace binding, a protected-row count or hash change, an unexpected storage-path change, or any successful cross-tenant access is observed. Stop if rollback readiness, the named operator, or the independent verifier is unavailable.

## Deployment result

- Both qualified migrations were applied atomically under the production ledger versions shown above; their SQL hashes remain unchanged.
- The application was published as Sites version 160 from reviewed revision `b850f4897880e3b362e7ad924321e3a67c631a33`; maintenance mode remains enabled.
- `send-email` version 11 is active with JWT verification enabled. A release-gate finding was resolved before deployment by requiring an explicit selected-workspace match in addition to RLS for client notifications.
- Production passed all 47 tenant-isolation assertions in a rollback-only transaction. The owner, admin, specialist, viewer, multi-workspace staff, portal, shared-portal, invitation, unrelated-user, storage, and mixed-tenant constraint cases passed.
- Production contains 27 workspace memberships, 14 workspace-client relationships, and 149/149 workspace-bound credit accounts, with zero binding mismatches and zero retained synthetic test rows.
- Existing customer, billing, document, storage-object, Auth user, identity, and session counts remained unchanged. One refresh token was independently created during the verification window; FMM-007 did not delete, revoke, rewrite, or create that token.
- Recent Site, Edge Function, Auth, Data API, and Storage logs showed no server errors. The email endpoint rejected an unauthenticated request with HTTP 401.
- The security advisor reports five expected authenticated `SECURITY DEFINER` RPC warnings. Each function is intentionally authenticated-only, has fixed search path and internal tenant/identity checks, and passed the production isolation matrix. Performance advisories are non-blocking and remain outside FMM-007.

## Closure boundary

Craig Frankel remains the named independent verifier. Engineering deployment and operator verification are complete, but FMM-007 must not be marked formally closed until Craig records an independent PASS. This runbook does not authorize FMM-004, billing changes, entitlement changes, customer deletion, Auth/session deletion, document deletion, storage-object deletion, or any other audit finding.
