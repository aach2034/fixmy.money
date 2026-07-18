# FixMy.Money / Partix Database Separation Plan

**Generated:** 2026-07-01  
**Status:** Phase 1 complete — contamination guard active  
**Partix project ref:** `qpgkbbtamfnodbbcqykd`  
**FixMy.Money project ref:** TBD — must be identified and configured

---

## PHASE 1 STATUS: STOP FURTHER CONTAMINATION ✅

The following guards are now active in the FixMy.Money codebase:

| Guard | Location | Behaviour |
|---|---|---|
| `validateNotPartixDatabase()` | `src/lib/supabase/partix-guard.ts` | Throws with exact required error message |
| `getAdminClient()` | `src/lib/supabase/admin.ts` | Calls guard before creating any admin client |
| Middleware | `src/middleware.ts` | Returns HTTP 503 with error JSON on every request |
| Health endpoint | `src/app/api/health/route.ts` | Reports `misconfigured` status with project ref |
| Auth test | `src/__tests__/auth-lifecycle.test.ts` | Asserts URL must NOT contain `qpgkbbtamfnodbbcqykd` |
| Guard tests | `src/__tests__/partix-guard.test.ts` | 6 automated tests verifying guard behaviour |

**Effect:** FixMy.Money will refuse to serve any request, run any admin operation, or process any webhook until `NEXT_PUBLIC_SUPABASE_URL` is updated to point to the correct FixMy.Money Supabase project.

---

## PHASE 2: IDENTIFY THE REAL FIXMY.MONEY PROJECT

### Current connected project: `qpgkbbtamfnodbbcqykd` (PARTIX — DO NOT USE)

### Action required
1. Log in to the Supabase dashboard at https://supabase.com/dashboard
2. List all projects in the account
3. For each project that is NOT `qpgkbbtamfnodbbcqykd`, check:
   - Does it contain `workspaces`, `client_accounts`, `billing_events` tables?
   - Does it have FixMy.Money auth users?
   - What is its Site URL?
4. If a dedicated FixMy.Money project exists, note its reference and keys
5. If no dedicated project exists, create one named "FixMyMoney Production"

### Second project reference found in codebase
`euwpcnaioorzkhmwfnjn` — referenced only in `src/app/homepage/components/DemoVideoPlayer.tsx`  
as a public storage URL for a demo video asset. This is a Rocket platform storage bucket,  
not a FixMy.Money application database. Do not use this as the FixMy.Money project.

---

## PHASE 3: CONTAMINATION INVENTORY IN qpgkbbtamfnodbbcqykd

### Tables confirmed present (from live schema read on 2026-07-01)

All tables below are FixMy.Money-owned. None are Partix tables.  
Partix is an automotive parts platform; none of these tables relate to automotive data.

| Table | Classification | Row count | Safe to migrate | Notes |
|---|---|---|---|---|
| `user_profiles` | FixMy.Money-owned | 12 | Yes — after user mapping | Contains FixMy.Money user profiles |
| `workspaces` | FixMy.Money-owned | 0 | Yes | No data to migrate |
| `client_accounts` | FixMy.Money-owned | 1 | Yes — verify ownership | Credit repair client record |
| `client_disputes` | FixMy.Money-owned | 2 | Yes — verify ownership | Dispute records |
| `dispute_timeline_events` | FixMy.Money-owned | 7 | Yes | Timeline entries |
| `client_updates` | FixMy.Money-owned | 3 | Yes | Client update records |
| `client_documents` | FixMy.Money-owned | 0 | Yes | No data |
| `staff_clients` | FixMy.Money-owned | 15 | Yes | Staff-client assignments |
| `dispute_letters` | FixMy.Money-owned | 12 | Yes | Generated dispute letters |
| `dashboard_metrics` | FixMy.Money-owned | 1 | Yes | Dashboard metric snapshot |
| `disputes_by_bureau` | FixMy.Money-owned | 6 | Yes | Bureau breakdown data |
| `credit_report_uploads` | FixMy.Money-owned | 1 | Yes — verify ownership | Uploaded credit report |
| `credit_report_analyses` | FixMy.Money-owned | 0 | Yes | No data |
| `dispute_recommendations` | FixMy.Money-owned | 0 | Yes | No data |
| `chat_conversations` | FixMy.Money-owned | 0 | Yes | No data |
| `chat_messages` | FixMy.Money-owned | 0 | Yes | No data |
| `launch_directories` | FixMy.Money-owned | 37 | Yes | Launch/directory listings |
| `outreach_targets` | FixMy.Money-owned | 37→20 | Yes | Outreach records |
| `social_posts` | FixMy.Money-owned | 0 | Yes | No data |
| `utm_tracking` | FixMy.Money-owned | 15 | Yes | UTM analytics |
| `leads` | FixMy.Money-owned | 0 | Yes | No data |
| `compliance_disclosures` | FixMy.Money-owned | 0 | Yes | No data |
| `croa_contracts` | FixMy.Money-owned | 0 | Yes | No data |
| `cancellation_periods` | FixMy.Money-owned | 0 | Yes | No data |
| `audit_logs` | FixMy.Money-owned | 0 | Yes | No data |
| `consumer_services` | FixMy.Money-owned | 0 | Yes | No data |
| `consumer_contracts` | FixMy.Money-owned | 0 | Yes | No data |
| `consumer_disclosures` | FixMy.Money-owned | 0 | Yes | No data |
| `compliance_overrides` | FixMy.Money-owned | 0 | Yes | No data |
| `state_compliance_configs` | FixMy.Money-owned | 6 | Yes | State config seed data |
| `billing_events` | FixMy.Money-owned | 0 | Yes | No data |
| `webhook_failures` | FixMy.Money-owned | 0 | Yes | No data |
| `platform_admins` | FixMy.Money-owned | 0 | Yes | No data |
| `ai_usage_events` | FixMy.Money-owned | 0 | Yes | No data |

**Total tables: 34**  
**Partix-owned tables found: 0**  
**Shared/ambiguous tables: 0**  
**Tables with real FixMy.Money data: ~8 (user_profiles:12, client_accounts:1, client_disputes:2, dispute_timeline_events:7, client_updates:3, staff_clients:15, dispute_letters:12, dashboard_metrics:1, disputes_by_bureau:6, credit_report_uploads:1, launch_directories:37, outreach_targets:20, utm_tracking:15, state_compliance_configs:6)**

### Storage buckets
None configured in `qpgkbbtamfnodbbcqykd`.

### Edge functions
`send-email` (slug) — FixMy.Money-owned. Must be migrated to the correct project.

### Auth users
`user_profiles` has 12 rows, suggesting approximately 12 auth users.  
Direct `auth.users` count requires service role access.  
These are FixMy.Money users, not Partix users.

### Migrations applied to qpgkbbtamfnodbbcqykd
All migrations in `supabase/migrations/` are FixMy.Money-specific:
- `20260603162244_workspaces.sql`
- `20260603163000_client_portal.sql`
- `20260603170000_staff_clients_disputes.sql`
- `20260603180000_credit_report_onboarding.sql`
- `20260603190000_subscription_status.sql`
- `20260603230000_live_chat.sql`
- `20260604005400_payment_tracking.sql`
- `20260604150000_rls_tenant_isolation.sql`
- `20260605160000_add_onboarding_completed.sql`
- `20260605180000_client_workspace_linkage.sql`
- `20260605200000_auto_disputes_from_analysis.sql`
- `20260605220000_add_letter_content.sql`
- `20260612230000_launch_distribution_system.sql`
- `20260630180000_rls_billing_events_audit.sql`
- `20260701120000_billing_events_schema_hardening.sql`

None of these are Partix migrations.

---

## PHASE 4: BACKUP CHECKLIST (MANUAL — REQUIRED BEFORE DELETION)

Before removing any object from `qpgkbbtamfnodbbcqykd`:

- [ ] Export schema: `supabase db dump --project-ref qpgkbbtamfnodbbcqykd > partix_schema_backup_$(date +%Y%m%d).sql`
- [ ] Export data: `supabase db dump --data-only --project-ref qpgkbbtamfnodbbcqykd > partix_data_backup_$(date +%Y%m%d).sql`
- [ ] Download edge function source from Supabase dashboard
- [ ] Record current auth configuration (Site URL, Redirect URLs) from Supabase dashboard
- [ ] Record current environment variables (names only, not values)
- [ ] Confirm no Partix tables exist (verified above — none found)
- [ ] Confirm Partix application is not using this project

**Note:** Because zero Partix-owned tables were found in `qpgkbbtamfnodbbcqykd`, the backup  
is primarily to preserve FixMy.Money data before migration, not to protect Partix data.  
Partix data does not appear to be in this project.

---

## PHASE 5: CONFIGURE THE CORRECT FIXMY.MONEY PROJECT

Once the correct project is identified or created:

1. Update `.env` with the new project's credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_FIXMYMONEY_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_FIXMYMONEY_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_FIXMYMONEY_SERVICE_ROLE_KEY
   ```
2. Apply all migrations: `supabase db push --project-ref YOUR_FIXMYMONEY_REF`
3. Deploy edge function: `supabase functions deploy send-email --project-ref YOUR_FIXMYMONEY_REF`
4. Configure auth in Supabase dashboard:
   - Site URL: `https://fixmy.money`
   - Redirect URL: `https://fixmy.money/auth/callback`
5. Verify the Partix guard no longer triggers: `npm run verify-env`

---

## PHASE 6: DATA MIGRATION MAP

Records to migrate from `qpgkbbtamfnodbbcqykd` to the new FixMy.Money project:

| Source table | Destination table | Records | Action |
|---|---|---|---|
| `user_profiles` | `user_profiles` | 12 | Migrate after auth user remapping |
| `client_accounts` | `client_accounts` | 1 | Migrate — verify workspace FK |
| `client_disputes` | `client_disputes` | 2 | Migrate — verify client FK |
| `dispute_timeline_events` | `dispute_timeline_events` | 7 | Migrate — verify dispute FK |
| `client_updates` | `client_updates` | 3 | Migrate — verify client FK |
| `staff_clients` | `staff_clients` | 15 | Migrate — verify user + client FKs |
| `dispute_letters` | `dispute_letters` | 12 | Migrate — verify dispute FK |
| `dashboard_metrics` | `dashboard_metrics` | 1 | Migrate |
| `disputes_by_bureau` | `disputes_by_bureau` | 6 | Migrate |
| `credit_report_uploads` | `credit_report_uploads` | 1 | Migrate — verify storage object |
| `launch_directories` | `launch_directories` | 37 | Migrate (seed data) |
| `outreach_targets` | `outreach_targets` | 20 | Migrate (seed data) |
| `utm_tracking` | `utm_tracking` | 15 | Migrate |
| `state_compliance_configs` | `state_compliance_configs` | 6 | Migrate (seed data) |

**Auth users:** Must be migrated via Supabase dashboard export/import or re-invited.  
Auth user IDs will change — all `user_id` foreign keys must be remapped.

---

## PHASE 7: ENVIRONMENT VARIABLES TO UPDATE

After the correct FixMy.Money project is identified, update these in production:

| Variable | Action |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Replace with FixMy.Money project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Replace with FixMy.Money anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Replace with FixMy.Money service role key |

Do NOT change Partix environment variables.

---

## PHASE 8: AUTH SEPARATION

| Application | Site URL | Redirect URL | OAuth callback |
|---|---|---|---|
| FixMy.Money | `https://fixmy.money` | `https://fixmy.money/auth/callback` | `https://YOUR_FIXMYMONEY_REF.supabase.co/auth/v1/callback` |
| Partix | Partix URL (do not change) | Partix URLs (do not change) | Partix callback (do not change) |

---

## PHASE 9: STRIPE SEPARATION

All Stripe webhook routes in FixMy.Money use `getAdminClient()` which now includes  
the Partix guard. Once the correct project credentials are configured, Stripe events  
will write only to the FixMy.Money project.

Register the FixMy.Money webhook endpoint:
- URL: `https://fixmy.money/api/stripe/webhook`
- Events: checkout.session.completed, customer.subscription.*, invoice.*, charge.refunded, charge.dispute.*

---

## CLEANUP SQL PLAN (DO NOT EXECUTE UNTIL FIXMY.MONEY IS VERIFIED ON CORRECT PROJECT)

The following SQL removes all FixMy.Money objects from `qpgkbbtamfnodbbcqykd`.  
**Execute only after:**
- FixMy.Money is working on the correct project
- All data has been migrated and verified
- A full schema + data backup exists
- Partix regression tests pass (confirming Partix does not use these tables)

```sql
-- ============================================================
-- FIXMY.MONEY CLEANUP SCRIPT FOR qpgkbbtamfnodbbcqykd
-- Generated: 2026-07-01
-- PREREQUISITE: Full backup must exist before running this script
-- PREREQUISITE: FixMy.Money must be verified on the correct project
-- ============================================================

-- Step 1: Drop FixMy.Money tables (in dependency order)
-- Each DROP is conditional to prevent errors if already removed

DROP TABLE IF EXISTS public.ai_usage_events CASCADE;
DROP TABLE IF EXISTS public.platform_admins CASCADE;
DROP TABLE IF EXISTS public.webhook_failures CASCADE;
DROP TABLE IF EXISTS public.billing_events CASCADE;
DROP TABLE IF EXISTS public.compliance_overrides CASCADE;
DROP TABLE IF EXISTS public.state_compliance_configs CASCADE;
DROP TABLE IF EXISTS public.consumer_disclosures CASCADE;
DROP TABLE IF EXISTS public.consumer_contracts CASCADE;
DROP TABLE IF EXISTS public.consumer_services CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.cancellation_periods CASCADE;
DROP TABLE IF EXISTS public.croa_contracts CASCADE;
DROP TABLE IF EXISTS public.compliance_disclosures CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.utm_tracking CASCADE;
DROP TABLE IF EXISTS public.social_posts CASCADE;
DROP TABLE IF EXISTS public.outreach_targets CASCADE;
DROP TABLE IF EXISTS public.launch_directories CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_conversations CASCADE;
DROP TABLE IF EXISTS public.dispute_recommendations CASCADE;
DROP TABLE IF EXISTS public.credit_report_analyses CASCADE;
DROP TABLE IF EXISTS public.credit_report_uploads CASCADE;
DROP TABLE IF EXISTS public.disputes_by_bureau CASCADE;
DROP TABLE IF EXISTS public.dashboard_metrics CASCADE;
DROP TABLE IF EXISTS public.dispute_letters CASCADE;
DROP TABLE IF EXISTS public.staff_clients CASCADE;
DROP TABLE IF EXISTS public.client_documents CASCADE;
DROP TABLE IF EXISTS public.client_updates CASCADE;
DROP TABLE IF EXISTS public.dispute_timeline_events CASCADE;
DROP TABLE IF EXISTS public.client_disputes CASCADE;
DROP TABLE IF EXISTS public.client_accounts CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Step 2: Verify Partix tables are NOT present (expected: 0 rows)
-- If any of these queries return rows, STOP and investigate before proceeding.
-- (Partix automotive tables — none were found in the schema inventory)
-- SELECT COUNT(*) FROM information_schema.tables
--   WHERE table_schema = 'public'
--   AND table_name IN ('vehicles', 'parts', 'orders', 'garages', 'vin_lookups');

-- Step 3: Confirm cleanup
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Expected result: empty set (or only Partix tables if any exist)
```

---

## ROLLBACK INSTRUCTIONS

If cleanup causes issues:

1. Restore from backup:
   ```bash
   psql $DATABASE_URL < partix_schema_backup_YYYYMMDD.sql
   psql $DATABASE_URL < partix_data_backup_YYYYMMDD.sql
   ```
2. Revert FixMy.Money environment variables to the old project credentials
3. Remove the Partix guard temporarily by setting `SKIP_PARTIX_GUARD=true` (not implemented — requires code change)
4. Contact Supabase support if point-in-time recovery is needed

---

## FINAL REPORT CHECKLIST

| Item | Status |
|---|---|
| Partix project ref identified | ✅ `qpgkbbtamfnodbbcqykd` |
| FixMy.Money project ref identified | ⏳ Manual step required |
| Contamination guard active | ✅ Phase 1 complete |
| Contaminated objects inventoried | ✅ 34 tables, all FixMy.Money-owned |
| Partix-owned objects found | ✅ None found |
| Real FixMy.Money data in Partix project | ✅ Yes — ~14 tables with data |
| Auth users mixed | ⚠️ Unknown — requires service role key to query auth.users |
| Stripe data mixed | ✅ billing_events is empty — no Stripe data to separate |
| Storage objects mixed | ✅ No storage buckets configured |
| Backup created | ⏳ Manual step required |
| FixMy.Money project configured | ⏳ Manual step required |
| Migrations applied to new project | ⏳ Manual step required |
| OAuth settings updated | ⏳ Manual step required |
| Stripe webhook re-registered | ⏳ Manual step required |
| Cleanup SQL executed | ⏳ After all above steps verified |

---

## MANUAL ACTIONS STILL REQUIRED

1. **Identify or create the correct FixMy.Money Supabase project** (not `qpgkbbtamfnodbbcqykd`)
2. **Update production environment variables** with the new project's URL and keys
3. **Apply all migrations** to the new project: `supabase db push`
4. **Migrate auth users** — export from old project, re-invite or import to new project
5. **Migrate data** — use the migration map in Phase 6
6. **Configure auth settings** in the new project dashboard
7. **Re-register Stripe webhook** pointing to `https://fixmy.money/api/stripe/webhook`
8. **Update Google OAuth** redirect URI to use the new project's callback URL
9. **Create a full backup** of `qpgkbbtamfnodbbcqykd` before running cleanup SQL
10. **Run cleanup SQL** only after all above steps are verified

---

*Do not delete, rename, archive, or reset the Partix Supabase project (`qpgkbbtamfnodbbcqykd`).*  
*Preserve Partix first. Separate FixMy.Money second. Clean up only after both applications are verified.*
