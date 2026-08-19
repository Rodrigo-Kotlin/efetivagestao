-- PRC-04B: Remote Test Setup (test-only, runs as postgres via supabase db execute)
-- Creates isolated fixtures for pricing policy integrity tests (POL-H01..H27).
-- Deterministic fixed UUIDs so the test script can reference them.
-- Idempotent: on re-run it resets the pricing data in the test orgs.
--
-- WARNING: This is a TEST-ONLY helper. It disables triggers on the pricing
-- tables to reset fixtures protected by immutability/hard-delete guards.
-- It is never exposed to production users and only touches the dedicated
-- test organizations below.

BEGIN;

-- ============================================================
-- 1. FIXTURE IDS (deterministic)
-- ============================================================
DO $$
DECLARE
  v_user_id uuid := 'd7df8bb1-7da4-4926-8bd2-2fe6ad8ac060';
  v_e2e_user_id uuid := '1933891b-e0b9-42fc-afaa-641966824742';

  v_p_org uuid := 'b3333333-3333-3333-3333-333333333333';  -- main pricing test org (admin)
  v_x_org uuid := 'c3333333-3333-3333-3333-333333333333';  -- foreign org (no membership)
  v_y_org uuid := 'd3333333-3333-3333-3333-333333333333';  -- viewer-only org (permissionless test)
  v_z_org uuid := 'e3333333-3333-3333-3333-333333333333';  -- admin org for cross-tenant trigger tests

  v_p_cat uuid := 'b3333333-0000-0000-0000-000000000001';
  v_p_item_a uuid := 'b3333333-0000-0000-0000-000000000002';
  v_p_item_b uuid := 'b3333333-0000-0000-0000-000000000003';

  v_x_cat uuid := 'c3333333-0000-0000-0000-000000000001';
  v_x_item uuid := 'c3333333-0000-0000-0000-000000000002';

  v_admin_role uuid;
  v_viewer_role uuid;
BEGIN
  -- ============================================================
  -- 2. RESET PRICING FIXTURES
  --    DISABLE TRIGGER USER disables only user-defined triggers (guards/audit)
  --    but keeps FK/RI triggers intact, so cascades still work.
  --    (DISABLE TRIGGER ALL would require superuser for RI triggers.)
  -- ============================================================
  ALTER TABLE pricing_policy_components DISABLE TRIGGER USER;
  ALTER TABLE pricing_policy_versions DISABLE TRIGGER USER;
  ALTER TABLE pricing_policies DISABLE TRIGGER USER;

  DELETE FROM pricing_policy_components
    WHERE organization_id IN (v_p_org, v_x_org, v_y_org, v_z_org);
  DELETE FROM pricing_policy_versions
    WHERE organization_id IN (v_p_org, v_x_org, v_y_org, v_z_org);
  DELETE FROM pricing_policies
    WHERE organization_id IN (v_p_org, v_x_org, v_y_org, v_z_org);

  ALTER TABLE pricing_policies ENABLE TRIGGER USER;
  ALTER TABLE pricing_policy_versions ENABLE TRIGGER USER;
  ALTER TABLE pricing_policy_components ENABLE TRIGGER USER;

  -- ============================================================
  -- 3. RESET CATALOG + MEMBERSHIP FIXTURES IN TEST ORGS
  -- ============================================================
  -- memberships (cascades membership_roles)
  DELETE FROM organization_memberships WHERE organization_id IN (v_p_org, v_x_org, v_y_org, v_z_org);

  -- catalog items/categories in test orgs (no aliases are created, so safe)
  DELETE FROM catalog_items WHERE organization_id IN (v_p_org, v_x_org, v_y_org, v_z_org);
  DELETE FROM catalog_categories WHERE organization_id IN (v_p_org, v_x_org, v_y_org, v_z_org);

  -- ============================================================
  -- 4. CREATE ORGS
  -- ============================================================
  INSERT INTO organizations (id, name, slug, status) VALUES
    (v_p_org, 'PRC04B Pricing Org', 'prc04b-pricing', 'active'),
    (v_x_org, 'PRC04B Foreign Org', 'prc04b-foreign', 'active'),
    (v_y_org, 'PRC04B Viewer Org', 'prc04b-viewer', 'active'),
    (v_z_org, 'PRC04B Cross Org', 'prc04b-cross', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active';

  -- ============================================================
  -- 5. MEMBERSHIPS
  -- ============================================================
  SELECT id INTO v_admin_role FROM roles WHERE code = 'admin';
  SELECT id INTO v_viewer_role FROM roles WHERE code = 'viewer';

  -- P_ORG: admin (full policy access)
  INSERT INTO organization_memberships (id, organization_id, user_id, status)
  VALUES (gen_random_uuid(), v_p_org, v_user_id, 'active');
  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_admin_role
  FROM organization_memberships m
  WHERE m.organization_id = v_p_org AND m.user_id = v_user_id;

  -- Y_ORG: viewer only (no policy permissions)
  INSERT INTO organization_memberships (id, organization_id, user_id, status)
  VALUES (gen_random_uuid(), v_y_org, v_user_id, 'active');
  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_viewer_role
  FROM organization_memberships m
  WHERE m.organization_id = v_y_org AND m.user_id = v_user_id;

  -- Z_ORG: admin (for cross-tenant trigger tests where RLS must pass)
  INSERT INTO organization_memberships (id, organization_id, user_id, status)
  VALUES (gen_random_uuid(), v_z_org, v_user_id, 'active');
  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_admin_role
  FROM organization_memberships m
  WHERE m.organization_id = v_z_org AND m.user_id = v_user_id;

  -- E2E_TEST_USER: admin in P_ORG and Z_ORG, viewer in Y_ORG (the real
  -- account the suite authenticates as — mirrors pricing_engine_test_setup.sql)
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

  INSERT INTO organization_memberships (id, organization_id, user_id, status)
  VALUES (gen_random_uuid(), v_y_org, v_e2e_user_id, 'active');
  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_viewer_role
  FROM organization_memberships m
  WHERE m.organization_id = v_y_org AND m.user_id = v_e2e_user_id;

  -- X_ORG: NO membership (foreign tenant)

  -- ============================================================
  -- 6. CATALOG FIXTURES
  -- ============================================================
  -- P_ORG: category + two items
  INSERT INTO catalog_categories (id, organization_id, code, name, is_active)
  VALUES (v_p_cat, v_p_org, 'PRC04B-CAT', 'PRC04B Category', true);

  INSERT INTO catalog_items (id, organization_id, code, name, category_id, item_type, commercial_unit, execution_type, status, created_by, updated_by)
  VALUES
    (v_p_item_a, v_p_org, 'PRC04B-ITEM-A', 'PRC04B Item A', v_p_cat, 'other_service', 'unit', 'own', 'active', v_user_id, v_user_id),
    (v_p_item_b, v_p_org, 'PRC04B-ITEM-B', 'PRC04B Item B', v_p_cat, 'other_service', 'unit', 'own', 'active', v_user_id, v_user_id);

  -- X_ORG: category + item (foreign tenant references)
  INSERT INTO catalog_categories (id, organization_id, code, name, is_active)
  VALUES (v_x_cat, v_x_org, 'PRC04B-XCAT', 'PRC04B X Category', true);

  INSERT INTO catalog_items (id, organization_id, code, name, category_id, item_type, commercial_unit, execution_type, status, created_by, updated_by)
  VALUES (v_x_item, v_x_org, 'PRC04B-XITEM', 'PRC04B X Item', v_x_cat, 'other_service', 'unit', 'own', 'active', v_user_id, v_user_id);

  RAISE NOTICE 'PRC04B SETUP DONE: p_org=% x_org=% y_org=% z_org=%', v_p_org, v_x_org, v_y_org, v_z_org;
END $$;

COMMIT;