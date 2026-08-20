-- PRC-05B: Remote Test Setup (test-only, runs as postgres via supabase db query)
-- Creates isolated fixtures for commercial price integrity tests (COM-H01..H57).
-- Deterministic fixed UUIDs so the test script can reference them.
-- Idempotent: on re-run it resets the commercial/cost/policy/supplier/catalog
-- fixtures in the dedicated test orgs below.
--
-- WARNING: This is a TEST-ONLY helper. It disables triggers on the commercial,
-- cost and pricing tables to reset fixtures protected by immutability/hard-delete
-- guards and to seed the published fixture. It is never exposed to production
-- users and only touches the dedicated test organizations.
--
-- At the end it also runs DB-level verifications that cannot be exercised from
-- the REST harness (normalizer semantics, role→permission mappings, orphan
-- permission, FK RESTRICT provenance chain, and the version completeness gate
-- under impersonation). Any violation raises and fails the setup transaction.

BEGIN;

-- ============================================================
-- 1. FIXTURE IDS (deterministic)
-- ============================================================
DO $$
DECLARE
  v_user_id uuid := 'd7df8bb1-7da4-4926-8bd2-2fe6ad8ac060';
  v_e2e_user_id uuid := '1933891b-e0b9-42fc-afaa-641966824742';

  -- Organizations
  v_c_org uuid := '55555555-5555-5555-5555-555555555551';  -- main commercial test org (admin)
  v_x_org uuid := '55555555-5555-5555-5555-555555555552';  -- foreign org (no membership)
  v_y_org uuid := '55555555-5555-5555-5555-555555555553';  -- viewer-only org
  v_z_org uuid := '55555555-5555-5555-5555-555555555554';  -- admin org for cross-tenant trigger tests
  v_o_org uuid := '55555555-5555-5555-5555-555555555555';  -- operator org
  v_m_org uuid := '55555555-5555-5555-5555-555555555556';  -- manager org

  -- Catalog fixtures
  v_c_cat  uuid := '55555555-0000-0000-0000-000000000001';
  v_item_a uuid := '55555555-0000-0000-0000-000000000002';  -- cOrg active
  v_item_b uuid := '55555555-0000-0000-0000-000000000003';  -- cOrg active
  v_item_i uuid := '55555555-0000-0000-0000-000000000004';  -- cOrg INACTIVE

  v_x_cat  uuid := '55555555-0000-0000-0000-000000000101';
  v_x_item uuid := '55555555-0000-0000-0000-000000000102';  -- xOrg active

  v_y_cat  uuid := '55555555-0000-0000-0000-000000000201';
  v_y_item uuid := '55555555-0000-0000-0000-000000000202';  -- yOrg active

  v_m_cat  uuid := '55555555-0000-0000-0000-000000000301';
  v_m_item uuid := '55555555-0000-0000-0000-000000000302';  -- mOrg active

  -- Companies / supplier profiles
  v_company    uuid := '55555555-1111-1111-1111-111111111111';  -- cOrg supplier
  v_company_z  uuid := '55555555-1111-1111-1111-111111111112';  -- zOrg company (cross-tenant)
  v_company2   uuid := '55555555-1111-1111-1111-111111111113';  -- cOrg supplier 2 (mismatch)

  -- Cost provenance fixtures
  v_cost_table    uuid := '55555555-2222-2222-2222-222222222221';
  v_cost_version  uuid := '55555555-2222-2222-2222-222222222222';
  v_cost_table2   uuid := '55555555-2222-2222-2222-222222222224';  -- belongs to v_company2
  v_cost_version2 uuid := '55555555-2222-2222-2222-222222222225';  -- under v_cost_table2

  -- Pricing policy provenance fixtures
  v_policy          uuid := '55555555-3333-3333-3333-333333333331';  -- cOrg default scope
  v_policy_version  uuid := '55555555-3333-3333-3333-333333333332';
  v_policy2         uuid := '55555555-3333-3333-3333-333333333333';  -- cOrg catalog_item scope (cItemB)
  v_policy_version2 uuid := '55555555-3333-3333-3333-333333333334';
  v_policy_z        uuid := '55555555-3333-3333-3333-333333333341';  -- zOrg default scope
  v_policy_version_z uuid := '55555555-3333-3333-3333-333333333342';

  -- Commercial published fixture (cOrg)
  v_pub_table    uuid := '55555555-4444-4444-4444-444444444441';  -- E2E-COM-PUB
  v_pub_version  uuid := '55555555-4444-4444-4444-444444444442';  -- active
  v_pub_item     uuid := '55555555-4444-4444-4444-444444444443';  -- manual price item

  -- Per-org read fixtures
  v_y_table       uuid := '55555555-4444-4444-4444-444444444451';  -- yOrg
  v_y_version     uuid := '55555555-4444-4444-4444-444444444454';
  v_y_price_item  uuid := '55555555-4444-4444-4444-444444444455';
  v_o_table       uuid := '55555555-4444-4444-4444-444444444452';  -- oOrg (read-only fixture)
  v_z_table       uuid := '55555555-4444-4444-4444-444444444471';  -- zOrg (cross-tenant refs)
  v_z_version     uuid := '55555555-4444-4444-4444-444444444472';

  -- FK RESTRICT provenance chain (cOrg, engine item)
  v_fk_table   uuid := '55555555-4444-4444-4444-444444444481';  -- E2E-COM-FK
  v_fk_version uuid := '55555555-4444-4444-4444-444444444482';
  v_fk_item    uuid := '55555555-4444-4444-4444-444444444483';

  -- Version completeness gate table (cOrg, exercised in verification block)
  v_h19_table   uuid := '55555555-4444-4444-4444-444444444461';
  v_h19_version uuid := '55555555-4444-4444-4444-444444444462';

  -- Supplier catalog mappings + cost items (PRC-05C engine RPC fixtures)
  v_sci_a  uuid := '55555555-aaaa-bbbb-cccc-0000000000a1'; -- v_item_a → v_company
  v_sci_b  uuid := '55555555-aaaa-bbbb-cccc-0000000000b1'; -- v_item_b → v_company
  v_sci_a2 uuid := '55555555-aaaa-bbbb-cccc-0000000000a2'; -- v_item_a → v_company2
  v_ci_a   uuid := '55555555-cccc-cccc-cccc-00000000000a'; -- v_cost_version / item_a
  v_ci_b   uuid := '55555555-cccc-cccc-cccc-00000000000b'; -- v_cost_version / item_b
  v_ci_a2  uuid := '55555555-cccc-cccc-cccc-00000000001a'; -- v_cost_version2 / item_a

  v_admin_role uuid;
  v_manager_role uuid;
  v_operator_role uuid;
  v_viewer_role uuid;

  v_count integer;
  v_err  boolean;
BEGIN
  -- ============================================================
  -- 2. RESET FIXTURES (FK-safe order; disable user triggers so that
  --    append-only / hard-delete / parent-draft guards do not block reset)
  -- ============================================================
  ALTER TABLE commercial_price_exceptions DISABLE TRIGGER USER;
  ALTER TABLE commercial_price_items DISABLE TRIGGER USER;
  ALTER TABLE commercial_price_table_versions DISABLE TRIGGER USER;
  ALTER TABLE commercial_price_tables DISABLE TRIGGER USER;

  ALTER TABLE pricing_policy_components DISABLE TRIGGER USER;
  ALTER TABLE pricing_policy_versions DISABLE TRIGGER USER;
  ALTER TABLE pricing_policies DISABLE TRIGGER USER;

  ALTER TABLE supplier_cost_items DISABLE TRIGGER USER;
  ALTER TABLE supplier_cost_table_versions DISABLE TRIGGER USER;
  ALTER TABLE supplier_cost_tables DISABLE TRIGGER USER;
  ALTER TABLE supplier_catalog_items DISABLE TRIGGER USER;
  ALTER TABLE supplier_profiles DISABLE TRIGGER USER;

  DELETE FROM commercial_price_exceptions
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);
  DELETE FROM commercial_price_items
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);
  DELETE FROM commercial_price_table_versions
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);
  DELETE FROM commercial_price_tables
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);

  DELETE FROM pricing_policy_components
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);
  DELETE FROM pricing_policy_versions
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);
  DELETE FROM pricing_policies
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);

  DELETE FROM supplier_cost_items
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);
  DELETE FROM supplier_cost_table_versions
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);
  DELETE FROM supplier_cost_tables
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);
  DELETE FROM supplier_catalog_items
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);
  DELETE FROM supplier_profiles
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);

  -- memberships (cascades membership_roles)
  DELETE FROM organization_memberships
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);

  -- catalog items/categories in test orgs
  DELETE FROM catalog_items
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);
  DELETE FROM catalog_categories
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);

  -- companies (after supplier_profiles deleted above)
  DELETE FROM companies
    WHERE organization_id IN (v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org);

  ALTER TABLE supplier_profiles ENABLE TRIGGER USER;
  ALTER TABLE supplier_catalog_items ENABLE TRIGGER USER;
  ALTER TABLE supplier_cost_tables ENABLE TRIGGER USER;
  ALTER TABLE supplier_cost_table_versions ENABLE TRIGGER USER;
  ALTER TABLE supplier_cost_items ENABLE TRIGGER USER;
  ALTER TABLE pricing_policies ENABLE TRIGGER USER;
  ALTER TABLE pricing_policy_versions ENABLE TRIGGER USER;
  ALTER TABLE pricing_policy_components ENABLE TRIGGER USER;

  -- ============================================================
  -- 3. CREATE ORGS
  -- ============================================================
  INSERT INTO organizations (id, name, slug, status) VALUES
    (v_c_org, 'PRC05B Commercial Org', 'prc05b-commercial', 'active'),
    (v_x_org, 'PRC05B Foreign Org', 'prc05b-foreign', 'active'),
    (v_y_org, 'PRC05B Viewer Org', 'prc05b-viewer', 'active'),
    (v_z_org, 'PRC05B Cross Org', 'prc05b-cross', 'active'),
    (v_o_org, 'PRC05B Operator Org', 'prc05b-operator', 'active'),
    (v_m_org, 'PRC05B Manager Org', 'prc05b-manager', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active';

  -- ============================================================
  -- 4. MEMBERSHIPS
  -- ============================================================
  SELECT id INTO v_admin_role FROM roles WHERE code = 'admin';
  SELECT id INTO v_manager_role FROM roles WHERE code = 'manager';
  SELECT id INTO v_operator_role FROM roles WHERE code = 'operator';
  SELECT id INTO v_viewer_role FROM roles WHERE code = 'viewer';

  -- E2E user: admin in C_ORG + Z_ORG, viewer in Y_ORG, operator in O_ORG, manager in M_ORG
  INSERT INTO organization_memberships (id, organization_id, user_id, status) VALUES
    (gen_random_uuid(), v_c_org, v_e2e_user_id, 'active'),
    (gen_random_uuid(), v_z_org, v_e2e_user_id, 'active'),
    (gen_random_uuid(), v_y_org, v_e2e_user_id, 'active'),
    (gen_random_uuid(), v_o_org, v_e2e_user_id, 'active'),
    (gen_random_uuid(), v_m_org, v_e2e_user_id, 'active');

  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_admin_role
  FROM organization_memberships m
  WHERE m.user_id = v_e2e_user_id AND m.organization_id IN (v_c_org, v_z_org);

  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_viewer_role
  FROM organization_memberships m
  WHERE m.user_id = v_e2e_user_id AND m.organization_id = v_y_org;

  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_operator_role
  FROM organization_memberships m
  WHERE m.user_id = v_e2e_user_id AND m.organization_id = v_o_org;

  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_manager_role
  FROM organization_memberships m
  WHERE m.user_id = v_e2e_user_id AND m.organization_id = v_m_org;

  -- Legacy user: admin in C_ORG + Z_ORG (consistent with previous setups)
  INSERT INTO organization_memberships (id, organization_id, user_id, status) VALUES
    (gen_random_uuid(), v_c_org, v_user_id, 'active'),
    (gen_random_uuid(), v_z_org, v_user_id, 'active');

  INSERT INTO membership_roles (membership_id, role_id)
  SELECT m.id, v_admin_role
  FROM organization_memberships m
  WHERE m.user_id = v_user_id AND m.organization_id IN (v_c_org, v_z_org);

  -- X_ORG: NO membership (foreign tenant)

  -- ============================================================
  -- 5. CATALOG FIXTURES
  -- ============================================================
  INSERT INTO catalog_categories (id, organization_id, code, name, is_active) VALUES
    (v_c_cat, v_c_org, 'PRC05B-CAT', 'PRC05B Category', true),
    (v_x_cat, v_x_org, 'PRC05B-XCAT', 'PRC05B X Category', true),
    (v_y_cat, v_y_org, 'PRC05B-YCAT', 'PRC05B Y Category', true),
    (v_m_cat, v_m_org, 'PRC05B-MCAT', 'PRC05B M Category', true);

  INSERT INTO catalog_items (id, organization_id, code, name, category_id, item_type, commercial_unit, execution_type, status, created_by, updated_by)
  VALUES
    (v_item_a, v_c_org, 'PRC05B-ITEM-A', 'PRC05B Item A', v_c_cat, 'other_service', 'unit', 'own', 'active', v_user_id, v_user_id),
    (v_item_b, v_c_org, 'PRC05B-ITEM-B', 'PRC05B Item B', v_c_cat, 'other_service', 'unit', 'own', 'active', v_user_id, v_user_id),
    (v_item_i, v_c_org, 'PRC05B-ITEM-I', 'PRC05B Item I', v_c_cat, 'other_service', 'unit', 'own', 'inactive', v_user_id, v_user_id),
    (v_x_item, v_x_org, 'PRC05B-XITEM', 'PRC05B X Item', v_x_cat, 'other_service', 'unit', 'own', 'active', v_user_id, v_user_id),
    (v_y_item, v_y_org, 'PRC05B-YITEM', 'PRC05B Y Item', v_y_cat, 'other_service', 'unit', 'own', 'active', v_user_id, v_user_id),
    (v_m_item, v_m_org, 'PRC05B-MITEM', 'PRC05B M Item', v_m_cat, 'other_service', 'unit', 'own', 'active', v_user_id, v_user_id);

  -- ============================================================
  -- 6. COMPANIES + SUPPLIER PROFILES
  -- ============================================================
  INSERT INTO companies (id, organization_id, legal_name, trade_name, status, created_by, updated_by) VALUES
    (v_company,   v_c_org, 'PRC05B Supplier One',   'Sup One',  'active', v_user_id, v_user_id),
    (v_company2,  v_c_org, 'PRC05B Supplier Two',   'Sup Two',  'active', v_user_id, v_user_id),
    (v_company_z, v_z_org, 'PRC05B Zorg Supplier',  'Z Sup',    'active', v_user_id, v_user_id);

  INSERT INTO supplier_profiles (company_id, organization_id, supplier_category, status, created_by, updated_by) VALUES
    (v_company,   v_c_org, 'laboratory', 'active', v_user_id, v_user_id),
    (v_company2,  v_c_org, 'laboratory', 'active', v_user_id, v_user_id)
  ON CONFLICT (company_id) DO UPDATE SET status = 'active';

  -- ============================================================
  -- 7. COST PROVENANCE FIXTURES (one version per table → no overlap)
  -- ============================================================
  INSERT INTO supplier_cost_tables (id, organization_id, supplier_company_id, code, name, status, created_by, updated_by)
  VALUES
    (v_cost_table,  v_c_org, v_company,  'PRC05B-COST1', 'PRC05B Cost Table 1', 'active', v_user_id, v_user_id),
    (v_cost_table2, v_c_org, v_company2, 'PRC05B-COST2', 'PRC05B Cost Table 2', 'active', v_user_id, v_user_id);

  INSERT INTO supplier_cost_table_versions (id, organization_id, cost_table_id, version_number, valid_from, valid_to, status, source_date, created_by, published_by, published_at)
  VALUES
    (v_cost_version,  v_c_org, v_cost_table,  1, '2025-01-01', NULL, 'active', '2024-12-01', v_user_id, v_user_id, now()),
    (v_cost_version2, v_c_org, v_cost_table2, 1, '2025-01-01', NULL, 'active', '2024-12-01', v_user_id, v_user_id, now());

  -- 7.1 SUPPLIER CATALOG MAPPINGS + COST ITEMS (PRC-05C — needed for engine RPC)
  -- Re-disable parent-draft + immutability triggers because supplier_* triggers
  -- were re-enabled after the bulk DELETE block above.
  ALTER TABLE supplier_catalog_items DISABLE TRIGGER USER;
  ALTER TABLE supplier_cost_items DISABLE TRIGGER USER;

  INSERT INTO supplier_catalog_items (id, organization_id, supplier_company_id, catalog_item_id, external_code, external_name, normalized_external_name, external_unit, is_preferred, status, created_by, updated_by)
  VALUES
    (v_sci_a,  v_c_org, v_company,  v_item_a, 'EXT-PRC05B-A', 'External Item A', 'external item a', 'unit', true,  'active', v_user_id, v_user_id),
    (v_sci_b,  v_c_org, v_company,  v_item_b, 'EXT-PRC05B-B', 'External Item B', 'external item b', 'unit', true,  'active', v_user_id, v_user_id),
    (v_sci_a2, v_c_org, v_company2, v_item_a, 'EXT-PRC05B-A2','External Item A2','external item a2','unit', false, 'active', v_user_id, v_user_id)
  ON CONFLICT (id) DO UPDATE SET external_name = EXCLUDED.external_name;

  INSERT INTO supplier_cost_items (id, organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount, currency_code)
  VALUES
    (v_ci_a,  v_c_org, v_cost_version,  v_sci_a,  v_item_a, 'provided',  80.0000, 'BRL'),
    (v_ci_b,  v_c_org, v_cost_version,  v_sci_b,  v_item_b, 'provided', 100.0000, 'BRL'),
    (v_ci_a2, v_c_org, v_cost_version2, v_sci_a2, v_item_a, 'provided',  90.0000, 'BRL')
  ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount;

  ALTER TABLE supplier_catalog_items ENABLE TRIGGER USER;
  ALTER TABLE supplier_cost_items ENABLE TRIGGER USER;

  -- ============================================================
  -- 8. PRICING POLICY PROVENANCE FIXTURES
  -- ============================================================
  -- v_policy: default scope (cOrg). v_policy2: catalog_item scope on cItemB (cOrg).
  -- v_policy_z: default scope (zOrg). At most one active default per org is respected.
  INSERT INTO pricing_policies (id, organization_id, code, name, scope_type, catalog_item_id, status, created_by, updated_by)
  VALUES
    (v_policy,   v_c_org, 'PRC05B-POL1', 'PRC05B Policy 1',   'default',      NULL,     'active', v_user_id, v_user_id),
    (v_policy2,  v_c_org, 'PRC05B-POL2', 'PRC05B Policy 2',   'catalog_item', v_item_b, 'active', v_user_id, v_user_id),
    (v_policy_z, v_z_org, 'PRC05B-POLZ', 'PRC05B Policy Z',   'default',      NULL,     'active', v_user_id, v_user_id);

  INSERT INTO pricing_policy_versions (id, organization_id, pricing_policy_id, version_number, valid_from, valid_to, status, pricing_method, target_margin_rate, created_by)
  VALUES
    (v_policy_version,   v_c_org, v_policy,   1, '2025-01-01', NULL, 'active', 'target_margin', 0.25, v_user_id),
    (v_policy_version2,  v_c_org, v_policy2,  1, '2025-01-01', NULL, 'active', 'target_margin', 0.25, v_user_id),
    (v_policy_version_z, v_z_org, v_policy_z, 1, '2025-01-01', NULL, 'active', 'target_margin', 0.25, v_user_id);

  -- ============================================================
  -- 9. COMMERCIAL FIXTURES (triggers still disabled)
  -- ============================================================

  -- 9.1 E2E-COM-PUB: active table + active version + manual price item (cOrg)
  INSERT INTO commercial_price_tables (id, organization_id, code, code_normalized, name, status, created_by, updated_by)
  VALUES (v_pub_table, v_c_org, 'E2E-COM-PUB', 'e2e-com-pub', 'E2E Published Commercial Table', 'active', v_user_id, v_user_id);

  INSERT INTO commercial_price_table_versions (id, organization_id, commercial_price_table_id, version_number, valid_from, valid_to, status, version_label, notes, created_by, published_by, published_at)
  VALUES (v_pub_version, v_c_org, v_pub_table, 1, '2025-01-01', NULL, 'active', 'v1', 'published fixture', v_user_id, v_user_id, now());

  INSERT INTO commercial_price_items (id, organization_id, commercial_price_table_version_id, catalog_item_id, price_amount, currency, item_code_snapshot, item_name_snapshot, item_type_snapshot, origin_type, created_by, updated_by)
  VALUES (v_pub_item, v_c_org, v_pub_version, v_item_a, 100.0000, 'BRL', 'PRC05B-ITEM-A', 'PRC05B Item A', 'other_service', 'manual', v_user_id, v_user_id);

  -- 9.2 E2E-COM-FK: draft version with a full engine-provenance item (for FK RESTRICT verification)
  INSERT INTO commercial_price_tables (id, organization_id, code, code_normalized, name, status, created_by, updated_by)
  VALUES (v_fk_table, v_c_org, 'E2E-COM-FK', 'e2e-com-fk', 'E2E FK Chain Table', 'active', v_user_id, v_user_id);

  INSERT INTO commercial_price_table_versions (id, organization_id, commercial_price_table_id, version_number, valid_from, valid_to, status, version_label, created_by)
  VALUES (v_fk_version, v_c_org, v_fk_table, 1, '2025-01-01', NULL, 'draft', 'fk-chain', v_user_id);

  INSERT INTO commercial_price_items (
    id, organization_id, commercial_price_table_version_id, catalog_item_id,
    price_amount, currency, item_code_snapshot, item_name_snapshot, item_type_snapshot,
    origin_type,
    source_reference_date, source_supplier_company_id, source_cost_table_id, source_cost_version_id,
    source_cost_version_number, source_pricing_policy_id, source_pricing_policy_version_id,
    source_policy_version_number, source_calculated_price, source_total_cost, source_margin_rate,
    source_markup_rate, source_effective_price, pricing_snapshot, created_by, updated_by
  )
  VALUES (
    v_fk_item, v_c_org, v_fk_version, v_item_b,
    120.0000, 'BRL', 'PRC05B-ITEM-B', 'PRC05B Item B', 'other_service',
    'pricing_engine',
    '2025-06-01', v_company, v_cost_table, v_cost_version,
    1, v_policy, v_policy_version,
    1, 120.0000, 80.0000, 0.200000,
    NULL, 120.0000,
    '{"engine":"PRC-04C","note":"fk-chain fixture"}', v_user_id, v_user_id
  );

  -- 9.3 Per-org read fixtures
  -- Y_ORG (viewer): table + draft version + item
  INSERT INTO commercial_price_tables (id, organization_id, code, code_normalized, name, status, created_by, updated_by)
  VALUES (v_y_table, v_y_org, 'E2E-COM-YYY', 'e2e-com-yyy', 'E2E Viewer Org Table', 'active', v_user_id, v_user_id);

  INSERT INTO commercial_price_table_versions (id, organization_id, commercial_price_table_id, version_number, valid_from, valid_to, status, version_label, created_by)
  VALUES (v_y_version, v_y_org, v_y_table, 1, '2025-01-01', NULL, 'draft', 'v1', v_user_id);

  INSERT INTO commercial_price_items (id, organization_id, commercial_price_table_version_id, catalog_item_id, price_amount, currency, item_code_snapshot, item_name_snapshot, item_type_snapshot, origin_type, created_by, updated_by)
  VALUES (v_y_price_item, v_y_org, v_y_version, v_y_item, 10.0000, 'BRL', 'PRC05B-YITEM', 'PRC05B Y Item', 'other_service', 'manual', v_user_id, v_user_id);

  -- O_ORG (operator): table only
  INSERT INTO commercial_price_tables (id, organization_id, code, code_normalized, name, status, created_by, updated_by)
  VALUES (v_o_table, v_o_org, 'E2E-COM-OOO', 'e2e-com-ooo', 'E2E Operator Org Table', 'active', v_user_id, v_user_id);

  -- Z_ORG (admin): table + version for cross-tenant reference tests
  INSERT INTO commercial_price_tables (id, organization_id, code, code_normalized, name, status, created_by, updated_by)
  VALUES (v_z_table, v_z_org, 'E2E-COM-ZZZ', 'e2e-com-zzz', 'E2E Zorg Table', 'active', v_user_id, v_user_id);

  INSERT INTO commercial_price_table_versions (id, organization_id, commercial_price_table_id, version_number, valid_from, valid_to, status, version_label, created_by)
  VALUES (v_z_version, v_z_org, v_z_table, 1, '2025-01-01', NULL, 'draft', 'v1', v_user_id);

  ALTER TABLE commercial_price_tables ENABLE TRIGGER USER;
  ALTER TABLE commercial_price_table_versions ENABLE TRIGGER USER;
  ALTER TABLE commercial_price_items ENABLE TRIGGER USER;
  ALTER TABLE commercial_price_exceptions ENABLE TRIGGER USER;

  -- ============================================================
  -- 10. DB-LEVEL VERIFICATIONS (cannot be exercised from REST harness)
  -- ============================================================

  -- 10.1 Normalizer semantics (DEC-017: lowercase, accent fold, whitespace collapse)
  IF public.fn_normalize_commercial_code('  Café   PÃO  ') <> 'cafe pao' THEN
    RAISE EXCEPTION 'DB-VERIFY normalizer failed: got %', public.fn_normalize_commercial_code('  Café   PÃO  ');
  END IF;
  IF public.fn_normalize_commercial_code('BRL-TABELA 1') <> 'brl-tabela 1' THEN
    RAISE EXCEPTION 'DB-VERIFY normalizer (code) failed';
  END IF;

  -- 10.2 Role → permission mappings (pricing.commercial.*)
  SELECT count(*) INTO v_count
  FROM role_permissions rp
  JOIN roles r ON r.id = rp.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE r.code = 'admin' AND p.code LIKE 'pricing.commercial.%';
  IF v_count <> 7 THEN RAISE EXCEPTION 'DB-VERIFY admin commercial perms = % (expected 7)', v_count; END IF;

  SELECT count(*) INTO v_count
  FROM role_permissions rp
  JOIN roles r ON r.id = rp.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE r.code = 'manager' AND p.code LIKE 'pricing.commercial.%';
  IF v_count <> 5 THEN RAISE EXCEPTION 'DB-VERIFY manager commercial perms = % (expected 5)', v_count; END IF;

  IF EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE r.code = 'manager' AND p.code IN ('pricing.commercial.publish','pricing.commercial.exception_approve')
  ) THEN
    RAISE EXCEPTION 'DB-VERIFY manager must NOT hold publish/exception_approve';
  END IF;

  SELECT count(*) INTO v_count
  FROM role_permissions rp
  JOIN roles r ON r.id = rp.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE r.code = 'operator' AND p.code LIKE 'pricing.commercial.%';
  IF v_count <> 1 THEN RAISE EXCEPTION 'DB-VERIFY operator commercial perms = % (expected 1)', v_count; END IF;

  SELECT count(*) INTO v_count
  FROM role_permissions rp
  JOIN roles r ON r.id = rp.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE r.code = 'viewer' AND p.code LIKE 'pricing.commercial.%';
  IF v_count <> 1 THEN RAISE EXCEPTION 'DB-VERIFY viewer commercial perms = % (expected 1)', v_count; END IF;

  -- 10.3 Orphan permission 'pricing.price.publish' must exist with NO role mappings
  IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'pricing.price.publish') THEN
    RAISE EXCEPTION 'DB-VERIFY pricing.price.publish placeholder missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE p.code = 'pricing.price.publish'
  ) THEN
    RAISE EXCEPTION 'DB-VERIFY pricing.price.publish must have no role mappings';
  END IF;

  -- 10.4 FK RESTRICT on the provenance chain (engine item references company/cost/policy)
  BEGIN
    DELETE FROM companies WHERE id = v_company;
    RAISE EXCEPTION 'DB-VERIFY FK RESTRICT NOT enforced on companies';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- expected (RESTRICT)
  END;

  BEGIN
    DELETE FROM supplier_cost_table_versions WHERE id = v_cost_version;
    RAISE EXCEPTION 'DB-VERIFY FK RESTRICT NOT enforced on supplier_cost_table_versions';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- expected (RESTRICT)
  END;

  BEGIN
    DELETE FROM pricing_policy_versions WHERE id = v_policy_version;
    RAISE EXCEPTION 'DB-VERIFY FK RESTRICT NOT enforced on pricing_policy_versions';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- expected (RESTRICT)
  END;

  -- 10.5 Version completeness gate + gate-protected transitions (impersonation)
  -- auth.uid() on the remote reads request.jwt.claim.sub first — impersonate the
  -- E2E user (admin in C_ORG → has pricing.commercial.review) and open the gate.
  PERFORM set_config('request.jwt.claim.sub', v_e2e_user_id::text, true);
  PERFORM set_config('app.commercial_price_rpc_active', 'true', true);

  INSERT INTO commercial_price_tables (id, organization_id, code, name, status)
  VALUES (v_h19_table, v_c_org, 'E2E-COM-COMP', 'E2E Completeness Table', 'active');

  INSERT INTO commercial_price_table_versions (id, organization_id, commercial_price_table_id, version_number, valid_from, valid_to, status, version_label)
  VALUES (v_h19_version, v_c_org, v_h19_table, 1, '2025-01-01', NULL, 'draft', 'h19');

  -- Leave draft with NO items → must be rejected by the completeness guard
  BEGIN
    UPDATE commercial_price_table_versions SET status = 'under_review' WHERE id = v_h19_version;
    RAISE EXCEPTION 'DB-VERIFY completeness guard NOT enforced (empty version left draft)';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%at least one item%' THEN
      RAISE;
    END IF;
  END;

  -- Add an item (actor + snapshot triggers derive fields from impersonated uid/catalog)
  INSERT INTO commercial_price_items (id, organization_id, commercial_price_table_version_id, catalog_item_id, price_amount, currency, origin_type)
  VALUES (gen_random_uuid(), v_c_org, v_h19_version, v_item_a, 50.0000, 'BRL', 'manual');

  -- Leave draft WITH an item + gate + review permission → must succeed
  UPDATE commercial_price_table_versions SET status = 'under_review' WHERE id = v_h19_version;

  IF (SELECT status FROM commercial_price_table_versions WHERE id = v_h19_version) <> 'under_review' THEN
    RAISE EXCEPTION 'DB-VERIFY gate transition draft→under_review did not apply';
  END IF;

  -- Close the gate for the remainder of the transaction
  PERFORM set_config('app.commercial_price_rpc_active', 'false', true);

  RAISE NOTICE 'PRC05B SETUP DONE: c_org=% x_org=% y_org=% z_org=% o_org=% m_org=% pub_table=%',
    v_c_org, v_x_org, v_y_org, v_z_org, v_o_org, v_m_org, v_pub_table;
END $$;

COMMIT;