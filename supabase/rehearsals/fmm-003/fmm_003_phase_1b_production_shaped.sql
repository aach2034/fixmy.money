-- Synthetic-only Phase 1B fixture set. Run only in the positively identified
-- disposable FMM-003 rehearsal project. No values originate from production.

BEGIN;

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token,
  email_confirmed_at,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at,
  updated_at
)
VALUES
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a@phase1b.invalid', crypt('SyntheticPhase1bOnly!', gen_salt('bf')), '', '', '', '', '', '', '', '', '2026-01-01T00:00:00Z', '{"full_name":"Synthetic Owner A"}', '{"provider":"email","providers":["email"]}', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('b2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b@phase1b.invalid', crypt('SyntheticPhase1bOnly!', gen_salt('bf')), '', '', '', '', '', '', '', '', '2026-01-01T00:00:00Z', '{"full_name":"Synthetic Owner B"}', '{"provider":"email","providers":["email"]}', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('c3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member-c@phase1b.invalid', crypt('SyntheticPhase1bOnly!', gen_salt('bf')), '', '', '', '', '', '', '', '', '2026-01-01T00:00:00Z', '{"full_name":"Synthetic Member Candidate"}', '{"provider":"email","providers":["email"]}', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('d4000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'portal-a@phase1b.invalid', crypt('SyntheticPhase1bOnly!', gen_salt('bf')), '', '', '', '', '', '', '', '', '2026-01-01T00:00:00Z', '{"full_name":"Synthetic Portal A"}', '{"provider":"email","providers":["email"]}', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('e5000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'portal-b@phase1b.invalid', crypt('SyntheticPhase1bOnly!', gen_salt('bf')), '', '', '', '', '', '', '', '', '2026-01-01T00:00:00Z', '{"full_name":"Synthetic Portal B"}', '{"provider":"email","providers":["email"]}', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('f6000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-f@phase1b.invalid', crypt('SyntheticPhase1bOnly!', gen_salt('bf')), '', '', '', '', '', '', '', '', '2026-01-01T00:00:00Z', '{"full_name":"Synthetic Admin"}', '{"provider":"email","providers":["email"]}', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');

INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
SELECT
  gen_random_uuid(),
  users.email,
  users.id,
  jsonb_build_object('sub', users.id::text, 'email', users.email, 'email_verified', true),
  'email',
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z'
FROM auth.users AS users
WHERE users.email LIKE '%@phase1b.invalid';

-- handle_new_user() creates one profile and one owned workspace per identity.
-- Make workspace identifiers deterministic before dependent fixtures are added.
UPDATE public.workspaces SET id = 'a1000000-0000-0000-0000-000000000010', name = 'Synthetic Workspace A' WHERE owner_id = 'a1000000-0000-0000-0000-000000000001';
UPDATE public.workspaces SET id = 'b2000000-0000-0000-0000-000000000020', name = 'Synthetic Workspace B' WHERE owner_id = 'b2000000-0000-0000-0000-000000000002';
UPDATE public.workspaces SET id = 'c3000000-0000-0000-0000-000000000030', name = 'Synthetic Member Candidate Workspace' WHERE owner_id = 'c3000000-0000-0000-0000-000000000003';
UPDATE public.workspaces SET id = 'd4000000-0000-0000-0000-000000000040', name = 'Synthetic Portal A Workspace' WHERE owner_id = 'd4000000-0000-0000-0000-000000000004';
UPDATE public.workspaces SET id = 'e5000000-0000-0000-0000-000000000050', name = 'Synthetic Portal B Workspace' WHERE owner_id = 'e5000000-0000-0000-0000-000000000005';
UPDATE public.workspaces SET id = 'f6000000-0000-0000-0000-000000000060', name = 'Synthetic Admin Workspace' WHERE owner_id = 'f6000000-0000-0000-0000-000000000006';

-- Production has no workspace-membership relation. Member C intentionally has
-- no path to Workspace A; post-upgrade tests require this case to fail closed.

INSERT INTO public.staff_clients (id, owner_id, workspace_id, name, email, case_stage, pipeline_stage)
VALUES
  ('a1100000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000010', 'Synthetic Client A', 'portal-a@phase1b.invalid', 'active', 'active_client'),
  ('b2200000-0000-0000-0000-000000000022', 'b2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000020', 'Synthetic Client B', 'portal-b@phase1b.invalid', 'active', 'active_client');

INSERT INTO public.client_accounts (id, email, full_name)
VALUES
  ('a1200000-0000-0000-0000-000000000012', 'portal-a@phase1b.invalid', 'Synthetic Portal A'),
  ('b2300000-0000-0000-0000-000000000023', 'portal-b@phase1b.invalid', 'Synthetic Portal B');

INSERT INTO public.credit_report_uploads (id, user_id, file_name, file_type, file_size, storage_path, source_bureau, upload_status)
VALUES
  ('a1700000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000001', 'synthetic-a.json', 'application/json', 128, 'synthetic/a/report.json', 'Equifax', 'completed'),
  ('b2800000-0000-0000-0000-000000000028', 'b2000000-0000-0000-0000-000000000002', 'synthetic-b.json', 'application/json', 128, 'synthetic/b/report.json', 'TransUnion', 'completed');

INSERT INTO public.credit_report_analyses (id, upload_id, user_id, total_negative_accounts, negative_items, raw_analysis)
VALUES
  ('a1800000-0000-0000-0000-000000000018', 'a1700000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000001', 1, '[{"synthetic":true}]', '{"synthetic":true}'),
  ('b2900000-0000-0000-0000-000000000029', 'b2800000-0000-0000-0000-000000000028', 'b2000000-0000-0000-0000-000000000002', 1, '[{"synthetic":true}]', '{"synthetic":true}');

INSERT INTO public.dispute_letters (id, owner_id, client_id, analysis_id, letter_id, client_name, bureau, letter_status)
VALUES
  ('a1900000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000011', 'a1800000-0000-0000-0000-000000000018', 'SYNTH-A', 'Synthetic Client A', 'Equifax', 'draft'),
  ('b2a00000-0000-0000-0000-00000000002a', 'b2000000-0000-0000-0000-000000000002', 'b2200000-0000-0000-0000-000000000022', 'b2900000-0000-0000-0000-000000000029', 'SYNTH-B', 'Synthetic Client B', 'TransUnion', 'draft');

INSERT INTO public.generated_dispute_letters (id, owner_id, client_id, bureau, letter_content, items_count, status)
VALUES
  ('a1a00000-0000-0000-0000-00000000001a', 'a1000000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000011', 'Equifax', 'Synthetic letter A', 1, 'generated'),
  ('b2b00000-0000-0000-0000-00000000002b', 'b2000000-0000-0000-0000-000000000002', 'b2200000-0000-0000-0000-000000000022', 'TransUnion', 'Synthetic letter B', 1, 'generated');

INSERT INTO public.client_disputes (id, client_id, owner_id, workspace_id, analysis_id, letter_id, case_number, title, bureau)
VALUES
  ('a1300000-0000-0000-0000-000000000013', 'a1200000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000010', 'a1800000-0000-0000-0000-000000000018', 'a1900000-0000-0000-0000-000000000019', 'CASE-A', 'Synthetic Dispute A', 'Equifax'),
  ('b2400000-0000-0000-0000-000000000024', 'b2300000-0000-0000-0000-000000000023', 'b2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000020', 'b2900000-0000-0000-0000-000000000029', 'b2a00000-0000-0000-0000-00000000002a', 'CASE-B', 'Synthetic Dispute B', 'TransUnion');

INSERT INTO public.client_documents (id, client_id, dispute_id, file_name, file_url, file_size, mime_type)
VALUES
  ('a1400000-0000-0000-0000-000000000014', 'a1200000-0000-0000-0000-000000000012', 'a1300000-0000-0000-0000-000000000013', 'synthetic-a.pdf', 'private/synthetic-a.pdf', 128, 'application/pdf'),
  ('b2500000-0000-0000-0000-000000000025', 'b2300000-0000-0000-0000-000000000023', 'b2400000-0000-0000-0000-000000000024', 'synthetic-b.pdf', 'private/synthetic-b.pdf', 128, 'application/pdf');

INSERT INTO public.chat_conversations (id, client_account_id, specialist_id, subject)
VALUES
  ('a1500000-0000-0000-0000-000000000015', 'a1200000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000001', 'Synthetic Conversation A'),
  ('b2600000-0000-0000-0000-000000000026', 'b2300000-0000-0000-0000-000000000023', 'b2000000-0000-0000-0000-000000000002', 'Synthetic Conversation B');

INSERT INTO public.chat_messages (id, conversation_id, sender_type, sender_id, sender_name, content)
VALUES
  ('a1600000-0000-0000-0000-000000000016', 'a1500000-0000-0000-0000-000000000015', 'client', 'synthetic-a', 'Synthetic Portal A', 'Synthetic message A'),
  ('b2700000-0000-0000-0000-000000000027', 'b2600000-0000-0000-0000-000000000026', 'client', 'synthetic-b', 'Synthetic Portal B', 'Synthetic message B');

INSERT INTO public.dashboard_metrics (id, owner_id, active_clients, disputes_in_flight, letters_sent_mtd)
VALUES
  ('a1b00000-0000-0000-0000-00000000001b', 'a1000000-0000-0000-0000-000000000001', 1, 1, 1),
  ('b2c00000-0000-0000-0000-00000000002c', 'b2000000-0000-0000-0000-000000000002', 1, 1, 1);

INSERT INTO public.launch_directories (id, name, category, url, user_id)
VALUES
  ('a1c00000-0000-0000-0000-00000000001c', 'Synthetic Directory A', 'saas_directory', 'https://example.invalid/a', 'a1000000-0000-0000-0000-000000000001'),
  ('b2d00000-0000-0000-0000-00000000002d', 'Synthetic Directory B', 'saas_directory', 'https://example.invalid/b', 'b2000000-0000-0000-0000-000000000002');

INSERT INTO public.billing_events (id, workspace_id, event_type, stripe_event_id, stripe_customer_id, status, metadata)
VALUES
  ('a1d00000-0000-0000-0000-00000000001d', 'a1000000-0000-0000-0000-000000000010', 'synthetic.rehearsal', 'evt_test_phase1b_a', 'cus_test_phase1b_a', 'processed', '{"synthetic":true}'),
  ('b2e00000-0000-0000-0000-00000000002e', 'b2000000-0000-0000-0000-000000000020', 'synthetic.rehearsal', 'evt_test_phase1b_b', 'cus_test_phase1b_b', 'processed', '{"synthetic":true}');

INSERT INTO public.ai_usage_events (id, workspace_id, user_id, feature, model, units, status)
VALUES
  ('a1e00000-0000-0000-0000-00000000001e', 'a1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', 'synthetic_rehearsal', 'none', 1, 'completed'),
  ('b2f00000-0000-0000-0000-00000000002f', 'b2000000-0000-0000-0000-000000000020', 'b2000000-0000-0000-0000-000000000002', 'synthetic_rehearsal', 'none', 1, 'completed');

INSERT INTO public.report_provider_settings (id, workspace_id, provider_key, provider_name, affiliate_url, is_visible, is_preferred, display_order)
VALUES
  ('a1f00000-0000-0000-0000-00000000001f', 'a1000000-0000-0000-0000-000000000010', 'synthetic-a', 'Synthetic Provider A', 'https://example.invalid/provider-a', true, true, 1),
  ('b3000000-0000-0000-0000-000000000030', 'b2000000-0000-0000-0000-000000000020', 'synthetic-b', 'Synthetic Provider B', 'https://example.invalid/provider-b', true, true, 1);

INSERT INTO public.affiliate_link_clicks (id, client_id, agency_id, provider, source_page, user_id)
VALUES
  ('a2000000-0000-0000-0000-000000000020', 'a1100000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000010', 'synthetic-a', '/synthetic', 'a1000000-0000-0000-0000-000000000001'),
  ('b3100000-0000-0000-0000-000000000031', 'b2200000-0000-0000-0000-000000000022', 'b2000000-0000-0000-0000-000000000020', 'synthetic-b', '/synthetic', 'b2000000-0000-0000-0000-000000000002');

INSERT INTO public.leads (id, owner_id, first_name, last_name, email)
VALUES
  ('a2100000-0000-0000-0000-000000000021', 'a1000000-0000-0000-0000-000000000001', 'Synthetic', 'Lead A', 'lead-a@phase1b.invalid'),
  ('b3200000-0000-0000-0000-000000000032', 'b2000000-0000-0000-0000-000000000002', 'Synthetic', 'Lead B', 'lead-b@phase1b.invalid');

INSERT INTO public.consumer_services (id, owner_id, consumer_name, service_name, service_description)
VALUES
  ('a2200000-0000-0000-0000-000000000022', 'a1000000-0000-0000-0000-000000000001', 'Synthetic Consumer A', 'Synthetic Service', 'Phase 1B fixture'),
  ('b3300000-0000-0000-0000-000000000033', 'b2000000-0000-0000-0000-000000000002', 'Synthetic Consumer B', 'Synthetic Service', 'Phase 1B fixture');

INSERT INTO public.audit_logs (id, owner_id, action, description)
VALUES
  ('a2300000-0000-0000-0000-000000000023', 'a1000000-0000-0000-0000-000000000001', 'lead_created', 'Synthetic audit A'),
  ('b3400000-0000-0000-0000-000000000034', 'b2000000-0000-0000-0000-000000000002', 'lead_created', 'Synthetic audit B');

INSERT INTO public.state_compliance_configs (id, state_code, state_name, status)
VALUES ('f6300000-0000-0000-0000-000000000063', 'ZZ', 'Synthetic State', 'pending');

INSERT INTO public.platform_admins (id, user_id, role, active, notes)
VALUES ('f6100000-0000-0000-0000-000000000061', 'f6000000-0000-0000-0000-000000000006', 'platform_superadmin', true, 'Synthetic Phase 1B admin');

INSERT INTO public.admin_customer_notes (id, customer_id, admin_id, note_text)
VALUES ('f6200000-0000-0000-0000-000000000062', 'a1000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000006', 'Synthetic Phase 1B note');

COMMIT;
