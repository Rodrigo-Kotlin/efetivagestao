-- PRC-07B: dedicated remote fixtures and owner assertions for FPR-H01+.
-- Run after client_pricing_test_setup.sql. TEST ONLY.

BEGIN;

DO $$
DECLARE
  v_user uuid := '1933891b-e0b9-42fc-afaa-641966824742';
  v_main_org uuid := '66666666-6666-6666-6666-666666666661';
  v_client_only_org uuid := '77777777-7777-7777-7777-777777777761';
  v_commercial_only_org uuid := '77777777-7777-7777-7777-777777777762';
  v_both_org uuid := '77777777-7777-7777-7777-777777777763';
  v_client_only_role uuid := '77777777-7000-0000-0000-000000000001';
  v_commercial_only_role uuid := '77777777-7000-0000-0000-000000000002';
  v_both_role uuid := '77777777-7000-0000-0000-000000000003';
  v_function_oid oid;
  v_volatility "char";
  v_security_definer boolean;
  v_config text[];
  v_function_definition text;
BEGIN
  DELETE FROM organizations
  WHERE id IN (v_client_only_org, v_commercial_only_org, v_both_org);

  INSERT INTO organizations (id, name, slug, status) VALUES
    (v_client_only_org, 'PRC07B Client View Only', 'prc07b-client-view-only', 'active'),
    (v_commercial_only_org, 'PRC07B Commercial View Only', 'prc07b-commercial-view-only', 'active'),
    (v_both_org, 'PRC07B Both Views', 'prc07b-both-views', 'active');

  INSERT INTO roles (id, organization_id, code, name, description, is_system) VALUES
    (v_client_only_role, v_client_only_org, 'prc07b_client_only', 'PRC-07B Client Only', 'Test-only custom role', false),
    (v_commercial_only_role, v_commercial_only_org, 'prc07b_commercial_only', 'PRC-07B Commercial Only', 'Test-only custom role', false),
    (v_both_role, v_both_org, 'prc07b_both_views', 'PRC-07B Both Views', 'Test-only custom role', false);

  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_client_only_role, id FROM permissions WHERE code = 'pricing.client.view';
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_commercial_only_role, id FROM permissions WHERE code = 'pricing.commercial.view';
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_both_role, id FROM permissions
  WHERE code IN ('pricing.client.view', 'pricing.commercial.view');

  INSERT INTO organization_memberships (id, organization_id, user_id, status) VALUES
    ('77777777-6000-0000-0000-000000000001', v_client_only_org, v_user, 'active'),
    ('77777777-6000-0000-0000-000000000002', v_commercial_only_org, v_user, 'active'),
    ('77777777-6000-0000-0000-000000000003', v_both_org, v_user, 'active');
  INSERT INTO membership_roles (membership_id, role_id) VALUES
    ('77777777-6000-0000-0000-000000000001', v_client_only_role),
    ('77777777-6000-0000-0000-000000000002', v_commercial_only_role),
    ('77777777-6000-0000-0000-000000000003', v_both_role);

  IF (SELECT count(*) FROM role_permissions WHERE role_id = v_client_only_role) <> 1
     OR (SELECT count(*) FROM role_permissions WHERE role_id = v_commercial_only_role) <> 1
     OR (SELECT count(*) FROM role_permissions WHERE role_id = v_both_role) <> 2 THEN
    RAISE EXCEPTION 'PRC07B custom permission conjunction setup failed';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);

  INSERT INTO companies (
    id, organization_id, legal_name, trade_name, status, created_by, updated_by
  ) VALUES
    ('77777777-2000-0000-0000-000000000001', v_main_org, 'PRC07B Inactive Client', 'PRC07B Inactive', 'active', v_user, v_user),
    ('77777777-2000-0000-0000-000000000002', v_main_org, 'PRC07B Blocked Client', 'PRC07B Blocked', 'active', v_user, v_user),
    ('77777777-2000-0000-0000-000000000003', v_main_org, 'PRC07B Versionless Client', 'PRC07B Versionless', 'active', v_user, v_user),
    ('77777777-2000-0000-0000-000000000004', v_main_org, 'PRC07B Zero Client', 'PRC07B Zero', 'active', v_user, v_user);

  INSERT INTO client_profiles (company_id, organization_id, commercial_notes) VALUES
    ('77777777-2000-0000-0000-000000000001', v_main_org, 'PRC07B inactive context'),
    ('77777777-2000-0000-0000-000000000002', v_main_org, 'PRC07B blocked context'),
    ('77777777-2000-0000-0000-000000000003', v_main_org, 'PRC07B versionless path'),
    ('77777777-2000-0000-0000-000000000004', v_main_org, 'PRC07B zero short-circuit');

  INSERT INTO commercial_price_tables (id, organization_id, code, name, status) VALUES
    ('77777777-3000-0000-0000-000000000001', v_main_org, 'PRC07B-NO-VERSION', 'PRC07B No Version Table', 'active'),
    ('77777777-3000-0000-0000-000000000002', v_main_org, 'PRC07B-ZERO-FALLBACK', 'PRC07B Zero Fallback Table', 'active');

  INSERT INTO commercial_price_table_versions (
    id, organization_id, commercial_price_table_id, version_number,
    valid_from, valid_to, status, version_label
  ) VALUES (
    '77777777-3000-0000-0000-000000000003', v_main_org,
    '77777777-3000-0000-0000-000000000002', 1,
    DATE '2020-01-01', NULL, 'draft', 'PRC07B-zero-fallback-v1'
  );
  INSERT INTO commercial_price_items (
    id, organization_id, commercial_price_table_version_id, catalog_item_id,
    price_amount, currency, origin_type
  ) VALUES (
    '77777777-3000-0000-0000-000000000004', v_main_org,
    '77777777-3000-0000-0000-000000000003',
    '66666666-1000-0000-0000-000000000012', 45.0000, 'BRL', 'manual'
  );
  PERFORM set_config('app.commercial_price_rpc_active', 'true', true);
  UPDATE commercial_price_table_versions SET status = 'under_review'
  WHERE id = '77777777-3000-0000-0000-000000000003';
  UPDATE commercial_price_table_versions SET status = 'approved'
  WHERE id = '77777777-3000-0000-0000-000000000003';
  UPDATE commercial_price_table_versions SET status = 'active'
  WHERE id = '77777777-3000-0000-0000-000000000003';
  PERFORM set_config('app.commercial_price_rpc_active', 'false', true);

  -- Test-only published rows cover zero short-circuit, blocked context, and a
  -- valid assigned table without an applicable version.
  ALTER TABLE client_commercial_table_assignments DISABLE TRIGGER USER;
  INSERT INTO client_commercial_table_assignments (
    id, organization_id, client_company_id, commercial_price_table_id,
    status, valid_from, valid_to, notes, created_by, updated_by,
    submitted_by, submitted_at, approved_by, approved_at, published_by, published_at
  ) VALUES
    ('77777777-4000-0000-0000-000000000001', v_main_org,
     '77777777-2000-0000-0000-000000000004', '77777777-3000-0000-0000-000000000002',
     'active', current_date - 5, current_date + 5, 'zero override has nonzero table fallback',
     v_user, v_user, v_user, now(), v_user, now(), v_user, now()),
    ('77777777-4000-0000-0000-000000000002', v_main_org,
     '77777777-2000-0000-0000-000000000002', '66666666-3000-0000-0000-000000000001',
     'active', current_date - 5, current_date + 5, 'blocked client context',
     v_user, v_user, v_user, now(), v_user, now(), v_user, now()),
    ('77777777-4000-0000-0000-000000000003', v_main_org,
     '77777777-2000-0000-0000-000000000003', '77777777-3000-0000-0000-000000000001',
     'active', current_date - 5, current_date + 5, 'assigned table without version',
     v_user, v_user, v_user, now(), v_user, now(), v_user, now());
  ALTER TABLE client_commercial_table_assignments ENABLE TRIGGER USER;

  ALTER TABLE client_price_overrides DISABLE TRIGGER USER;
  INSERT INTO client_price_overrides (
    id, organization_id, client_company_id, catalog_item_id,
    price_amount, currency, reason, status, valid_from, valid_to,
    item_code_snapshot, item_name_snapshot, item_type_snapshot,
    created_by, created_at, updated_by, updated_at,
    submitted_by, submitted_at, approved_by, approved_at, published_by, published_at
  ) VALUES
    ('77777777-5000-0000-0000-000000000001', v_main_org,
     '77777777-2000-0000-0000-000000000004', '66666666-1000-0000-0000-000000000012',
     0.0000, 'BRL', 'PRC07B explicit zero', 'active', current_date - 5, current_date + 5,
     'PRC06C-WF-ZERO', 'PRC06C Zero Item', 'other_service',
     v_user, now(), v_user, now(), v_user, now(), v_user, now(), v_user, now()),
    ('77777777-5000-0000-0000-000000000002', v_main_org,
     '77777777-2000-0000-0000-000000000001', '66666666-1000-0000-0000-000000000002',
     77.0000, 'BRL', 'PRC07B inactive context', 'active', current_date - 5, current_date + 5,
     'PRC06B-ITEM-B', 'PRC06B Item B', 'other_service',
     v_user, now(), v_user, now(), v_user, now(), v_user, now(), v_user, now());
  ALTER TABLE client_price_overrides ENABLE TRIGGER USER;

  ALTER TABLE client_profiles DISABLE TRIGGER USER;
  UPDATE client_profiles
  SET status = CASE company_id
        WHEN '77777777-2000-0000-0000-000000000001'::uuid THEN 'inactive'
        WHEN '77777777-2000-0000-0000-000000000002'::uuid THEN 'blocked'
      END,
      status_reason = 'PRC07B context-only status'
  WHERE company_id IN (
    '77777777-2000-0000-0000-000000000001',
    '77777777-2000-0000-0000-000000000002'
  ) AND organization_id = v_main_org;
  ALTER TABLE client_profiles ENABLE TRIGGER USER;

  v_function_oid := to_regprocedure(
    'public.fn_resolve_final_client_price(uuid,uuid,uuid,date)'
  );
  IF v_function_oid IS NULL THEN
    RAISE EXCEPTION 'PRC07B final resolver is not installed';
  END IF;

  SELECT provolatile, prosecdef, proconfig
  INTO v_volatility, v_security_definer, v_config
  FROM pg_proc
  WHERE oid = v_function_oid;

  v_function_definition := pg_get_functiondef(v_function_oid);

  IF v_volatility <> 's' OR NOT v_security_definer
     OR NOT (v_config @> ARRAY['search_path=public']) THEN
    RAISE EXCEPTION 'PRC07B final resolver metadata is not STABLE/SECURITY DEFINER/search_path public';
  END IF;

  IF EXISTS (
       SELECT 1
       FROM pg_proc p,
       LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
       WHERE p.oid = v_function_oid
         AND acl.grantee = 0
         AND acl.privilege_type = 'EXECUTE'
     )
     OR has_function_privilege('anon', v_function_oid, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', v_function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'PRC07B final resolver execute exposure is invalid';
  END IF;

  IF v_function_definition NOT LIKE '%fn_resolve_client_price_override%'
     OR v_function_definition NOT LIKE '%fn_resolve_client_table_assignment%'
     OR v_function_definition NOT LIKE '%fn_resolve_commercial_table_price%'
     OR v_function_definition NOT LIKE '%TABLE_PRICE_NOT_FOUND%'
     OR v_function_definition NOT LIKE '%unexpected override status%'
     OR v_function_definition NOT LIKE '%unexpected assignment status%'
     OR v_function_definition NOT LIKE '%unexpected table-price status%' THEN
    RAISE EXCEPTION 'PRC07B deployed final resolver definition is incomplete';
  END IF;

  IF regexp_count(v_function_definition, 'public\.fn_resolve_client_price_override\(') <> 1
     OR regexp_count(v_function_definition, 'public\.fn_resolve_client_table_assignment\(') <> 1
     OR regexp_count(v_function_definition, 'public\.fn_resolve_commercial_table_price\(') <> 1
     OR strpos(v_function_definition, 'fn_resolve_client_price_override')
        >= strpos(v_function_definition, 'fn_resolve_client_table_assignment')
     OR strpos(v_function_definition, 'fn_resolve_client_table_assignment')
        >= strpos(v_function_definition, 'fn_resolve_commercial_table_price') THEN
    RAISE EXCEPTION 'PRC07B deployed component call count/order is invalid';
  END IF;

  IF v_function_definition !~ 'fn_resolve_client_price_override\s*\(\s*p_organization_id,\s*p_client_company_id,\s*p_catalog_item_id,\s*p_reference_date\s*\)'
     OR v_function_definition !~ 'fn_resolve_client_table_assignment\s*\(\s*p_organization_id,\s*p_client_company_id,\s*p_reference_date\s*\)'
     OR v_function_definition !~ 'fn_resolve_commercial_table_price\s*\(\s*p_organization_id,\s*v_table_id,\s*p_catalog_item_id,\s*p_reference_date\s*\)' THEN
    RAISE EXCEPTION 'PRC07B deployed reference-date propagation is invalid';
  END IF;

  IF v_function_definition NOT LIKE '%WHEN ''TABLE_NOT_FOUND'' THEN ''TABLE_NOT_FOUND''%'
     OR v_function_definition NOT LIKE '%WHEN ''VERSION_NOT_FOUND'' THEN ''VERSION_NOT_FOUND''%'
     OR v_function_definition NOT LIKE '%WHEN ''PRICE_NOT_FOUND'' THEN ''TABLE_PRICE_NOT_FOUND''%'
     OR regexp_count(v_function_definition, 'IS DISTINCT FROM ''BRL''') <> 2
     OR v_function_definition NOT LIKE '%partial override provenance%'
     OR v_function_definition NOT LIKE '%assignment contradicted existing client%'
     OR v_function_definition NOT LIKE '%client status mismatch between components%' THEN
    RAISE EXCEPTION 'PRC07B deployed mapping, BRL, or integrity guards are invalid';
  END IF;

  IF strpos(v_function_definition, 'auth.uid() IS NULL') = 0
     OR strpos(v_function_definition, 'public.is_member_of') = 0
     OR strpos(v_function_definition, 'pricing.client.view') = 0
     OR strpos(v_function_definition, 'pricing.commercial.view') = 0
     OR strpos(v_function_definition, 'auth.uid() IS NULL')
        >= strpos(v_function_definition, 'fn_resolve_client_price_override')
     OR strpos(v_function_definition, 'public.is_member_of')
        >= strpos(v_function_definition, 'fn_resolve_client_price_override')
     OR strpos(v_function_definition, 'pricing.client.view')
        >= strpos(v_function_definition, 'fn_resolve_client_price_override')
     OR strpos(v_function_definition, 'pricing.commercial.view')
        >= strpos(v_function_definition, 'fn_resolve_client_price_override') THEN
    RAISE EXCEPTION 'PRC07B deployed security gates do not precede disclosure';
  END IF;

  IF v_function_definition ~* '\m(client_price_overrides|client_commercial_table_assignments|commercial_price_table_versions|commercial_price_items)\M'
     OR v_function_definition ~* '\m(INSERT|UPDATE|DELETE)\M'
     OR v_function_definition ~* '(fn_calculate_price|fn_simulate_price|pricing_policies|supplier_cost|pricing\.calculate|fn_sync_)' THEN
    RAISE EXCEPTION 'PRC07B deployed final resolver contains forbidden dependencies or mutation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM permissions
    WHERE code LIKE 'pricing.final.%'
       OR code LIKE 'pricing.resolve.%'
       OR code = 'pricing.price.resolve'
  ) THEN
    RAISE EXCEPTION 'PRC07B must not create a final-price permission';
  END IF;

  RAISE NOTICE 'PRC07B SETUP DONE: custom conjunction roles and final resolver fixtures verified';
END $$;

COMMIT;
