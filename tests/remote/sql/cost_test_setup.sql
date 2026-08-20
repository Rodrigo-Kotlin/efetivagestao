-- PRC-03A: Remote Test Setup
-- Creates fixtures using the known auth user UUID

DO $$
DECLARE
  v_user_id uuid := 'd7df8bb1-7da4-4926-8bd2-2fe6ad8ac060';
  v_org_id uuid := 'a2222222-2222-2222-2222-222222222222';
  v_company_id uuid := 'b2222222-2222-2222-2222-222222222222';
  v_cat_id uuid;
  v_ci_id uuid;
  v_map_id uuid;
  v_role_id uuid;
  v_mem_id uuid;
  v_cost_table_id uuid;
BEGIN
  -- Cleanup previous test data
  -- immutability triggers (fn_sci_immutable_when_published etc.) block deletes
  -- on non-draft cost versions, so disable USER triggers for the reset.
  ALTER TABLE supplier_cost_items DISABLE TRIGGER USER;
  ALTER TABLE supplier_cost_table_versions DISABLE TRIGGER USER;
  ALTER TABLE supplier_cost_tables DISABLE TRIGGER USER;
  ALTER TABLE supplier_profiles DISABLE TRIGGER USER;
  ALTER TABLE supplier_catalog_items DISABLE TRIGGER USER;
  DELETE FROM supplier_cost_items WHERE organization_id = v_org_id;
  DELETE FROM supplier_cost_table_versions WHERE organization_id = v_org_id;
  DELETE FROM supplier_cost_tables WHERE organization_id = v_org_id;
  DELETE FROM supplier_profiles WHERE organization_id = v_org_id;
  DELETE FROM supplier_catalog_items WHERE organization_id = v_org_id;
  DELETE FROM catalog_items WHERE organization_id = v_org_id;
  DELETE FROM catalog_categories WHERE organization_id = v_org_id;
  DELETE FROM membership_roles WHERE membership_id IN (
    SELECT id FROM organization_memberships WHERE organization_id = v_org_id
  );
  DELETE FROM organization_memberships WHERE organization_id = v_org_id;
  DELETE FROM companies WHERE id = v_company_id;
  -- deleting the org SET NULLs audit_logs.organization_id (FK action), which the
  -- append-only audit trigger forbids — disable it just for this cleanup.
  ALTER TABLE audit_logs DISABLE TRIGGER USER;
  DELETE FROM organizations WHERE id = v_org_id;
  ALTER TABLE audit_logs ENABLE TRIGGER USER;
  ALTER TABLE supplier_catalog_items ENABLE TRIGGER USER;
  ALTER TABLE supplier_profiles ENABLE TRIGGER USER;
  ALTER TABLE supplier_cost_tables ENABLE TRIGGER USER;
  ALTER TABLE supplier_cost_table_versions ENABLE TRIGGER USER;
  ALTER TABLE supplier_cost_items ENABLE TRIGGER USER;

  -- Organization (no RLS INSERT policy — postgres can insert)
  INSERT INTO organizations (id, name, slug, status)
  VALUES (v_org_id, 'PRC03A Test Org', 'prc03a-' || floor(random()*100000)::int, 'active');
  RAISE NOTICE 'Org created: %', v_org_id;

  -- Membership + admin role
  INSERT INTO organization_memberships (id, organization_id, user_id, status)
  VALUES (gen_random_uuid(), v_org_id, v_user_id, 'active')
  RETURNING id INTO v_mem_id;

  SELECT id INTO v_role_id FROM roles WHERE code = 'admin';
  INSERT INTO membership_roles (membership_id, role_id)
  VALUES (v_mem_id, v_role_id);
  RAISE NOTICE 'Membership + admin role assigned';

  -- E2E user (rodrockr@gmail.com / 1933891b) is the active test actor and is
  -- granted admin in the same org so the remote harness can run with those
  -- credentials (PRC03A legacy user prc03atest@proton.me retained for history).
  INSERT INTO organization_memberships (id, organization_id, user_id, status)
  VALUES (gen_random_uuid(), v_org_id, '1933891b-e0b9-42fc-afaa-641966824742', 'active')
  RETURNING id INTO v_mem_id;
  INSERT INTO membership_roles (membership_id, role_id)
  VALUES (v_mem_id, v_role_id);

  -- Company
  INSERT INTO companies (id, organization_id, legal_name, trade_name, status, created_by, updated_by)
  VALUES (v_company_id, v_org_id, 'Test Supplier 03A', 'Test Sup', 'active', v_user_id, v_user_id);
  RAISE NOTICE 'Company created: %', v_company_id;

  -- Supplier profile (company_id is PK)
  INSERT INTO supplier_profiles (company_id, organization_id, supplier_category, status, created_by, updated_by)
  VALUES (v_company_id, v_org_id, 'other', 'active', v_user_id, v_user_id);
  RAISE NOTICE 'Supplier profile created';

  -- Catalog category (use existing in this org or create)
  SELECT id INTO v_cat_id FROM catalog_categories WHERE organization_id = v_org_id LIMIT 1;
  IF v_cat_id IS NULL THEN
    INSERT INTO catalog_categories (code, name, is_active, organization_id) VALUES ('T03A', 'Test Category', true, v_org_id) RETURNING id INTO v_cat_id;
  END IF;

  -- Catalog item (fixed id — the harness hardcodes these fixture ids)
  INSERT INTO catalog_items (id, organization_id, code, name, category_id, item_type, commercial_unit, execution_type, status, created_by, updated_by)
  VALUES ('c2222222-0000-0000-0000-000000000001', v_org_id, 'T03A-' || floor(random()*1000000)::int, 'Test Item 03A', v_cat_id, 'other_service', 'unit', 'own', 'active', v_user_id, v_user_id)
  RETURNING id INTO v_ci_id;
  RAISE NOTICE 'Catalog item created: %', v_ci_id;

  -- Supplier-catalog mapping (fixed id — matches the harness)
  INSERT INTO supplier_catalog_items (id, organization_id, supplier_company_id, catalog_item_id, external_code, external_name, normalized_external_name, status, created_by, updated_by)
  VALUES ('c2222222-0000-0000-0000-000000000002', v_org_id, v_company_id, v_ci_id, 'EXT-03A-' || floor(random()*1000000)::int, 'External 03A', 'external 03a', 'active', v_user_id, v_user_id)
  RETURNING id INTO v_map_id;
  RAISE NOTICE 'Mapping created: %', v_map_id;

  -- Cost table (fixed id — matches the harness; insert directly, bypassing RPC)
  INSERT INTO supplier_cost_tables (id, organization_id, supplier_company_id, code, name, status, created_by, updated_by)
  VALUES ('c2222222-0000-0000-0000-000000000003', v_org_id, v_company_id, 'TAB-03A-' || floor(random()*1000000)::int, 'Test Table 03A', 'active', v_user_id, v_user_id)
  RETURNING id INTO v_cost_table_id;
  RAISE NOTICE 'Cost table created: %', v_cost_table_id;

  -- Output the IDs for the test script
  RAISE NOTICE '=== SETUP IDS === org=% company=% catalog_item=% mapping=% cost_table=% user=%',
    v_org_id, v_company_id, v_ci_id, v_map_id, v_cost_table_id, v_user_id;
END $$;
