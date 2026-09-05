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

migration_one="${repo_root}/supabase/migrations/20260902032551_fmm_003_rls_reconciliation.sql"
migration_two="${repo_root}/supabase/migrations/20260902034124_fmm_003_production_schema_history_reconciliation.sql"
rollback="${repo_root}/supabase/cleanup/fmm_003_phase_1b_rollback.sql"

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

verify_hash "a58572662478c98c43a71bf5fd193d80427292c51f2103273047b33b09649ee1" "${migration_one}"
verify_hash "ba1cd13261ab19501135127d3f1346a793a1cd5216939996d62485553951c1b9" "${migration_two}"
verify_hash "5a138406ce8dfc4c33a778edfbb1f4506419a46dc579b3cc322f4200099554c8" "${rollback}"

production_placeholders=(
  "20260805161853_public_content_seo.sql"
  "20260812034808_harden_function_paths_and_rls_roles.sql"
  "20260812034953_optimize_core_tenant_rls_checks.sql"
  "20260812035104_revoke_public_trigger_function_execution.sql"
  "20260813221718_evidence_driven_dispute_engine.sql"
  "20260813221952_harden_evidence_engine_privileges_and_indexes.sql"
  "20260823190143_retention_queue_cleanup.sql"
  "20260829214723_product_acquisition_analytics.sql"
)

mkdir -p "${migrations_dir}"
printf '%s\n' 'project_id = "fmm003-release-manifest"' > "${output_dir}/supabase/config.toml"

for placeholder in "${production_placeholders[@]}"; do
  printf '%s\n' \
    '-- Intentionally inert placeholder for a migration already recorded in production.' \
    > "${migrations_dir}/${placeholder}"
done

cp "${migration_one}" "${migrations_dir}/"
cp "${migration_two}" "${migrations_dir}/"

expected_files=(
  "${production_placeholders[@]}"
  "20260902032551_fmm_003_rls_reconciliation.sql"
  "20260902034124_fmm_003_production_schema_history_reconciliation.sql"
)

actual_list="$(find "${migrations_dir}" -maxdepth 1 -type f -name '*.sql' -exec basename {} \; | sort)"
expected_list="$(printf '%s\n' "${expected_files[@]}" | sort)"

if [[ "${actual_list}" != "${expected_list}" ]]; then
  echo "release manifest contains an unexpected migration set" >&2
  diff -u <(printf '%s\n' "${expected_list}") <(printf '%s\n' "${actual_list}") || true
  exit 67
fi

source_count="$(find "${repo_root}/supabase/migrations" -maxdepth 1 -type f -name '*.sql' | wc -l | tr -d ' ')"
source_overlap="$(comm -12 \
  <(find "${repo_root}/supabase/migrations" -maxdepth 1 -type f -name '*.sql' -exec basename {} \; | sort) \
  <(printf '%s\n' "${actual_list}") | wc -l | tr -d ' ')"

if [[ "${source_count}" != "31" || "${source_overlap}" != "2" ]]; then
  echo "source/manifest migration-set invariant failed" >&2
  echo "source_count=${source_count} source_overlap=${source_overlap}" >&2
  exit 68
fi

echo "manifest=${output_dir}"
echo "migration_files=10"
echo "production_placeholders=8"
echo "authorized_source_migrations=2"
echo "excluded_source_migrations=29"
shasum -a 256 \
  "${migrations_dir}/20260902032551_fmm_003_rls_reconciliation.sql" \
  "${migrations_dir}/20260902034124_fmm_003_production_schema_history_reconciliation.sql"
