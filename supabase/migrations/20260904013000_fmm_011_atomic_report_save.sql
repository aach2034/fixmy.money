-- FMM-011: commit a reviewed credit-report import as one database transaction.
-- The trusted server supplies the authenticated actor and tenant binding. Any
-- validation or insert failure rolls the entire function call back.

ALTER TABLE public.parsed_credit_reports
  ADD COLUMN import_commit_key text;

CREATE UNIQUE INDEX parsed_credit_reports_import_commit_key
  ON public.parsed_credit_reports (owner_id, client_id, import_commit_key)
  WHERE import_commit_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.save_credit_report_atomic_server(
  p_actor_id uuid,
  p_workspace_id uuid,
  p_client_id uuid,
  p_commit_key text,
  p_report jsonb,
  p_items jsonb,
  p_client_updates jsonb
)
RETURNS TABLE(report_id uuid, saved_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner_id uuid;
  v_report_id uuid;
  v_saved_count integer;
BEGIN
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SERVER_ROLE_REQUIRED';
  END IF;
  IF p_commit_key IS NULL OR length(p_commit_key) NOT BETWEEN 32 AND 128
     OR jsonb_typeof(p_report) <> 'object' OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_IMPORT_COMMIT';
  END IF;

  SELECT workspace.owner_id INTO v_owner_id
  FROM public.workspaces workspace
  JOIN public.workspace_memberships membership
    ON membership.workspace_id = workspace.id
   AND membership.user_id = p_actor_id
   AND membership.status = 'active'
   AND membership.is_selected IS TRUE
   AND membership.role IN ('owner', 'admin', 'specialist')
  JOIN public.staff_clients client
    ON client.id = p_client_id
   AND client.workspace_id = workspace.id
   AND client.owner_id = workspace.owner_id
  WHERE workspace.id = p_workspace_id AND workspace.is_active IS TRUE;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'IMPORT_CLIENT_ACCESS_DENIED';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner_id::text || ':' || p_client_id::text || ':' || p_commit_key, 11011)
  );
  SELECT report.id INTO v_report_id
  FROM public.parsed_credit_reports report
  WHERE report.owner_id = v_owner_id AND report.client_id = p_client_id
    AND report.import_commit_key = p_commit_key;
  IF v_report_id IS NOT NULL THEN
    RETURN QUERY SELECT v_report_id, count(*)::integer
      FROM public.negative_items item WHERE item.report_id = v_report_id;
    RETURN;
  END IF;

  INSERT INTO public.parsed_credit_reports (
    owner_id, client_id, provider, provider_confidence, parser_version,
    report_date, overall_confidence, sections_parsed, sections_missed,
    warnings, personal_info, scores, accounts_count, negative_count,
    collections_count, inquiries_count, public_records_count, raw_text,
    file_name, status, all_accounts, all_inquiries, public_records,
    section_confidence, import_commit_key
  ) VALUES (
    v_owner_id, p_client_id,
    COALESCE(NULLIF(p_report->>'provider',''), 'unknown'),
    COALESCE((p_report->>'provider_confidence')::integer, 0),
    COALESCE(NULLIF(p_report->>'parser_version',''), 'unknown'),
    COALESCE(p_report->>'report_date',''),
    COALESCE((p_report->>'overall_confidence')::integer, 0),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_report->'sections_parsed')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_report->'sections_missed')), ARRAY[]::text[]),
    COALESCE(p_report->'warnings','[]'::jsonb),
    COALESCE(p_report->'personal_info','{}'::jsonb),
    COALESCE(p_report->'scores','[]'::jsonb),
    COALESCE((p_report->>'accounts_count')::integer, 0),
    COALESCE((p_report->>'negative_count')::integer, 0),
    COALESCE((p_report->>'collections_count')::integer, 0),
    COALESCE((p_report->>'inquiries_count')::integer, 0),
    COALESCE((p_report->>'public_records_count')::integer, 0),
    '', COALESCE(p_report->>'file_name',''), 'pending_review',
    COALESCE(p_report->'all_accounts','[]'::jsonb),
    COALESCE(p_report->'all_inquiries','[]'::jsonb),
    COALESCE(p_report->'public_records','[]'::jsonb),
    COALESCE(p_report->'section_confidence','{}'::jsonb), p_commit_key
  ) RETURNING id INTO v_report_id;

  INSERT INTO public.negative_items (
    owner_id, client_id, report_id, bureau, creditor_name, furnisher_name,
    account_number_masked, account_type, status, balance, past_due,
    date_opened, date_reported, date_last_activity, negative_reason,
    negative_category, dispute_status, bureaus_reporting, remarks,
    parser_confidence, raw_text_source, is_negative, is_collection
  )
  SELECT v_owner_id, p_client_id, v_report_id,
    COALESCE(item.bureau,'Unknown'), COALESCE(item.creditor_name,''),
    COALESCE(item.furnisher_name,''), COALESCE(item.account_number_masked,''),
    COALESCE(item.account_type,''), COALESCE(item.status,''), item.balance,
    item.past_due, COALESCE(item.date_opened,''), COALESCE(item.date_reported,''),
    COALESCE(item.date_last_activity,''), COALESCE(item.negative_reason,''),
    COALESCE(item.negative_category,'other')::public.negative_item_category,
    'draft'::public.dispute_workflow_status,
    COALESCE(item.bureaus_reporting,ARRAY[]::text[]),
    COALESCE(item.remarks,ARRAY[]::text[]), COALESCE(item.parser_confidence,0),
    '', COALESCE(item.is_negative,false), COALESCE(item.is_collection,false)
  FROM jsonb_to_recordset(p_items) AS item(
    bureau text, creditor_name text, furnisher_name text,
    account_number_masked text, account_type text, status text,
    balance numeric, past_due numeric, date_opened text, date_reported text,
    date_last_activity text, negative_reason text, negative_category text,
    bureaus_reporting text[], remarks text[], parser_confidence integer,
    is_negative boolean, is_collection boolean
  );
  GET DIAGNOSTICS v_saved_count = ROW_COUNT;

  UPDATE public.staff_clients SET
    last_activity = COALESCE(NULLIF(p_client_updates->>'last_activity',''), last_activity),
    report_analyzed = CASE WHEN p_client_updates ? 'report_analyzed'
      THEN (p_client_updates->>'report_analyzed')::boolean ELSE report_analyzed END,
    address = COALESCE(NULLIF(p_client_updates->>'address',''), address),
    city = COALESCE(NULLIF(p_client_updates->>'city',''), city),
    state = COALESCE(NULLIF(p_client_updates->>'state',''), state),
    zip = COALESCE(NULLIF(p_client_updates->>'zip',''), zip),
    credit_score = CASE WHEN p_client_updates ? 'credit_score'
      THEN (p_client_updates->>'credit_score')::integer ELSE credit_score END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_client_id AND workspace_id = p_workspace_id AND owner_id = v_owner_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'IMPORT_CLIENT_UPDATE_FAILED';
  END IF;

  RETURN QUERY SELECT v_report_id, v_saved_count;
END;
$$;

REVOKE ALL ON FUNCTION public.save_credit_report_atomic_server(uuid,uuid,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_credit_report_atomic_server(uuid,uuid,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_credit_report_import_server(
  p_actor_id uuid, p_workspace_id uuid, p_client_id uuid,
  p_report_id uuid, p_import_id uuid, p_items jsonb, p_snapshot jsonb
)
RETURNS TABLE(saved_count integer, snapshot_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_owner_id uuid; v_saved integer; v_snapshot uuid;
BEGIN
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='SERVER_ROLE_REQUIRED';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 500
     OR jsonb_typeof(p_snapshot) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='INVALID_IMPORT_COMMIT';
  END IF;
  SELECT workspace.owner_id INTO v_owner_id
  FROM public.workspaces workspace
  JOIN public.workspace_memberships membership ON membership.workspace_id=workspace.id
    AND membership.user_id=p_actor_id AND membership.status='active'
    AND membership.is_selected IS TRUE AND membership.role IN ('owner','admin','specialist')
  JOIN public.staff_clients client ON client.id=p_client_id
    AND client.workspace_id=workspace.id AND client.owner_id=workspace.owner_id
  JOIN public.parsed_credit_reports report ON report.id=p_report_id
    AND report.client_id=client.id AND report.owner_id=workspace.owner_id
  WHERE workspace.id=p_workspace_id AND workspace.is_active IS TRUE;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='IMPORT_CLIENT_ACCESS_DENIED';
  END IF;
  IF p_import_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.credit_report_imports import
    WHERE import.id=p_import_id AND import.owner_id=v_owner_id AND import.client_id=p_client_id
  ) THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='IMPORT_CLIENT_ACCESS_DENIED'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_report_id::text,11011));
  INSERT INTO public.negative_items (
    owner_id,client_id,report_id,source_import_id,bureau,creditor_name,furnisher_name,
    account_number_masked,account_type,status,balance,past_due,date_opened,date_reported,
    negative_reason,negative_category,dispute_reason,dispute_instruction,dispute_status,
    is_selected,is_negative,is_collection,raw_text_source,parser_confidence,remarks,
    bureaus_reporting,notes,tag_status,tagged_at,tagged_by
  ) SELECT v_owner_id,p_client_id,p_report_id,p_report_id,
    COALESCE(item.bureau,'Unknown'),COALESCE(item.creditor_name,''),COALESCE(item.furnisher_name,''),
    COALESCE(item.account_number_masked,''),COALESCE(item.account_type,''),COALESCE(item.status,''),
    item.balance,item.past_due,COALESCE(item.date_opened,''),COALESCE(item.date_reported,''),
    COALESCE(item.negative_reason,''),COALESCE(item.negative_category,'other')::public.negative_item_category,
    COALESCE(item.dispute_reason,''),COALESCE(item.dispute_instruction,''),
    COALESCE(item.dispute_status,'draft')::public.dispute_workflow_status,
    COALESCE(item.is_selected,false),COALESCE(item.is_negative,false),COALESCE(item.is_collection,false),
    '',COALESCE(item.parser_confidence,0),COALESCE(item.remarks,ARRAY[]::text[]),
    COALESCE(item.bureaus_reporting,ARRAY[]::text[]),COALESCE(item.notes,''),
    COALESCE(item.tag_status,'unreviewed'),item.tagged_at,item.tagged_by
  FROM jsonb_to_recordset(p_items) AS item(
    bureau text,creditor_name text,furnisher_name text,account_number_masked text,account_type text,
    status text,balance numeric,past_due numeric,date_opened text,date_reported text,negative_reason text,
    negative_category text,dispute_reason text,dispute_instruction text,dispute_status text,is_selected boolean,
    is_negative boolean,is_collection boolean,parser_confidence integer,remarks text[],bureaus_reporting text[],
    notes text,tag_status text,tagged_at timestamptz,tagged_by uuid
  );
  GET DIAGNOSTICS v_saved = ROW_COUNT;

  INSERT INTO public.credit_report_snapshots(
    owner_id,client_id,import_id,parsed_report_id,provider,report_date,snapshot_data,
    scores,personal_info,accounts_count,negative_count,tagged_count
  ) VALUES(v_owner_id,p_client_id,p_import_id,p_report_id,
    COALESCE(p_snapshot->>'provider','unknown'),COALESCE(p_snapshot->>'report_date',''),
    COALESCE(p_snapshot->'snapshot_data','{}'),COALESCE(p_snapshot->'scores','[]'),
    COALESCE(p_snapshot->'personal_info','{}'),COALESCE((p_snapshot->>'accounts_count')::integer,0),
    COALESCE((p_snapshot->>'negative_count')::integer,0),COALESCE((p_snapshot->>'tagged_count')::integer,0)
  ) RETURNING id INTO v_snapshot;

  UPDATE public.parsed_credit_reports SET status='saved',saved_at=CURRENT_TIMESTAMP,
    tagged_count=COALESCE((p_snapshot->>'tagged_count')::integer,0),snapshot_saved=true
  WHERE id=p_report_id AND owner_id=v_owner_id AND client_id=p_client_id;
  IF p_import_id IS NOT NULL THEN
    UPDATE public.credit_report_imports SET import_status='saved',
      tagged_count=COALESCE((p_snapshot->>'tagged_count')::integer,0),wizard_items_count=v_saved,
      save_result='Saved '||v_saved||' accounts transactionally'
    WHERE id=p_import_id AND owner_id=v_owner_id AND client_id=p_client_id;
  END IF;
  RETURN QUERY SELECT v_saved,v_snapshot;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_credit_report_import_server(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_credit_report_import_server(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb)
  TO service_role;
