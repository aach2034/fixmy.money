# FMM-007 workspace/client tenancy model

Status: **DESIGN FROZEN BEFORE IMPLEMENTATION**

Finding: **FMM-007 — Client portal tenancy is modeled globally by email**

Production mutation: **NONE**

## Finding and current-state conclusion

The original audit found that `client_accounts.email` was a global identity and an agency/client relationship at the same time. Portal authorization matched the Auth JWT email to that row, while specialist authorization matched the same email to `staff_clients`. A single consumer working with two agencies is therefore ambiguous, and source code has no authoritative staff membership relation.

FMM-003 removed the broad clean-replay policies but intentionally preserved this email-keyed portal model. FMM-007 must replace the model rather than add more email predicates.

Read-only production evidence captured on September 2, 2026 shows:

- 27 Auth users, 27 profiles, and 27 owner workspaces;
- 14 legitimate `staff_clients` rows, all with a non-null workspace and no owner/workspace mismatch;
- one normalized client email occurring on four `staff_clients` rows across multiple owners, proving email is not a tenant key;
- zero `client_accounts`, portal disputes, portal documents, portal updates, timeline events, conversations, or messages;
- zero owner/client mismatches across the 25 populated or available downstream client-record tables checked;
- 149 `credit_accounts` rows whose `workspace_id` is null but whose client and owner chains are internally consistent; and
- no `workspace_memberships` or `workspace_client_memberships` relation.

## Authoritative boundary model

1. `auth.users.id` identifies a human. It is never a tenant identifier.
2. `workspaces.id` is the tenant boundary.
3. `workspace_memberships` grants a human an explicit role in one workspace. Roles are `owner`, `admin`, `specialist`, and `viewer`; only active memberships authorize access.
4. `staff_clients` is a workspace-scoped agency dossier. Its `workspace_id` is mandatory. Its legacy `owner_id` remains during compatibility migration but must equal the workspace owner and must not drive authorization.
5. `client_accounts` is a portal consumer identity. It binds to Auth by immutable `auth_user_id`, never by JWT email.
6. `workspace_client_memberships` is the agency/consumer relationship. It joins exactly one workspace dossier to zero or one portal identity. One portal identity may have separate memberships with multiple agencies.
7. Portal records identify their exact `workspace_client_membership` and workspace. Cross-column foreign keys make it impossible to combine an identity, dossier, and workspace from different tenants.
8. Owner/admin/specialist staff access is derived from `workspace_memberships`; viewer is read-only. Portal access is derived only from `client_accounts.auth_user_id` plus the exact active workspace-client relationship.
9. Service-role operations must validate the authenticated actor and exact workspace/client relationship before using the RLS-bypassing client. Stripe/background events may resolve a workspace only from trusted server-side identifiers.
10. Email remains contact information and a one-time migration/invitation lookup aid. It is never accepted as an authorization predicate.
11. Invitations store only a one-time token digest. Acceptance requires a signed-in Auth identity whose verified account email matches the intended recipient, then binds that immutable Auth UUID to the exact relationship.
12. Evidence/OCR storage keeps the existing workspace-owner path prefix so the 13 current production objects need no move or rename; access follows the selected workspace rather than the staff actor.

## Authorization matrix

| Actor | Workspace metadata | Memberships | Client dossiers and operational records | Portal records | Billing/system events |
|---|---|---|---|---|---|
| Owner | Read/update own workspace | Administer non-owner members | Read/write/delete | Read/write/delete | Read |
| Admin | Read/update | Read and manage non-owner members | Read/write/delete | Read/write/delete | Read |
| Specialist | Read | Read | Read/write, no tenant reassignment | Read/write operational content | No direct write |
| Viewer | Read | Read | Read-only | Read-only staff view | Read-only where already supported |
| Portal consumer | No staff workspace access | No staff membership access | No direct dossier access | Only records for the exact linked relationship; limited self-service updates | None |
| Unrelated authenticated user | None | Own membership rows only | None | None | None |
| Anonymous user | None | None | None | None | None |
| Service role | Server workflows only | Server workflows only | Must be preceded by explicit actor/tenant validation for user-triggered work | Server workflows only | Trusted webhook/background paths |

## Affected data paths

### Identity and workspace anchors

- `auth.users`, `user_profiles`, `workspaces`, `handle_new_user()`
- `src/contexts/AuthContext.tsx`
- `src/proxy.ts`
- `src/app/auth/callback/route.ts`
- `src/app/onboarding/components/OnboardingContent.tsx`
- `src/app/workspace-setup/components/WorkspaceSetupContent.tsx`

### Client relationship and portal

- `staff_clients`, `client_accounts`, `workspace_client_memberships`, `workspace_invitations`
- `client_disputes`, `dispute_timeline_events`, `client_updates`, `client_documents`
- `chat_conversations`, `chat_messages`
- `src/app/client-management/components/AddClientForm.tsx`
- `src/app/client-portal/components/ClientPortalDashboardContent.tsx`
- `src/app/client-portal/components/ClientChatWidget.tsx`
- `src/app/client-portal/components/ClientPortalLoginContent.tsx`
- `src/app/api/workspaces/client-invitations/route.ts`
- `src/app/live-chat/components/LiveChatContent.tsx`

### Client-owned downstream records

The following tables carry a `client_id` relationship to `staff_clients` and/or a legacy owner column and must not accept mixed-tenant pairs:

`audit_logs`, `bureau_tradelines`, `cancellation_periods`, `case_events`, `compliance_disclosures`, `credit_accounts`, `credit_cases`, `credit_report_imports`, `credit_report_snapshots`, `croa_contracts`, `detected_issues`, `dispute_letters`, `dispute_round_items`, `dispute_rounds`, `disputes`, `escalations`, `evidence_documents`, `evidence_facts`, `generated_dispute_letters`, `import_comparisons`, `investigation_results`, `negative_items`, `parsed_credit_reports`, `report_comparisons`, and `report_snapshots`.

The main browser consumers are under `src/app/client-management`, `src/app/clients`, `src/app/credit-audit`, `src/app/credit-report-import`, `src/app/dispute-letter-management`, `src/app/dispute-wizard`, `src/app/disputes`, dashboard widgets, notifications, and revenue forecasting.

### RLS-bypassing user-triggered API paths

These routes authenticate a bearer token and then use the service role, so every requested client/report/import/mailing ID must be rebound to an authorized workspace before any read or write:

- `src/app/api/credit-report/import-upload/route.ts`
- `src/app/api/credit-report/parse-report/route.ts`
- `src/app/api/credit-report/tag-and-save/route.ts`
- `src/app/api/credit-report/evidence-engine/route.ts`
- `src/app/api/credit-report/reparse-saved/route.ts`
- `src/app/api/credit-report/repair-adam-hamilton/route.ts`
- `src/app/api/mailings/certified/purchase/route.ts`
- `src/app/api/mailings/certified/[mailingId]/track/route.ts`

### Server/background paths

- `src/app/api/stripe/webhook/route.ts` resolves workspaces from trusted Stripe customer linkage.
- `src/lib/analytics/server.ts` and `src/lib/admin/acquisitionAnalytics.ts` use server credentials and must retain explicit user/workspace bindings.
- `src/lib/admin/customerManagement.ts` is platform-admin scoped and remains separate from workspace membership.
- `supabase/functions/send-email/index.ts` must not infer tenant authorization from the recipient email.
- Test seeding and teardown must target isolated test projects only and use exact synthetic identifiers.

## Non-destructive migration strategy

The migration is expand-and-bind only:

1. Add the staff and client membership relations, hashed invitation relation, and role/status types.
2. Backfill one active owner membership for every existing workspace.
3. Validate and make `staff_clients.workspace_id` mandatory; add composite constraints that bind its legacy owner to the workspace owner.
4. Add one workspace-client relationship for every existing client dossier without deleting or merging any dossier.
5. Add `client_accounts.auth_user_id`; backfill it only from an unambiguous Auth identity.
6. Add explicit relationship/workspace keys to portal tables. Abort rather than guess if historical portal rows cannot be mapped to exactly one relationship.
7. Replace email- and owner-only portal policies with role/relationship policies backed by private, fixed-search-path helpers.
8. Add composite owner/client constraints to downstream tables so mixed-tenant pairs cannot be written even by an application bug.
9. Update the client portal and RLS-bypassing API routes to use immutable IDs and centralized workspace authorization.
10. Add safe workspace selection, exact portal-relationship selection, invitation acceptance, and workspace-bound storage policies without exposing membership or token internals.
11. Preserve all legacy IDs and columns during the compatibility phase. No production table, customer, Auth user, document, billing record, storage object, or session is deleted.

## Stop conditions

Stop before production if any of these is true:

- a portal row maps to zero or more than one workspace-client relationship;
- an existing owner/client/workspace chain is inconsistent;
- a required workspace or Auth binding is missing;
- row-count or row-hash preservation fails;
- a cross-workspace read/write/delete test succeeds;
- a service-role route can use a user-supplied ID without an exact membership check;
- a production backup, rollback plan, operator, or independent verifier is absent; or
- applying the migration would require deletion, merging, or guessed reassignment of customer data.

Billing entitlements, customer charges, subscription state, and FMM-004 are not changed by this finding. Workspace switching and portal invitations are included only to make the new tenant boundary usable end to end.
