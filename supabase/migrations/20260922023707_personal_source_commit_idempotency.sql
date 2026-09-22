-- A null client_id does not conflict in the existing three-column unique index.
-- Consumer-owned source commits must be idempotent without changing staff imports.
create unique index parsed_credit_reports_personal_commit_key
  on public.parsed_credit_reports (owner_id, import_commit_key)
  where client_id is null and import_commit_key like 'personal:%';
