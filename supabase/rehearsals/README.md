# Historical database rehearsals

These SQL artifacts validate specific intermediate migration states. They are
intentionally outside `supabase/tests`, so the default current-state
`supabase test db` run does not execute historical assumptions against the
fully migrated schema.

The FMM-003 artifacts remain runnable in a disposable, non-production database
prepared at the matching point in history:

```sh
supabase test db supabase/rehearsals/fmm-003/fmm_003_rls_reconciliation.test.sql
supabase test db supabase/rehearsals/fmm-003/fmm_003_phase_1b_forward_upgrade.test.sql
```

Prepare the required Phase 1A or production-shaped Phase 1B state first by
following `rocket/audit_report/fmm_003_phase_1b_forward_upgrade_20260902.md`.
The companion synthetic fixture is
`supabase/rehearsals/fmm-003/fmm_003_phase_1b_production_shaped.sql`.

The FMM-007 pre-remediation schema is likewise a synthetic historical fixture,
not a current-state pgTAP assertion. It remains available at
`supabase/rehearsals/fmm-007/fmm_007_pre_remediation_schema.sql` for the
documented isolated forward-migration rehearsal.
