# FMM-002 database execution runbook and isolated CLI evidence

Status: **isolated rehearsal passed; production was not contacted or changed**.

This document records the exact release mechanism qualified on September 25,
2026. It is evidence and a production runbook, not authorization to execute the
irreversible FMM-002 cleanup. Production execution still requires the separate
owner approval recorded by the launch tracker.

## Pinned inputs

- Supabase CLI: `2.117.0`
- CLI SHA-256:
  `8346f69f5bcbc991635f36ccf8fdc5d9c502b40b01a0253db6480d93d351d86f`
- Release manifest: 34 SQL files: 32 inert files matching the exact restored
  production ledger plus these two source migrations:
  - `20260826110000_certified_mailings.sql`
    - SHA-256:
      `c31bd213800a0ea474eda5908f078229b5cec5ff6fc461bef181995bde809d59`
  - `20260903181039_fmm_002_report_privacy_controls.sql`
    - SHA-256:
      `e5f07d3485cdcc38bb7b2e9a83510c7ddb2f2f6bafaae9625822b4aefd5419a0`
- Pre/postflight SQL SHA-256:
  `753f01560abecf97cc547adfef734b8958208e0a7f23d1f933ba1f4923f749b8`
- Guard wrapper SHA-256:
  `8740b0d22fe75be5f26bfffc38e6acbb0f21f313f3726e22b1e28f61b95f263d`

The tested manifest was
`/private/tmp/fmm-fmm002-replay.xuJSOE/manifest`. That path is disposable;
production must use a freshly built manifest whose file count and hashes match
the values above.

## Fail-closed target identity

`scripts/verify-fmm-002-production-db.sh` has two modes:

- Direct mode accepts only database `postgres` and either:
  - host `db.agxzfdyvewptjwdfuvwq.supabase.co` with username `postgres`; or
  - a `*.pooler.supabase.com` host with username
    `postgres.agxzfdyvewptjwdfuvwq`.
- Docker mode requires an explicit container name and database name and is
  reserved for isolated rehearsals.

The direct-mode parser never prints the connection URI, username, hostname, or
password. A target that cannot prove the exact project ref is rejected before
`psql` starts.

## Exact qualified CLI invocation

The URL used in the isolated rehearsal contained no password. `PGPASSWORD` was
provided only through the process environment. The URL included startup
options so the CLI's per-migration `RESET ALL` could not remove the timeouts:

```text
postgresql://postgres@127.0.0.1:<ephemeral-port>/fmm_cli_replay?sslmode=disable&options=-c%20lock_timeout%3D5s%20-c%20statement_timeout%3D60s
```

Secret-safe command form, with placeholders instead of credentials:

```bash
FMM002_LOCAL_DATABASE_URL='postgresql://postgres@127.0.0.1:<ephemeral-port>/fmm_cli_replay?sslmode=disable&options=-c%20lock_timeout%3D5s%20-c%20statement_timeout%3D60s'
PGPASSWORD='[local fixture password]' SUPABASE_TELEMETRY_DISABLED=1 \
  /opt/homebrew/Cellar/supabase/2.117.0/libexec/supabase db push \
  --dry-run --include-all \
  --db-url "${FMM002_LOCAL_DATABASE_URL}" \
  --workdir /private/tmp/fmm-fmm002-replay.xuJSOE/manifest

PGPASSWORD='[local fixture password]' SUPABASE_TELEMETRY_DISABLED=1 \
  /opt/homebrew/Cellar/supabase/2.117.0/libexec/supabase db push \
  --include-all --yes \
  --db-url "${FMM002_LOCAL_DATABASE_URL}" \
  --workdir /private/tmp/fmm-fmm002-replay.xuJSOE/manifest
```

`--include-all` is required because the held-back certified-mailings migration
has a timestamp older than migrations already recorded in production.

## Captured isolated output

The dry run named only the two approved files and no seed or role payload:

```text
DRY RUN: migrations will *not* be pushed to the database.
Would push these migrations:
 • 20260826110000_certified_mailings.sql
 • 20260903181039_fmm_002_report_privacy_controls.sql
{"upToDate":false,"dryRun":true,"migrations":["20260826110000_certified_mailings.sql","20260903181039_fmm_002_report_privacy_controls.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```

The application named and applied the same two files:

```text
Applying migration 20260826110000_certified_mailings.sql...
Applying migration 20260903181039_fmm_002_report_privacy_controls.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260826110000_certified_mailings.sql","20260903181039_fmm_002_report_privacy_controls.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```

A fresh connection using the same URL options executed `RESET ALL` and then
reported:

```text
lock_timeout=5s
statement_timeout=1min
```

`1min` is PostgreSQL's normalized display for the qualified 60-second
statement timeout.

## Guard results on the owner-faithful clone

The source was a fresh owner/grant-preserving restore of the verified
production-derived dump. The restore emitted the already documented unrelated
`auth.sessions` reference to absent `auth.oauth_clients`; the application
catalog reconciled exactly and preflight passed before any migration.

Preflight:

```text
FMM-002 preflight PASS: database=fmm_cli_replay, ledger=32, fingerprint=781d104fd91ed9aa993d79973c6f625b (lines=704), affected_rows=40/1149/1/14/167/244/0
```

Postflight after the exact CLI application:

```text
FMM-002 postflight PASS: database=fmm_cli_replay, ledger=34, fingerprint=9514c5c6ebaf3a18be9017eff212232c (lines=793), affected_rows=40/1149/1/14/167/244/0
```

The postflight guard also proved zero raw text and forbidden nested artifacts,
all six containment constraints present and validated, no unvalidated public
constraint, the exact empty hardened `certified_mailings` catalog, the exact AI
operation constraint, the restrictive OCR-object policy, and the exact
`reserve_ai_usage` SECURITY DEFINER, empty `search_path`, and execute ACL.

## Authorized production-window sequence after separate approval

1. Confirm the recovery point and Storage recovery package remain accepted.
2. Rebuild the 34-file manifest in a new empty directory and verify its exact
   file set and hashes against this document.
3. Put the approved production URI only in an environment variable. Do not put
   it in a command transcript or file.
4. Run `scripts/verify-fmm-002-production-db.sh preflight` with
   `FMM002_EXPECT_DATABASE=postgres`. Stop on any failure.
5. Run CLI `db push --dry-run --include-all`. Continue only if its JSON has the
   exact two migrations and empty `seeds` and `roles` arrays.
6. Run CLI `db push --include-all --yes` with the same pinned binary, manifest,
   URL timeout options, and connection secret.
7. Run `scripts/verify-fmm-002-production-db.sh postflight`. Do not begin the
   separate Storage purge unless it passes.

## Failure containment

- The guard itself is `REPEATABLE READ READ ONLY`, sets 5-second lock,
  60-second statement, and 60-second idle-in-transaction timeouts, and ends in
  `ROLLBACK` even on success.
- An application failure before either migration is recorded leaves the exact
  32-row state; rerun preflight before doing anything else.
- If `certified_mailings` commits but FMM-002 fails, the ledger is exactly 33
  rows. Both guards intentionally reject that state. Preserve logs, verify that
  FMM-002 rolled back, and obtain review of the failure before rerunning the
  unchanged second migration. Any SQL change requires a new replay and approval.
- A 34-row ledger with a failed postflight is a stop condition. Do not purge
  Storage, enable signup, enable Checkout, merge, or deploy. Preserve evidence
  and use the accepted recovery point under owner direction.
- URL startup options require no persistent database setting change. If an
  operator instead changes a role/database default, restoring and independently
  verifying the prior value is mandatory even after error or rollback.
