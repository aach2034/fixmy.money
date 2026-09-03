BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

CREATE OR REPLACE FUNCTION pg_temp.statement_raises(statement text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE statement;
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.statement_lives(statement text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE statement;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Synthetic identities only. Marking them as portal identities suppresses the
-- automatic business-workspace creation so fixed tenant fixtures can follow.
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, email_confirmed_at, raw_user_meta_data,
  raw_app_meta_data, created_at, updated_at
)
VALUES
  ('71000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a@fmm007.invalid', crypt('SyntheticFmm007Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM007 Owner A","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now()),
  ('72000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b@fmm007.invalid', crypt('SyntheticFmm007Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM007 Owner B","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now()),
  ('73000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'staff-ab@fmm007.invalid', crypt('SyntheticFmm007Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM007 Staff AB","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now()),
  ('74000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-a@fmm007.invalid', crypt('SyntheticFmm007Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM007 Viewer A","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now()),
  ('75000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'portal-shared@fmm007.invalid', crypt('SyntheticFmm007Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM007 Portal Shared","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now()),
  ('76000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@fmm007.invalid', crypt('SyntheticFmm007Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM007 Outsider","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now()),
  ('77000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client-a@fmm007.invalid', crypt('SyntheticFmm007Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM007 Invited Client","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now());

UPDATE public.user_profiles
SET account_type = CASE
  WHEN id IN ('71000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000002') THEN 'business'
  WHEN id IN ('73000000-0000-0000-0000-000000000003', '74000000-0000-0000-0000-000000000004') THEN 'staff'
  ELSE 'consumer'
END
WHERE email LIKE '%@fmm007.invalid';

INSERT INTO public.workspaces (id, owner_id, name, slug, is_active)
VALUES
  ('71100000-0000-0000-0000-000000000010', '71000000-0000-0000-0000-000000000001', 'FMM007 Workspace A', 'fmm007-a', true),
  ('72200000-0000-0000-0000-000000000020', '72000000-0000-0000-0000-000000000002', 'FMM007 Workspace B', 'fmm007-b', true);

INSERT INTO public.workspace_memberships (
  workspace_id, user_id, role, status, is_selected, invited_by
)
VALUES
  ('71100000-0000-0000-0000-000000000010', '73000000-0000-0000-0000-000000000003', 'specialist', 'active', true, '71000000-0000-0000-0000-000000000001'),
  ('72200000-0000-0000-0000-000000000020', '73000000-0000-0000-0000-000000000003', 'specialist', 'active', false, '72000000-0000-0000-0000-000000000002'),
  ('71100000-0000-0000-0000-000000000010', '74000000-0000-0000-0000-000000000004', 'viewer', 'active', true, '71000000-0000-0000-0000-000000000001');

INSERT INTO public.staff_clients (id, owner_id, workspace_id, name, email)
VALUES
  ('71110000-0000-0000-0000-000000000011', '71000000-0000-0000-0000-000000000001', '71100000-0000-0000-0000-000000000010', 'FMM007 Client A', 'client-a@fmm007.invalid'),
  ('71120000-0000-0000-0000-000000000012', '71000000-0000-0000-0000-000000000001', '71100000-0000-0000-0000-000000000010', 'FMM007 Shared Client A', 'portal-shared@fmm007.invalid'),
  ('72210000-0000-0000-0000-000000000021', '72000000-0000-0000-0000-000000000002', '72200000-0000-0000-0000-000000000020', 'FMM007 Shared Client B', 'portal-shared@fmm007.invalid');

UPDATE public.workspace_client_memberships SET id = '71130000-0000-0000-0000-000000000013'
WHERE staff_client_id = '71110000-0000-0000-0000-000000000011';
UPDATE public.workspace_client_memberships SET id = '71140000-0000-0000-0000-000000000014'
WHERE staff_client_id = '71120000-0000-0000-0000-000000000012';
UPDATE public.workspace_client_memberships SET id = '72230000-0000-0000-0000-000000000023'
WHERE staff_client_id = '72210000-0000-0000-0000-000000000021';

INSERT INTO public.client_accounts (id, auth_user_id, email, full_name)
VALUES (
  '75010000-0000-0000-0000-000000000051',
  '75000000-0000-0000-0000-000000000005',
  'portal-shared@fmm007.invalid',
  'FMM007 Shared Portal'
);

UPDATE public.workspace_client_memberships
SET client_account_id = '75010000-0000-0000-0000-000000000051'
WHERE id IN (
  '71140000-0000-0000-0000-000000000014',
  '72230000-0000-0000-0000-000000000023'
);

INSERT INTO public.client_disputes (
  id, workspace_client_id, case_number, title, bureau
)
VALUES
  ('71150000-0000-0000-0000-000000000015', '71140000-0000-0000-0000-000000000014', 'FMM007-A', 'Tenant A dispute', 'Equifax'),
  ('72240000-0000-0000-0000-000000000024', '72230000-0000-0000-0000-000000000023', 'FMM007-B', 'Tenant B dispute', 'TransUnion');

INSERT INTO public.chat_conversations (id, workspace_client_id, subject)
VALUES
  ('71160000-0000-0000-0000-000000000016', '71140000-0000-0000-0000-000000000014', 'Tenant A chat'),
  ('72250000-0000-0000-0000-000000000025', '72230000-0000-0000-0000-000000000023', 'Tenant B chat');

INSERT INTO public.chat_messages (
  id, conversation_id, sender_type, sender_id, sender_user_id, sender_name, content
)
VALUES
  ('71170000-0000-0000-0000-000000000017', '71160000-0000-0000-0000-000000000016', 'client', '75000000-0000-0000-0000-000000000005', '75000000-0000-0000-0000-000000000005', 'Portal', 'Tenant A message'),
  ('72260000-0000-0000-0000-000000000026', '72250000-0000-0000-0000-000000000025', 'client', '75000000-0000-0000-0000-000000000005', '75000000-0000-0000-0000-000000000005', 'Portal', 'Tenant B message');

INSERT INTO public.leads (id, owner_id, first_name, last_name, email)
VALUES
  ('71180000-0000-0000-0000-000000000018', '71000000-0000-0000-0000-000000000001', 'Lead', 'A', 'lead-a@fmm007.invalid'),
  ('72270000-0000-0000-0000-000000000027', '72000000-0000-0000-0000-000000000002', 'Lead', 'B', 'lead-b@fmm007.invalid');

INSERT INTO public.workspace_invitations (
  id, workspace_id, invitation_type, intended_email, token_hash,
  staff_client_id, created_by, expires_at
)
VALUES (
  '71190000-0000-0000-0000-000000000019',
  '71100000-0000-0000-0000-000000000010',
  'client_portal',
  'client-a@fmm007.invalid',
  encode(extensions.digest('fmm007-synthetic-invitation-token-00000001', 'sha256'), 'hex'),
  '71110000-0000-0000-0000-000000000011',
  '71000000-0000-0000-0000-000000000001',
  now() + interval '1 day'
);

-- Catalog guarantees.
SELECT ok(to_regclass('public.workspace_memberships') IS NOT NULL, 'staff membership relation exists');
SELECT ok(to_regclass('public.workspace_client_memberships') IS NOT NULL, 'workspace/client relation exists');
SELECT ok(to_regclass('public.workspace_invitations') IS NOT NULL, 'hashed invitation relation exists');
SELECT is((SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='staff_clients' AND column_name='workspace_id'), 'NO', 'client dossier workspace is mandatory');
SELECT is((SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='client_disputes' AND column_name='workspace_client_id'), 'NO', 'portal dispute relationship is mandatory');
SELECT is((SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('client_accounts','client_disputes','client_updates','client_documents','chat_conversations','chat_messages') AND (coalesce(qual,'') ILIKE '%jwt%email%' OR coalesce(with_check,'') ILIKE '%jwt%email%')), 0::bigint, 'portal policies never authorize by email');
SELECT is((SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private' AND p.proname LIKE 'specialist_owns_%'), 0::bigint, 'email ownership helper generation is removed');
SELECT is((
  SELECT count(*)
  FROM public.workspace_memberships
  WHERE role='owner'
    AND status='active'
    AND workspace_id IN (
      '71100000-0000-0000-0000-000000000010',
      '72200000-0000-0000-0000-000000000020'
    )
), 2::bigint, 'owner memberships were created automatically');
SELECT is((
  SELECT count(*)
  FROM public.workspace_client_memberships
  WHERE staff_client_id IN (
    '71110000-0000-0000-0000-000000000011',
    '71120000-0000-0000-0000-000000000012',
    '72210000-0000-0000-0000-000000000021'
  )
), 3::bigint, 'one relationship exists per client dossier');
SELECT is((SELECT count(*) FROM public.workspaces WHERE owner_id='75000000-0000-0000-0000-000000000005'), 0::bigint, 'portal Auth identity did not receive a business workspace');
SELECT is((SELECT count(*) FROM public.client_disputes WHERE owner_id IS NULL OR workspace_id IS NULL OR staff_client_id IS NULL), 0::bigint, 'portal dispute tenant keys are derived');
SELECT is((SELECT count(*) FROM public.chat_messages WHERE workspace_client_id IS NULL OR workspace_id IS NULL OR sender_user_id IS NULL), 0::bigint, 'chat tenant and sender keys are mandatory');
SELECT is((SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'workspace_evidence_storage_%'), 4::bigint, 'evidence storage has workspace-bound policies');

-- Owner A is isolated from B.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","email":"irrelevant@claim.invalid","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.staff_clients), 2::bigint, 'owner A reads only A clients');
SELECT is((SELECT count(*) FROM public.staff_clients WHERE workspace_id='72200000-0000-0000-0000-000000000020'), 0::bigint, 'owner A cannot read B client');
SELECT is((SELECT count(*) FROM public.leads), 1::bigint, 'owner A reads only A operational records');
SELECT ok(pg_temp.statement_raises($sql$UPDATE public.workspace_memberships SET is_selected=false WHERE user_id='74000000-0000-0000-0000-000000000004'$sql$), 'admin cannot change another member selected workspace');
SELECT ok(pg_temp.statement_raises($sql$INSERT INTO public.staff_clients (owner_id, workspace_id, name, email) VALUES ('71000000-0000-0000-0000-000000000001','72200000-0000-0000-0000-000000000020','Cross','cross@fmm007.invalid')$sql$), 'selected A member cannot insert into B');
RESET ROLE;

-- One staff identity can belong to two workspaces but exactly one is selected.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"73000000-0000-0000-0000-000000000003","email":"staff-ab@fmm007.invalid","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.staff_clients), 2::bigint, 'staff sees selected workspace A only');
SELECT is((SELECT count(*) FROM public.available_workspace_contexts()), 2::bigint, 'staff can safely list both available workspace names');
SELECT is((SELECT count(*) FROM public.staff_clients WHERE workspace_id='72200000-0000-0000-0000-000000000020'), 0::bigint, 'unselected authorized workspace remains hidden');
SELECT ok(pg_temp.statement_lives($sql$SELECT public.select_workspace('72200000-0000-0000-0000-000000000020')$sql$), 'staff can select an active membership');
SELECT is((SELECT count(*) FROM public.staff_clients), 1::bigint, 'after switching staff sees workspace B only');
SELECT is((SELECT count(*) FROM public.staff_clients WHERE workspace_id='71100000-0000-0000-0000-000000000010'), 0::bigint, 'previous workspace is hidden after switching');
SELECT is((SELECT count(*) FROM public.workspace_memberships WHERE user_id='73000000-0000-0000-0000-000000000003' AND is_selected), 1::bigint, 'only one workspace can be selected');
RESET ROLE;

-- Viewer can read but cannot mutate.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"74000000-0000-0000-0000-000000000004","email":"viewer-a@fmm007.invalid","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.staff_clients), 2::bigint, 'viewer reads selected workspace');
SELECT ok(pg_temp.statement_raises($sql$INSERT INTO public.staff_clients (owner_id, name, email) VALUES ('74000000-0000-0000-0000-000000000004','Denied','denied@fmm007.invalid')$sql$), 'viewer cannot create client dossier');
SELECT ok(pg_temp.statement_raises($sql$INSERT INTO public.leads (owner_id, first_name, last_name, email) VALUES ('74000000-0000-0000-0000-000000000004','Denied','Lead','denied-lead@fmm007.invalid')$sql$), 'viewer cannot create operational record');
RESET ROLE;

-- Unrelated identity has no tenant access and cannot select a workspace.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"76000000-0000-0000-0000-000000000006","email":"owner-a@fmm007.invalid","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.staff_clients), 0::bigint, 'outsider cannot read clients even with a copied email claim');
SELECT is((SELECT count(*) FROM public.workspaces), 0::bigint, 'outsider cannot read workspaces');
SELECT ok(pg_temp.statement_raises($sql$SELECT public.select_workspace('71100000-0000-0000-0000-000000000010')$sql$), 'outsider cannot select another workspace');
RESET ROLE;

-- An opaque invitation binds the signed-in Auth UUID to one exact dossier.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"77000000-0000-0000-0000-000000000007","email":"different-claim@fmm007.invalid","role":"authenticated"}', true);
SELECT is(public.accept_workspace_invitation('fmm007-synthetic-invitation-token-00000001')::text, 'client_portal', 'invited client accepts the exact relationship');
SELECT is((SELECT count(*) FROM public.available_portal_relationships()), 1::bigint, 'invited client sees only its accepted relationship');
SELECT is((SELECT count(*) FROM public.client_accounts WHERE auth_user_id='77000000-0000-0000-0000-000000000007'), 1::bigint, 'invitation binds immutable Auth UUID');
SELECT ok(pg_temp.statement_raises($sql$SELECT public.accept_workspace_invitation('fmm007-synthetic-invitation-token-00000001')$sql$), 'invitation token cannot be reused');
RESET ROLE;

-- One portal identity can legitimately access two exact agency relationships,
-- but no staff-only tenant surfaces.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"75000000-0000-0000-0000-000000000005","email":"changed-email@claim.invalid","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.client_accounts), 1::bigint, 'portal account is bound by Auth UUID, not email claim');
SELECT is((SELECT count(*) FROM public.workspace_client_memberships), 2::bigint, 'portal sees its two exact agency relationships');
SELECT is((SELECT count(*) FROM public.available_portal_relationships()), 2::bigint, 'portal receives safe names for its two agency relationships');
SELECT is((SELECT count(*) FROM public.client_disputes), 2::bigint, 'portal sees records for both legitimate relationships');
SELECT is((SELECT count(*) FROM public.staff_clients), 0::bigint, 'portal cannot read staff client dossiers');
SELECT is((SELECT count(*) FROM public.workspaces), 0::bigint, 'portal cannot read staff workspace rows');
SELECT ok(pg_temp.statement_lives($sql$INSERT INTO public.chat_messages (conversation_id, sender_type, sender_id, sender_name, content) VALUES ('71160000-0000-0000-0000-000000000016','client','','Portal','Allowed')$sql$), 'portal can message its exact relationship');
SELECT ok(pg_temp.statement_raises($sql$INSERT INTO public.chat_conversations (workspace_client_id, subject) VALUES ('71130000-0000-0000-0000-000000000013','Denied unlinked client')$sql$), 'portal cannot open chat for an unlinked dossier');
SELECT ok(pg_temp.statement_raises($sql$UPDATE public.client_accounts SET email='changed@fmm007.invalid' WHERE id='75010000-0000-0000-0000-000000000051'$sql$), 'portal cannot change identity binding fields');
RESET ROLE;

-- Composite constraints reject mixed-tenant records even outside RLS.
SELECT set_config('request.jwt.claims', '{}', true);
SELECT ok(pg_temp.statement_raises($sql$INSERT INTO public.dispute_letters (owner_id, workspace_id, client_id, letter_id) VALUES ('71000000-0000-0000-0000-000000000001','71100000-0000-0000-0000-000000000010','72210000-0000-0000-0000-000000000021','CROSS-TENANT')$sql$), 'database rejects mixed owner/client pair');
SELECT ok(pg_temp.statement_raises($sql$INSERT INTO public.affiliate_link_clicks (workspace_client_id, agency_id, client_id, provider, source_page) VALUES ('71140000-0000-0000-0000-000000000014','72200000-0000-0000-0000-000000000020','72210000-0000-0000-0000-000000000021','synthetic','test')$sql$), 'affiliate metadata cannot mix relationship, workspace, and client');
SELECT ok(pg_temp.statement_raises($sql$UPDATE public.staff_clients SET workspace_id='72200000-0000-0000-0000-000000000020', owner_id='72000000-0000-0000-0000-000000000002' WHERE id='71110000-0000-0000-0000-000000000011'$sql$), 'client dossier cannot be silently transferred');

SELECT * FROM finish();
ROLLBACK;
