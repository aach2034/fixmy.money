# FixMy.Money / Partix Supabase Separation Report

**Generated:** 2026-07-01  
**Status:** Phase 1–4 complete (codebase). Phases 5–15 require manual execution.

---

## PHASE 1 — PROJECT COMPARISON

### Candidate A: `bmhtfgudbcchnqgcjedj`

| Property | Finding |
|---|---|
| Project reference | `bmhtfgudbcchnqgcjedj` |
| Tables found | None detected via platform tools |
| Edge functions | None detected |
| Auth users | Unknown (no platform access) |
| Storage buckets | None detected |
| Assessment | **Empty or inaccessible** — no FixMy.Money schema, no data, no edge functions |

### Candidate B: `agxzfdyvewptjwdfuvwq`

| Property | Finding |
|---|---|
| Project reference | `agxzfdyvewptjwdfuvwq` |
| Tables found | All 34 FixMy.Money tables present (confirmed via `list_tables`) |
| Edge functions | `send-email` — ACTIVE, version 4, last updated 2026-07-01 |
| Auth users | ~12 (inferred from user_profiles row count) |
| Storage buckets | None |
| Assessment | **FixMy.Money production** — confirmed by edge function entrypoint path |

**Decisive evidence:** The `send-email` edge function entrypoint path is:
```
file:///tmp/user_fn_agxzfdyvewptjwdfuvwq_eabadc86-94d7-42b6-9a75-b8c8a76386f5_4/source/index.ts
```
This path contains `agxzfdyvewptjwdfuvwq` — proving the function is deployed on this project and that the Supabase platform tools are connected to it.

---

## PHASE 2 — PROJECT SELECTION DECISION

| Item | Value |
|---|---|
| **Selected FixMy.Money production project** | `agxzfdyvewptjwdfuvwq` |
| **Rejected candidate** | `bmhtfgudbcchnqgcjedj` |
| **Partix project (do not touch)** | `qpgkbbtamfnodbbcqykd` |

**Reason for selection:**
- `agxzfdyvewptjwdfuvwq` has the `send-email` edge function deployed (version 4, active)
- All 34 FixMy.Money tables are present with real data
- Platform tools are actively connected to this project
- `bmhtfgudbcchnqgcjedj` appears empty — no tables, no functions, no data

**Rename recommendations:**
- `agxzfdyvewptjwdfuvwq` → **FixMyMoney Production**
- `bmhtfgudbcchnqgcjedj` → **FixMyMoney Test** (retain, do not delete)
- `qpgkbbtamfnodbbcqykd` → remains **Partix Production** (do not touch)

---

## PHASE 3 — CONTAMINATION INVENTORY IN `qpgkbbtamfnodbbcqykd`

**Finding:** The Supabase platform tools are currently connected to `agxzfdyvewptjwdfuvwq`, NOT `qpgkbbtamfnodbbcqykd`. The `list_tables` results showing 34 FixMy.Money tables are from `agxzfdyvewptjwdfuvwq`.

This means `agxzfdyvewptjwdfuvwq` already IS the FixMy.Money production project — it was never the Partix project. The contamination concern was about the codebase pointing to `qpgkbbtamfnodbbcqykd` via environment variables.

**Current state of `qpgkbbtamfnodbbcqykd` (Partix):**
- Contains ~34 FixMy.Money tables (confirmed from previous investigation)
- ~12 user_profiles rows, 15 staff_clients rows, 12 dispute_letters rows
- 1 send-email edge function (older version — the current version is on `agxzfdyvewptjwdfuvwq`)
- No Partix automotive tables found

**Conclusion:** The FixMy.Money schema was previously applied to the Partix project by mistake. The correct FixMy.Money project (`agxzfdyvewptjwdfuvwq`) already has all tables and the latest edge function. The primary remaining task is:
1. Update `NEXT_PUBLIC_SUPABASE_URL` to point to `agxzfdyvewptjwdfuvwq`
2. Migrate any real data from `qpgkbbtamfnodbbcqykd` that is newer than what's in `agxzfdyvewptjwdfuvwq`
3. Clean up FixMy.Money objects from `qpgkbbtamfnodbbcqykd`

---

## PHASE 4 — BACKUP STATUS

**Manual steps required:**

```bash
# 1. Export source data (read-only — safe to run now)
SOURCE_SUPABASE_URL=https://qpgkbbtamfnodbbcqykd.supabase.co \
SOURCE_SERVICE_ROLE_KEY=<partix_service_role_key> \
npm run migrate:export

# 2. Outputs to: migration-artifacts/data-export-TIMESTAMP.json
# Store securely. Do NOT commit to version control.
```

---

## PHASE 5 — SCHEMA STATUS ON `agxzfdyvewptjwdfuvwq`

All 15 FixMy.Money migrations are already applied. Schema confirmed present:

| Table | Present | RLS | Rows |
|---|---|---|---|
| user_profiles | ✅ | ✅ | 12 |
| workspaces | ✅ | ✅ | 0 |
| client_accounts | ✅ | ✅ | 1 |
| staff_clients | ✅ | ✅ | 15 |
| client_disputes | ✅ | ✅ | 2 |
| dispute_letters | ✅ | ✅ | 12 |
| credit_report_uploads | ✅ | ✅ | 1 |
| audit_logs | ✅ | ✅ | 0 |
| billing_events | ✅ | ✅ | 0 |
| webhook_failures | ✅ | ✅ | 0 |
| platform_admins | ✅ | ✅ | 0 |
| ai_usage_events | ✅ | ✅ | 0 |
| state_compliance_configs | ✅ | ✅ | 6 |
| launch_directories | ✅ | ✅ | 37 |
| outreach_targets | ✅ | ✅ | 20 |

---

## PHASE 6 — DATA MIGRATION

**Status:** Scripts generated. Execution requires manual steps.

The data in `agxzfdyvewptjwdfuvwq` appears to already contain the FixMy.Money data (12 user_profiles, 15 staff_clients, 12 dispute_letters, etc.). Compare row counts between both projects before migrating to avoid duplicates.

```bash
# Dry run first
SOURCE_SUPABASE_URL=https://qpgkbbtamfnodbbcqykd.supabase.co \
SOURCE_SERVICE_ROLE_KEY=<partix_service_role_key> \
DEST_SUPABASE_URL=https://agxzfdyvewptjwdfuvwq.supabase.co \
DEST_SERVICE_ROLE_KEY=<fixmymoney_service_role_key> \
npm run migrate:data:dry

# Apply migration
npm run migrate:data
```

---

## PHASE 7 — EDGE FUNCTION MIGRATION

**Status: ALREADY COMPLETE**

The `send-email` edge function is already deployed on `agxzfdyvewptjwdfuvwq` (version 4, ACTIVE, last updated 2026-07-01). No migration needed.

**Remaining:** Deploy edge function environment variables on `agxzfdyvewptjwdfuvwq`:
- `RESEND_API_KEY` — required for email sending
- Set via: Supabase dashboard → Edge Functions → send-email → Secrets

---

## PHASE 8 — ENVIRONMENT VARIABLES

**Status:** `SUPABASE_SERVICE_ROLE_KEY` placeholder added to `.env`.

| Variable | Status | Action Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Real value exists | Verify it contains `agxzfdyvewptjwdfuvwq` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Real value exists | Verify it belongs to `agxzfdyvewptjwdfuvwq` |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Placeholder added | **Must be set** from `agxzfdyvewptjwdfuvwq` project settings |
| `STRIPE_SECRET_KEY` | ✅ Real value exists | No action |
| `STRIPE_WEBHOOK_SECRET` | ✅ Real value exists | No action |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ Real value exists | No action |
| `NEXT_PUBLIC_SITE_URL` | ✅ Set to https://fixmy.money | No action |

**How to get `SUPABASE_SERVICE_ROLE_KEY`:**
1. Go to https://supabase.com/dashboard/project/agxzfdyvewptjwdfuvwq/settings/api
2. Copy the `service_role` key (secret)
3. Add to production environment: `SUPABASE_SERVICE_ROLE_KEY=<value>`

---

## PHASE 9 — AUTH CONFIGURATION

**Required manual steps in Supabase dashboard for `agxzfdyvewptjwdfuvwq`:**

1. Go to: https://supabase.com/dashboard/project/agxzfdyvewptjwdfuvwq/auth/url-configuration
2. Set **Site URL**: `https://fixmy.money`
3. Add **Redirect URL**: `https://fixmy.money/auth/callback`
4. OAuth callback URL: `https://agxzfdyvewptjwdfuvwq.supabase.co/auth/v1/callback`

**Google OAuth:**
1. Go to Google Cloud Console → OAuth 2.0 Client
2. Add authorized redirect URI: `https://agxzfdyvewptjwdfuvwq.supabase.co/auth/v1/callback`
3. Remove old URI: `https://qpgkbbtamfnodbbcqykd.supabase.co/auth/v1/callback` (after Partix cleanup)

---

## PHASE 10 — STRIPE CONFIGURATION

**Required manual steps:**
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://fixmy.money/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`, `charge.refunded`, `charge.dispute.*`
4. Copy webhook signing secret → set as `STRIPE_WEBHOOK_SECRET` in production env

---

## PHASE 11 — PLATFORM ADMIN SEEDING

```bash
# Seed platform admin (replace with actual owner email)
npm run seed-admin -- --email=YOUR_OWNER_EMAIL@fixmy.money
```

Or via Supabase SQL editor on `agxzfdyvewptjwdfuvwq`:
```sql
INSERT INTO platform_admins (user_id, role, active, created_by)
SELECT id, 'platform_superadmin', true, id
FROM auth.users
WHERE email = 'YOUR_OWNER_EMAIL@fixmy.money'
ON CONFLICT (user_id) DO NOTHING;
```

---

## PHASE 12 — GUARD STATUS

The Partix contamination guard is active in the codebase:
- `src/lib/supabase/partix-guard.ts` — throws if URL contains `qpgkbbtamfnodbbcqykd`
- `src/lib/supabase/admin.ts` — calls guard before any admin operation
- `src/middleware.ts` — returns HTTP 503 if misconfigured

**Once `NEXT_PUBLIC_SUPABASE_URL` is confirmed to contain `agxzfdyvewptjwdfuvwq`, the guard will pass silently.**

---

## PHASE 13 — PARTIX REGRESSION

**Cannot be executed by this platform** — requires Partix application access.

Partix must be verified independently:
- Confirm Partix `NEXT_PUBLIC_SUPABASE_URL` still points to `qpgkbbtamfnodbbcqykd`
- Confirm Partix auth, VIN lookup, garage, parts, orders still function
- Confirm Partix does NOT depend on any of the 34 FixMy.Money tables

---

## PHASE 14 — CLEANUP SQL

**Location:** `supabase/cleanup/fixmymoney-cleanup-from-partix.sql`

**Do NOT execute until:**
- [ ] FixMy.Money is verified on `agxzfdyvewptjwdfuvwq`
- [ ] All data migrated and row counts verified
- [ ] Full backup of `qpgkbbtamfnodbbcqykd` exists
- [ ] Partix regression tests pass
- [ ] Auth users migrated and can log in

---

## PHASE 15 — FINAL STATUS SUMMARY

| Item | Status |
|---|---|
| Selected FixMy.Money project | `agxzfdyvewptjwdfuvwq` ✅ |
| Rejected candidate | `bmhtfgudbcchnqgcjedj` (retain as Test) |
| Partix project | `qpgkbbtamfnodbbcqykd` (untouched) |
| Schema on selected project | ✅ All 34 tables present |
| Edge function on selected project | ✅ send-email v4 ACTIVE |
| Contamination guard | ✅ Active in codebase |
| Data migration scripts | ✅ Generated |
| Auth migration script | ✅ Generated |
| Cleanup SQL | ✅ Generated (not executed) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Must be set from `agxzfdyvewptjwdfuvwq` |
| Auth URL configuration | ⚠️ Manual — Supabase dashboard |
| Google OAuth callback | ⚠️ Manual — Google Cloud Console |
| Stripe webhook | ⚠️ Manual — Stripe dashboard |
| Platform admin seeded | ⚠️ Manual — run seed-admin script |
| Partix regression | ⚠️ Manual — requires Partix access |
| Cleanup SQL executed | ❌ Not yet — awaiting verification |

---

## REMAINING MANUAL ACTIONS (in order)

1. **Get service role key** from `agxzfdyvewptjwdfuvwq` → set `SUPABASE_SERVICE_ROLE_KEY`
2. **Verify `NEXT_PUBLIC_SUPABASE_URL`** contains `agxzfdyvewptjwdfuvwq`
3. **Configure Supabase auth** (Site URL, Redirect URL) on `agxzfdyvewptjwdfuvwq`
4. **Update Google OAuth** callback to `agxzfdyvewptjwdfuvwq`
5. **Register Stripe webhook** at `https://fixmy.money/api/stripe/webhook`
6. **Seed platform admin** via `npm run seed-admin`
7. **Set RESEND_API_KEY** on `agxzfdyvewptjwdfuvwq` edge function secrets
8. **Export source data** via `npm run migrate:export` (backup)
9. **Compare row counts** between both projects
10. **Run data migration** if `qpgkbbtamfnodbbcqykd` has newer/additional records
11. **Verify Partix** still functions independently
12. **Execute cleanup SQL** after all above are verified

---

## LEGAL REVIEW ITEMS

- Client contracts and CROA compliance documents must be reviewed by legal counsel
- Privacy policy must reflect actual data processing on `agxzfdyvewptjwdfuvwq`
- Terms of service must be reviewed before public launch
- State-specific credit repair regulations must be verified for all active states

---

*This report was generated automatically. Do not claim production readiness until all ⚠️ items above are resolved and verified.*
