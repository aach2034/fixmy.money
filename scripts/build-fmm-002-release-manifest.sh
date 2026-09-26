#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <new-output-directory>" >&2
  exit 64
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "${script_dir}/.." && pwd)"
output_dir="$1"
migrations_dir="${output_dir}/supabase/migrations"

if [[ -e "${output_dir}" ]]; then
  echo "refusing to overwrite existing output: ${output_dir}" >&2
  exit 65
fi

certified_migration="${repo_root}/supabase/migrations/20260826110000_certified_mailings.sql"
privacy_migration="${repo_root}/supabase/migrations/20260903181039_fmm_002_report_privacy_controls.sql"

verify_hash() {
  local expected="$1"
  local file="$2"
  local actual
  actual="$(shasum -a 256 "${file}" | awk '{print $1}')"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "hash mismatch: ${file}" >&2
    echo "expected ${expected}" >&2
    echo "actual   ${actual}" >&2
    exit 66
  fi
}

verify_hash \
  "c31bd213800a0ea474eda5908f078229b5cec5ff6fc461bef181995bde809d59" \
  "${certified_migration}"
verify_hash \
  "4843b4ed3f6ae6aa3db96f787e44f4b4b24d160c2f83c71c4fc53b972a7bb227" \
  "${privacy_migration}"

# Exact production ledger restored from the verified 2026-09-25 dump. These
# files are inert version markers; none contains application SQL.
production_placeholders=(
  "20260805161853_public_content_seo.sql"
  "20260812034808_harden_function_paths_and_rls_roles.sql"
  "20260812034953_optimize_core_tenant_rls_checks.sql"
  "20260812035104_revoke_public_trigger_function_execution.sql"
  "20260813221718_evidence_driven_dispute_engine.sql"
  "20260813221952_harden_evidence_engine_privileges_and_indexes.sql"
  "20260823190143_retention_queue_cleanup.sql"
  "20260829214723_product_acquisition_analytics.sql"
  "20260902032551_fmm_003_rls_reconciliation.sql"
  "20260902034124_fmm_003_production_schema_history_reconciliation.sql"
  "20260903024247_fmm_007_workspace_client_tenancy.sql"
  "20260903024321_fmm_007_tenant_constraints_and_policies.sql"
  "20260903091603_fmm_004_workspace_entitlements.sql"
  "20260903092257_fmm_004_entitlement_context_cutover.sql"
  "20260903165041_fmm_001_ai_gateway_controls.sql"
  "20260903165215_fmm_001_ai_usage_actor_index.sql"
  "20260903192405_fmm_006_private_client_documents.sql"
  "20260903222256_fmm_008_durable_stripe_webhooks.sql"
  "20260903223300_fmm_008_worker_schedule.sql"
  "20260903230920_fmm_009_plan_entitlement_enforcement.sql"
  "20260904002426_fmm_010_server_authoritative_onboarding.sql"
  "20260904002523_rollback_fmm_010_predeploy_revenue_gate.sql"
  "20260904003807_fmm_009_signup_entitlement_order.sql"
  "20260904003919_fmm_010_server_authoritative_onboarding_reapply.sql"
  "20260904010628_fmm_011_atomic_report_save.sql"
  "20260904124210_fmm_009_allocation_trigger_row_safety.sql"
  "20260905023201_repair_user_profiles_account_type.sql"
  "20260910005214_fmm_015_admin_mfa_enforcement.sql"
  "20260910034145_fmm_015_security_review_blockers.sql"
  "20260912105022_fmm_006_009_server_only_client_document_storage.sql"
  "20260913215428_fmm_010_prevent_profile_reinsert_bypass.sql"
  "20260913234809_dispute_letter_server_write_boundary.sql"
)

if [[ "${#production_placeholders[@]}" -ne 32 ]]; then
  echo "production ledger invariant failed" >&2
  exit 67
fi

mkdir -p "${migrations_dir}"
printf '%s\n' 'project_id = "fmm002-release-manifest"' \
  > "${output_dir}/supabase/config.toml"

for placeholder in "${production_placeholders[@]}"; do
  printf '%s\n' \
    '-- Intentionally inert placeholder for a migration already recorded in production.' \
    > "${migrations_dir}/${placeholder}"
done

cp "${certified_migration}" "${migrations_dir}/"
cp "${privacy_migration}" "${migrations_dir}/"

expected_files=(
  "${production_placeholders[@]}"
  "20260826110000_certified_mailings.sql"
  "20260903181039_fmm_002_report_privacy_controls.sql"
)

actual_list="$(find "${migrations_dir}" -maxdepth 1 -type f -name '*.sql' -exec basename {} \; | sort)"
expected_list="$(printf '%s\n' "${expected_files[@]}" | sort)"

if [[ "${actual_list}" != "${expected_list}" ]]; then
  echo "release manifest contains an unexpected migration set" >&2
  diff -u <(printf '%s\n' "${expected_list}") <(printf '%s\n' "${actual_list}") || true
  exit 68
fi

source_count="$(find "${repo_root}/supabase/migrations" -maxdepth 1 -type f -name '*.sql' | wc -l | tr -d ' ')"
if [[ "${source_count}" != "52" ]]; then
  echo "source migration count changed: expected 52, got ${source_count}" >&2
  exit 69
fi

echo "manifest=${output_dir}"
echo "migration_files=34"
echo "production_placeholders=32"
echo "authorized_source_migrations=2"
echo "excluded_source_migrations=50"
shasum -a 256 \
  "${migrations_dir}/20260826110000_certified_mailings.sql" \
  "${migrations_dir}/20260903181039_fmm_002_report_privacy_controls.sql"
