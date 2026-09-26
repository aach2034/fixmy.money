#!/usr/bin/env bash

set -Eeuo pipefail

# Never allow an invoking shell's xtrace setting to print connection material.
case "$-" in
  *x*) set +x ;;
esac

usage() {
  cat >&2 <<'USAGE'
usage: verify-fmm-002-production-db.sh <preflight|postflight>

Production/direct mode (the URL is passed through the environment, not argv):
  FMM002_DATABASE_URL=... FMM002_EXPECT_DATABASE=postgres \
    scripts/verify-fmm-002-production-db.sh preflight

Isolated local Docker mode:
  FMM002_DOCKER_CONTAINER=container FMM002_DATABASE_NAME=db \
    FMM002_EXPECT_DATABASE=db scripts/verify-fmm-002-production-db.sh preflight
USAGE
  exit 64
}

if [[ $# -ne 1 ]] || [[ "$1" != "preflight" && "$1" != "postflight" ]]; then
  usage
fi

mode="$1"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
guard_sql="${script_dir}/fmm-002-production-db-guard.sql"
production_project_ref="agxzfdyvewptjwdfuvwq"
expected_database="${FMM002_EXPECT_DATABASE:-}"
database_url="${FMM002_DATABASE_URL:-}"
docker_container="${FMM002_DOCKER_CONTAINER:-}"
database_name="${FMM002_DATABASE_NAME:-}"

if [[ -z "${expected_database}" ]]; then
  echo "FMM002_EXPECT_DATABASE is required; refusing an ambiguous target" >&2
  exit 65
fi

if [[ ! -r "${guard_sql}" ]]; then
  echo "guard SQL is missing or unreadable: ${guard_sql}" >&2
  exit 66
fi

export PGAPPNAME="fmm002-production-db-${mode}-guard"
export PGCONNECT_TIMEOUT="10"
export PGOPTIONS="-c default_transaction_read_only=on -c lock_timeout=5s -c statement_timeout=60s -c idle_in_transaction_session_timeout=60s"

psql_options=(
  --no-psqlrc
  --set=ON_ERROR_STOP=1
  --set="guard_mode=${mode}"
  --set="expected_database=${expected_database}"
  --file="${guard_sql}"
)

if [[ -n "${database_url}" ]]; then
  if [[ -n "${docker_container}" || -n "${database_name}" ]]; then
    echo "configure either direct mode or Docker mode, never both" >&2
    exit 67
  fi

  # Accept only the named Supabase project. Direct connections carry the
  # project ref in the hostname; pooler connections carry it in the username.
  # Parse in shell memory and never print the URI, username, host, or password.
  if [[ "${database_url}" != postgres://* && "${database_url}" != postgresql://* ]]; then
    echo "direct target is not a PostgreSQL URI" >&2
    exit 68
  fi
  uri_remainder="${database_url#*://}"
  authority="${uri_remainder%%/*}"
  if [[ "${authority}" != *@* ]]; then
    echo "direct target has no verifiable Supabase project identity" >&2
    exit 68
  fi
  uri_userinfo="${authority%%@*}"
  uri_username="${uri_userinfo%%:*}"
  uri_hostport="${authority##*@}"
  uri_hostname="${uri_hostport%%:*}"

  if [[ "${expected_database}" != "postgres" ]] \
     || ! {
       [[ "${uri_hostname}" == "db.${production_project_ref}.supabase.co" \
          && "${uri_username}" == "postgres" ]] \
       || [[ "${uri_hostname}" == *.pooler.supabase.com \
             && "${uri_username}" == "postgres.${production_project_ref}" ]]
     }; then
    echo "direct target is not the exact approved Supabase project/database" >&2
    exit 68
  fi

  psql_binary="${FMM002_PSQL_BIN:-psql}"
  if ! command -v "${psql_binary}" >/dev/null 2>&1; then
    echo "psql executable not found: ${psql_binary}" >&2
    exit 69
  fi

  # PGDATABASE keeps credentials out of the process argument list.
  PGDATABASE="${database_url}" "${psql_binary}" "${psql_options[@]}"
elif [[ -n "${docker_container}" && -n "${database_name}" ]]; then
  if [[ ! "${docker_container}" =~ ^[A-Za-z0-9_.-]+$ ]] \
     || [[ ! "${database_name}" =~ ^[A-Za-z0-9_.-]+$ ]] \
     || [[ "${database_name}" != "${expected_database}" ]]; then
    echo "invalid or mismatched Docker database target" >&2
    exit 68
  fi

  docker exec -i \
    --env "PGAPPNAME=${PGAPPNAME}" \
    --env "PGCONNECT_TIMEOUT=${PGCONNECT_TIMEOUT}" \
    --env "PGOPTIONS=${PGOPTIONS}" \
    "${docker_container}" \
    psql --no-psqlrc --username postgres --dbname "${database_name}" \
      --set=ON_ERROR_STOP=1 \
      --set="guard_mode=${mode}" \
      --set="expected_database=${expected_database}" \
    < "${guard_sql}"
else
  echo "configure FMM002_DATABASE_URL or both Docker target variables" >&2
  exit 67
fi
