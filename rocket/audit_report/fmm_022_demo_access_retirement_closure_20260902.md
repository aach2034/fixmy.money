# FMM-022 demo-access retirement — closure

Status: **PASS / CLOSED**

Production action date: **2026-09-02**

Independent verifier: **Craig Frankel — PASS**

## Authorized target and preflight

- Exactly one historical demo Auth user matched `client@demo.com` (restricted operator evidence recorded the full UUID).
- The account was classified as demo-only and had one Auth session, one unrevoked refresh token, and 34 application rows: one demo profile plus 33 dependent fixture rows.
- The 33 dependent rows were one workspace, 12 staff-client fixtures, 12 dispute-letter fixtures, six bureau-summary fixtures, one dashboard-metrics fixture, and one analytics event.
- Preflight found no Stripe customer ID, subscription, payment record, client-portal record, platform-admin record, customer document, or Storage object for the target.
- The latest physical backup shown before mutation was `2026-09-02 04:10:27 UTC`. Point-in-time recovery was not enabled, so wrong-target recovery would require a broader physical restore.

## Production action performed

After explicit user authorization and final confirmation, the exact demo Auth identity was permanently deleted through the Supabase Auth dashboard. The Auth deletion cascaded the target's session, refresh token, demo profile, and the 33 enumerated demo-only dependent rows. No migration was run.

The session and refresh-token rows were removed by the hard-delete cascade rather than by a separately completed pre-delete revocation step. This sequence detail must remain visible to the independent verifier.

## Operator post-action evidence

The immediate aggregate verification returned:

- target Auth users by email: **0**
- target Auth users by UUID: **0**
- target sessions: **0**
- target refresh tokens: **0**
- target identities: **0**
- target demo profile and all seven enumerated dependent application categories: **0**
- matching client-portal records: **0**
- matching Storage objects: **0**
- total Auth users: **27**, down from **28**
- FMM-003 migration-history rows: **2**; total migration-history rows: **10**
- public tables without RLS: **0**
- broad public policies: **0**
- anonymous public-table grants: **0**
- Supabase security-advisor findings: **0**

Production customer data changed: **NO**. The mutation was limited to the enumerated historical demo identity and demo fixtures.

## Independent closeout

On September 2, 2026, the user confirmed that Craig Frankel personally completed and approved the independent verification. Craig's PASS covers:

1. zero target Auth identities, sessions, and refresh tokens;
2. zero residual target rows across the enumerated application and Storage paths;
3. expected aggregate row-count invariants and no customer collateral;
4. healthy service state and unchanged maintenance mode;
5. no new security-advisor or relevant error-log findings; and
6. acceptance of the deletion/revocation sequence noted above.

The FMM-022 demo-access retirement is **PASS / CLOSED**. This closes the demo-access portion only; it does not claim that a future invitation workflow exists. FMM-007 may now begin under its separately authorized scope.
