-- PRC-04C: Pricing Engine Test Setup
-- Creates isolated fixtures for pricing engine tests (PRICE-H01..H46).
-- Extends PRC-04B pricing_test_setup.sql with supplier/cost fixtures.
-- Deterministic fixed UUIDs. Idempotent: resets on re-run.
--
-- WARNING: TEST-ONLY. Disables triggers to reset protected fixtures.
-- Only touches dedicated test organizations.

BEGIN;

-- ============================================================
-- 1. FIXTURE IDS (deterministic)
-- ============================================================
DO $$
DECLARE
  v_user_id uuid := 'd7df8bb1-7da4-4926-8bd2-2fe6ad8ac060';
  v_e2e_user_id uuid := '1933891b-e0b9-42fc-afaa-641966824742';

  v_p_org uuid := 'b3333333-3333-3333-3333-333333333333';
  v_x_org uuid := 'c3333333-3333-3333-3333-333333333333';
  v_y_org uuid := 'd3333333-3333-3333-3333-333333333333';
  v_z_org uuid := 'e3333333-3333-3333-3333-333333333333';

  v_p_cat uuid := 'b3333333-0000-0000-0000-000000000001';
  v_p_item_a uuid := 'b3333333-0000-0000-0000-000000000002';
  v_p_item_b uuid := 'b3333333-0000-0000-0000-000000000003';

  v_x_cat uuid := 'c3333333-0000-0000-0000-000000000001';
  v_x_item uuid := 'c3333333-0000-0000-0000-000000000002';

  -- Supplier/Cost fixture IDs
  v_supplier_company uuid := 'b3333333-aaaa-bbbb-cccc-000000000001';
  v_supplier_profile uuid := 'b3333333-aaaa-bbbb-cccc-000000000002';
  v_supplier_catalog_item_a uuid := 'b3333333-aaaa-bbbb-cccc-000000000003';
  v_supplier_catalog_item_b uuid := 'b3333333-aaaa-bbbb-cccc-000000000004';
  v_cost_table uuid := 'b3333333-aaaa-bbbb-cccc-000000000005';
  v_cost_version_1 uuid := 'b3333333-aaaa-bbbb-cccc-000000000006';
  v_cost_version_2 uuid := 'b3333333-aaaa-bbbb-cccc-000000000007';
  v_cost_item_1_a uuid := 'b3333333-aaaa-bbbb-cccc-000000000008';
  v_cost_item_1_b uuid := 'b3333333-aaaa-bbbb-cccc-000000000009';
  v_cost_item_2_a uuid := 'b3333333-aaaa-bbbb-cccc-000000000010';

  v_admin_role uuid;

  -- Unknown cost item (for COST_NOT_CONFIRMED tests)
  v_cost_item_not_provided uuid := 'b3333333-aaaa-bbbb-cccc-000000000011';
BEGIN
  -- ============================================================
  -- 2. RESET ALL FIXTURES (disable triggers for clean reset)
  -- ============================================================
  ALTER TABLE pricing_policy_components DISABLE TRIGGER USER;
  ALTER TABLE pricing_policy_versions DISABLE TRIGGER USER;
  ALTER TABLE pricing_policies DISABLE TRIGGER USER;
  ALTER TABLE supplier_cost_items DISABLE TRIGGER USER;
  ALTER TABLE supplier_cost_table_versions DISABLE TRIGGER USER;
  ALTER TABLE supplier_cost_tables DISABLE TRIGGER USER;
  ALTER TABLE supplier_catalog_items DISABLE TRIGGER USER;
  ALTER TABLE supplier_profiles DISABLE TRIGGER USER;

  DELETE FROM pricing_policy_components WHERE organization_id IN (v_p_org, v_x_org, v_y_org, v_z_org);
  DELETE FROM pricing_policy_versions WHERE organization_id IN (v_p_org, v_x_org, v_y_org, v_z_org);
  DELETE FROM pricing_policies WHERE organization_id IN (v_p_org, v_x_org, v_y_org, v_z_org);
  DELETE FROM supplier_cost_items WHERE organization_id IN (v_p_org);
  DELETE FROM supplier_cost_table_versions WHERE organization_id IN (v_p_org);
  DELETE FROM supplier_cost_tables WHERE organization_id IN (v_p_org);
  DELETE FROM supplier_catalog_items WHERE organization_id IN (v_p_org);
  DELETE FROM supplier_profiles WHERE organization_id IN (v_p_org);

  ALTER TABLE supplier_profiles ENABLE TRIGGER USER;
  ALTER TABLE supplier_catalog_items ENABLE TRIGGER USER;
  ALTER TABLE supplier_cost_tables ENABLE TRIGGER USER;
  ALTER TABLE supplier_cost_table_versions ENABLE TRIGGER USER;
  ALTER TABLE supplier_cost_items ENABLE TRIGGER USER;
  ALTER TABLE pricing_policies ENABLE TRIGGER USER;
  ALTER TABLE pricing_policy_versions ENABLE TRIGGER USER;
  ALTER TABLE pricing_policy_components ENABLE TRIGGER USER;

  -- ============================================================
  -- 3. RESET MEMBERSHIPS + CATALOG
  -- ============================================================
  DELETE FROM organization_memberships WHERE organization_id IN (v_p_org, v_x_org, v_y_org, v_z_org);
  DELETE FROM catalog_items WHERE organization_id IN (v_p_org, v_x_org, v_y_org, v_z_org);
  DELETE FROM catalog_categories WHERE organization_id IN (v_p_org, v_x_org, v_y_org, v_z_org);

  -- ============================================================
  -- 4. CREATE ORGS
  -- ============================================================
  INSERT INTO organizations (id, name, slug, status) VALUES
    (v_p_org, 'PRC04C Pricing Engine Org', 'prc04c-pricing', 'active'),
    (v_x_org, 'PRC04C Foreign Org', 'prc04c-foreign', 'active'),
    (v_y_org, 'PRC04C Viewer Org', 'prc04c-viewer', 'active'),
    (v_z_org, 'PRC04C Cross Org', 'prc04c-cross', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active';

  -- ============================================================
  -- 5. MEMBERSHIPS
  -- ============================================================
  SELECT id INTO v_admin_role FROM roles WHERE code = 'admin';

  -- P_ORG: admin (full access)
  INSERT INTO organization_memberships (id, organization_id, user_id, status)
  VALUES (gen_random_uuid(), v_p_org, v_user_id, 'active');
  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_admin_role
  FROM organization_memberships m
  WHERE m.organization_id = v_p_org AND m.user_id = v_user_id;

  -- Z_ORG: admin (for cross-tenant trigger tests)
  INSERT INTO organization_memberships (id, organization_id, user_id, status)
  VALUES (gen_random_uuid(), v_z_org, v_user_id, 'active');
  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_admin_role
  FROM organization_memberships m
  WHERE m.organization_id = v_z_org AND m.user_id = v_user_id;

  -- X_ORG: NO membership
  -- Y_ORG: NO membership

  -- E2E_TEST_USER: admin in P_ORG and Z_ORG (for remote E2E tests)
  INSERT INTO organization_memberships (id, organization_id, user_id, status)
  VALUES (gen_random_uuid(), v_p_org, v_e2e_user_id, 'active');
  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_admin_role
  FROM organization_memberships m
  WHERE m.organization_id = v_p_org AND m.user_id = v_e2e_user_id;

  INSERT INTO organization_memberships (id, organization_id, user_id, status)
  VALUES (gen_random_uuid(), v_z_org, v_e2e_user_id, 'active');
  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_admin_role
  FROM organization_memberships m
  WHERE m.organization_id = v_z_org AND m.user_id = v_e2e_user_id;

  -- ============================================================
  -- 6. CATALOG FIXTURES
  -- ============================================================
  INSERT INTO catalog_categories (id, organization_id, code, name, is_active)
  VALUES (v_p_cat, v_p_org, 'PRC04C-CAT', 'PRC04C Category', true);

  INSERT INTO catalog_items (id, organization_id, code, name, category_id, item_type, commercial_unit, execution_type, status, created_by, updated_by)
  VALUES
    (v_p_item_a, v_p_org, 'PRC04C-ITEM-A', 'PRC04C Item A', v_p_cat, 'other_service', 'unit', 'own', 'active', v_user_id, v_user_id),
    (v_p_item_b, v_p_org, 'PRC04C-ITEM-B', 'PRC04C Item B', v_p_cat, 'other_service', 'unit', 'own', 'active', v_user_id, v_user_id);

  INSERT INTO catalog_categories (id, organization_id, code, name, is_active)
  VALUES (v_x_cat, v_x_org, 'PRC04C-XCAT', 'PRC04C X Category', true);

  INSERT INTO catalog_items (id, organization_id, code, name, category_id, item_type, commercial_unit, execution_type, status, created_by, updated_by)
  VALUES (v_x_item, v_x_org, 'PRC04C-XITEM', 'PRC04C X Item', v_x_cat, 'other_service', 'unit', 'own', 'active', v_user_id, v_user_id);

  -- ============================================================
  -- 7. SUPPLIER COMPANY
  -- ============================================================
  INSERT INTO companies (id, organization_id, legal_name, status, created_by, updated_by)
  VALUES (v_supplier_company, v_p_org, 'PRC04C Test Supplier', 'active', v_user_id, v_user_id)
  ON CONFLICT (id) DO UPDATE SET legal_name = EXCLUDED.legal_name;

  -- ============================================================
  -- 8. SUPPLIER PROFILE
  -- ============================================================
  INSERT INTO supplier_profiles (company_id, organization_id, supplier_category, status, created_by, updated_by)
  VALUES (v_supplier_company, v_p_org, 'laboratory', 'active', v_user_id, v_user_id)
  ON CONFLICT (company_id) DO UPDATE SET status = 'active';

  -- ============================================================
  -- 9. SUPPLIER CATALOG ITEM MAPPINGS
  -- ============================================================
  INSERT INTO supplier_catalog_items (id, organization_id, supplier_company_id, catalog_item_id, external_code, external_name, normalized_external_name, external_unit, is_preferred, status, created_by, updated_by)
  VALUES
    (v_supplier_catalog_item_a, v_p_org, v_supplier_company, v_p_item_a, 'EXT-A', 'External Item A', 'external item a', 'unit', true, 'active', v_user_id, v_user_id),
    (v_supplier_catalog_item_b, v_p_org, v_supplier_company, v_p_item_b, 'EXT-B', 'External Item B', 'external item b', 'unit', true, 'active', v_user_id, v_user_id)
  ON CONFLICT (id) DO UPDATE SET external_name = EXCLUDED.external_name;

  -- ============================================================
  -- 10. COST TABLE + VERSIONS
  -- ============================================================
  INSERT INTO supplier_cost_tables (id, organization_id, supplier_company_id, code, name, status, created_by, updated_by)
  VALUES (v_cost_table, v_p_org, v_supplier_company, 'PRC04C-COST', 'PRC04C Cost Table', 'active', v_user_id, v_user_id)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- Disable overlap trigger temporarily for fixture creation
  ALTER TABLE supplier_cost_table_versions DISABLE TRIGGER USER;

  -- Version 1: active, covering 2026-01-01 → 2027-01-01
  INSERT INTO supplier_cost_table_versions (id, organization_id, cost_table_id, version_number, valid_from, valid_to, status, source_date, created_by, published_by, published_at)
  VALUES (v_cost_version_1, v_p_org, v_cost_table, 1, '2026-01-01', '2027-01-01', 'active', '2025-12-01', v_user_id, v_user_id, now())
  ON CONFLICT (id) DO UPDATE SET status = 'active';

  -- Version 2: scheduled, covering 2027-01-01 → ∞
  INSERT INTO supplier_cost_table_versions (id, organization_id, cost_table_id, version_number, valid_from, valid_to, status, source_date, created_by, published_by, published_at)
  VALUES (v_cost_version_2, v_p_org, v_cost_table, 2, '2027-01-01', NULL, 'scheduled', '2026-12-01', v_user_id, v_user_id, now())
  ON CONFLICT (id) DO UPDATE SET status = 'scheduled';

  ALTER TABLE supplier_cost_table_versions ENABLE TRIGGER USER;

  -- ============================================================
  -- 11. COST ITEMS
  -- ============================================================
  -- Disable trigger to insert into active versions (fixture reset)
  ALTER TABLE supplier_cost_items DISABLE TRIGGER USER;

  -- Version 1: Item A = 80, Item B = 120
  INSERT INTO supplier_cost_items (id, organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount, currency_code)
  VALUES
    (v_cost_item_1_a, v_p_org, v_cost_version_1, v_supplier_catalog_item_a, v_p_item_a, 'provided', 80.0000, 'BRL'),
    (v_cost_item_1_b, v_p_org, v_cost_version_1, v_supplier_catalog_item_b, v_p_item_b, 'provided', 120.0000, 'BRL')
  ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount;

  -- Version 2: Item A = 85 (higher cost for future simulation tests)
  INSERT INTO supplier_cost_items (id, organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount, currency_code)
  VALUES (v_cost_item_2_a, v_p_org, v_cost_version_2, v_supplier_catalog_item_a, v_p_item_a, 'provided', 85.0000, 'BRL')
  ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount;

  ALTER TABLE supplier_cost_items ENABLE TRIGGER USER;

  RAISE NOTICE 'PRC04C SETUP DONE: p_org=% supplier=% cost_table=% v1=% v2=%',
    v_p_org, v_supplier_company, v_cost_table, v_cost_version_1, v_cost_version_2;
END $$;

COMMIT;
