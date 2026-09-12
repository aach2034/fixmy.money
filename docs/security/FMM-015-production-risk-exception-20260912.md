# FMM-015 production status and temporary owner-accepted risk exception

**Effective date:** 2026-09-12 UTC

**Release status:** **OPERATIONAL — CLOSED WITH A DEFERRED CONTROL**

**Deferred control:** Two-independent-administrator recovery redundancy

**Control disposition:** **DEFERRED — NOT PASSED**

## Owner decision and exact exception language

FMM-015 is operational in production with Adam Hamilton as the sole active `platform_superadmin`. Adam has exactly one verified and registered TOTP factor, administrator step-up succeeds, and `/admin` access works. Daniel Barnhardt remains inactive and unchanged and is outside the scope of this release.

The owner explicitly accepts the temporary risk created by the absence of a second independently controlled, MFA-verified administrator and authorizes closing FMM-015 as operational with that control deferred.

This exception records acceptance of the residual risk. It does not claim that the deferred control was tested, satisfied, passed, remediated, or replaced by an equivalent control.

While this exception remains in effect, the following operations are prohibited:

- Removal of Adam Hamilton's final verified MFA factor.
- Global administrator-session revocation.
- Factor-removal drills.
- Destructive recovery drills.
- Deactivation of Adam Hamilton's administrator record.

None of these operations may be performed until two active administrators, controlled independently by two different people, each have a verified MFA factor and have independently demonstrated successful administrator step-up and `/admin` access.

Daniel Barnhardt must remain inactive and unchanged. This exception does not require or authorize Daniel's participation, contact, activation, modification, MFA enrollment, or use as a recovery dependency.

This exception is documentation-only. It does not authorize or make changes to application security logic, migration history, production data, Auth configuration or identities, secrets, administrator records, Sites versions, or any deployed production resource. No deployment is part of this exception.

The exception is temporary and ends only when the deferred control has been restored and verified, or when the owner explicitly revokes the exception. Until then, Adam's working password-recovery method, the current production backup, and available Sites rollback versions must remain available.

FMM-015 remains operational in production under this owner-accepted exception.

## Production evidence at acceptance

- Adam Hamilton is the sole active `platform_superadmin` and has exactly one verified, application-registered TOTP factor.
- Administrator step-up succeeds and `/admin` is accessible to Adam.
- Daniel Barnhardt is an inactive `platform_admin` and was not changed for this release closure.
- Production records all three approved FMM-015 migration versions:
  - `20260905023201_repair_user_profiles_account_type.sql`
  - `20260910005214_fmm_015_admin_mfa_enforcement.sql`
  - `20260910034145_fmm_015_security_review_blockers.sql`
- Supabase Auth database audit logging is enabled.
- `ADMIN_STEP_UP_SECRET` and `HEALTHCHECK_SECRET` are registered as protected production secrets; their values were not inspected or recorded.
- Sites version 185 is healthy. Sites versions 184 and 180 remain available as rollback artifacts.
- A successful physical production backup is available from `2026-09-12 04:13:44 UTC`.

## Residual risk and compensating safeguards

The accepted residual risk is administrator lockout if Adam loses access to his password, verified TOTP factor, or active administrator session before independent administrator redundancy is restored. Sites rollback preserves application availability but does not replace a lost independent Auth factor or database-authoritative administrator identity.

The following safeguards remain mandatory during the exception:

- Preserve Adam's working password-recovery method.
- Preserve the successful physical production backup identified above.
- Preserve Sites versions 184 and 180 as rollback artifacts.
- Keep database-authoritative administrator authorization, MFA/AAL2 enforcement, RLS, recent-authentication binding, session revocation controls, and audit logging unchanged.
- Stop rather than weaken security controls if Adam cannot authenticate.

## Exit criteria

Close this exception only after all of the following are independently verified:

1. Two different people independently control two active administrator identities.
2. Each administrator has a separately controlled, verified MFA factor.
3. Each administrator independently completes administrator step-up and opens `/admin`.
4. The two-administrator recovery procedure is reviewed and the deferred recovery control is explicitly recorded as passed.

This exception grants no authority to perform a factor-removal or destructive recovery drill before those exit criteria are met.
