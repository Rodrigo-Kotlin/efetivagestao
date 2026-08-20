-- PRC-06B: dedicated remote fixtures for CLP-H01..CLP-H60.
-- Deterministic 66666666 UUIDs. Idempotent and transactionally resettable.
--
-- TEST ONLY. Run as the database owner before client-pricing-integrity-test.mjs.
-- USER triggers are disabled only during cleanup of these dedicated fixtures.
-- Seeding and structural proof rows use the real integrity/audit triggers.

BEGIN;

DO $$
DECLARE
  -- Primary E2E account used by the canonical remote-test credentials.
  v_user uuid := '1933891b-e0b9-42fc-afaa-641966824742';

  v_main_org    uuid := '66666666-6666-6666-6666-666666666661';
  v_cross_org   uuid := '66666666-6666-6666-6666-666666666662';
  v_manager_org uuid := '66666666-6666-6666-6666-666666666663';
  v_operator_org uuid := '66666666-6666-6666-6666-666666666664';
  v_viewer_org  uuid := '66666666-6666-6666-6666-666666666665';
  v_foreign_org uuid := '66666666-6666-6666-6666-666666666666';

  v_main_category uuid := '66666666-0000-0000-0000-000000000001';
  v_cross_category uuid := '66666666-0000-0000-0000-000000000002';
  v_manager_category uuid := '66666666-0000-0000-0000-000000000003';
  v_operator_category uuid := '66666666-0000-0000-0000-000000000004';
  v_viewer_category uuid := '66666666-0000-0000-0000-000000000005';
  v_foreign_category uuid := '66666666-0000-0000-0000-000000000006';

  v_item_a uuid := '66666666-1000-0000-0000-000000000001';
  v_item_b uuid := '66666666-1000-0000-0000-000000000002';
  v_item_inactive uuid := '66666666-1000-0000-0000-000000000003';
  v_cross_item uuid := '66666666-1000-0000-0000-000000000004';
  v_manager_item uuid := '66666666-1000-0000-0000-000000000005';
  v_operator_item uuid := '66666666-1000-0000-0000-000000000006';
  v_viewer_item uuid := '66666666-1000-0000-0000-000000000007';
  v_foreign_item uuid := '66666666-1000-0000-0000-000000000008';

  v_client uuid := '66666666-2000-0000-0000-000000000001';
  v_dual_role_client uuid := '66666666-2000-0000-0000-000000000002';
  v_inactive_company uuid := '66666666-2000-0000-0000-000000000003';
  v_blocked_client uuid := '66666666-2000-0000-0000-000000000004';
  v_cross_client uuid := '66666666-2000-0000-0000-000000000005';
  v_manager_client uuid := '66666666-2000-0000-0000-000000000006';
  v_operator_client uuid := '66666666-2000-0000-0000-000000000007';
  v_viewer_client uuid := '66666666-2000-0000-0000-000000000008';
  v_foreign_client uuid := '66666666-2000-0000-0000-000000000009';
  v_profile_candidate uuid := '66666666-2000-0000-0000-00000000000a';
  v_inactive_candidate uuid := '66666666-2000-0000-0000-00000000000b';
  v_manager_candidate uuid := '66666666-2000-0000-0000-00000000000c';

  v_main_table uuid := '66666666-3000-0000-0000-000000000001';
  v_main_version uuid := '66666666-3000-0000-0000-000000000002';
  v_main_price_item uuid := '66666666-3000-0000-0000-000000000003';
  v_cross_table uuid := '66666666-3000-0000-0000-000000000004';
  v_manager_table uuid := '66666666-3000-0000-0000-000000000005';
  v_operator_table uuid := '66666666-3000-0000-0000-000000000006';
  v_viewer_table uuid := '66666666-3000-0000-0000-000000000007';
  v_foreign_table uuid := '66666666-3000-0000-0000-000000000008';
  v_inactive_table uuid := '66666666-3000-0000-0000-000000000009';

  v_active_assignment uuid := '66666666-4000-0000-0000-000000000001';
  v_gate_assignment uuid := '66666666-4000-0000-0000-000000000002';
  v_operator_assignment uuid := '66666666-4000-0000-0000-000000000003';
  v_viewer_assignment uuid := '66666666-4000-0000-0000-000000000004';
  v_foreign_assignment uuid := '66666666-4000-0000-0000-000000000005';
  v_cross_assignment uuid := '66666666-4000-0000-0000-000000000006';
  v_scheduled_assignment uuid := '66666666-4000-0000-0000-000000000007';
  v_overlap_assignment uuid := '66666666-4000-0000-0000-000000000008';
  v_inactive_history_assignment uuid := '66666666-4000-0000-0000-000000000009';
  v_temp_assignment uuid := '66666666-4000-0000-0000-00000000000a';

  v_provenance_override uuid := '66666666-5000-0000-0000-000000000001';
  v_operator_override uuid := '66666666-5000-0000-0000-000000000002';
  v_viewer_override uuid := '66666666-5000-0000-0000-000000000003';
  v_foreign_override uuid := '66666666-5000-0000-0000-000000000004';
  v_cross_override uuid := '66666666-5000-0000-0000-000000000005';
  v_scheduled_override uuid := '66666666-5000-0000-0000-000000000006';
  v_overlap_override uuid := '66666666-5000-0000-0000-000000000007';
  v_inactive_history_override uuid := '66666666-5000-0000-0000-000000000008';

  v_admin_role uuid;
  v_manager_role uuid;
  v_operator_role uuid;
  v_viewer_role uuid;
  v_blocked boolean;
BEGIN
  -- Cleanup in FK-safe order. Trigger suppression is limited to this block.
  ALTER TABLE audit_logs DISABLE TRIGGER USER;
  ALTER TABLE client_price_overrides DISABLE TRIGGER USER;
  ALTER TABLE client_commercial_table_assignments DISABLE TRIGGER USER;
  ALTER TABLE client_profiles DISABLE TRIGGER USER;
  ALTER TABLE commercial_price_items DISABLE TRIGGER USER;
  ALTER TABLE commercial_price_table_versions DISABLE TRIGGER USER;
  ALTER TABLE commercial_price_tables DISABLE TRIGGER USER;
  ALTER TABLE supplier_profiles DISABLE TRIGGER USER;

  DELETE FROM audit_logs WHERE organization_id IN (
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org
  );
  DELETE FROM client_price_overrides WHERE organization_id IN (
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org
  );
  DELETE FROM client_commercial_table_assignments WHERE organization_id IN (
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org
  );
  DELETE FROM client_profiles WHERE organization_id IN (
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org
  );
  DELETE FROM commercial_price_items WHERE organization_id IN (
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org
  );
  DELETE FROM commercial_price_table_versions WHERE organization_id IN (
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org
  );
  DELETE FROM commercial_price_tables WHERE organization_id IN (
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org
  );
  DELETE FROM supplier_profiles WHERE organization_id IN (
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org
  );
  DELETE FROM companies WHERE organization_id IN (
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org
  );
  DELETE FROM catalog_items WHERE organization_id IN (
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org
  );
  DELETE FROM catalog_categories WHERE organization_id IN (
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org
  );
  DELETE FROM organization_memberships WHERE organization_id IN (
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org
  );

  ALTER TABLE supplier_profiles ENABLE TRIGGER USER;
  ALTER TABLE commercial_price_tables ENABLE TRIGGER USER;
  ALTER TABLE commercial_price_table_versions ENABLE TRIGGER USER;
  ALTER TABLE commercial_price_items ENABLE TRIGGER USER;
  ALTER TABLE client_profiles ENABLE TRIGGER USER;
  ALTER TABLE client_commercial_table_assignments ENABLE TRIGGER USER;
  ALTER TABLE client_price_overrides ENABLE TRIGGER USER;
  ALTER TABLE audit_logs ENABLE TRIGGER USER;

  INSERT INTO organizations (id, name, slug, status) VALUES
    (v_main_org, 'PRC06B Client Pricing Main', 'prc06b-client-main', 'active'),
    (v_cross_org, 'PRC06B Client Pricing Cross', 'prc06b-client-cross', 'active'),
    (v_manager_org, 'PRC06B Client Pricing Manager', 'prc06b-client-manager', 'active'),
    (v_operator_org, 'PRC06B Client Pricing Operator', 'prc06b-client-operator', 'active'),
    (v_viewer_org, 'PRC06B Client Pricing Viewer', 'prc06b-client-viewer', 'active'),
    (v_foreign_org, 'PRC06B Client Pricing Foreign', 'prc06b-client-foreign', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active';

  SELECT id INTO v_admin_role FROM roles WHERE code = 'admin';
  SELECT id INTO v_manager_role FROM roles WHERE code = 'manager';
  SELECT id INTO v_operator_role FROM roles WHERE code = 'operator';
  SELECT id INTO v_viewer_role FROM roles WHERE code = 'viewer';
  IF v_admin_role IS NULL OR v_manager_role IS NULL OR v_operator_role IS NULL OR v_viewer_role IS NULL THEN
    RAISE EXCEPTION 'PRC06B setup requires admin, manager, operator and viewer roles';
  END IF;

  -- Admin main/cross, manager, operator and viewer. Foreign intentionally has no membership.
  INSERT INTO organization_memberships (id, organization_id, user_id, status) VALUES
    ('66666666-6000-0000-0000-000000000001', v_main_org, v_user, 'active'),
    ('66666666-6000-0000-0000-000000000002', v_cross_org, v_user, 'active'),
    ('66666666-6000-0000-0000-000000000003', v_manager_org, v_user, 'active'),
    ('66666666-6000-0000-0000-000000000004', v_operator_org, v_user, 'active'),
    ('66666666-6000-0000-0000-000000000005', v_viewer_org, v_user, 'active');
  INSERT INTO membership_roles (membership_id, role_id) VALUES
    ('66666666-6000-0000-0000-000000000001', v_admin_role),
    ('66666666-6000-0000-0000-000000000002', v_admin_role),
    ('66666666-6000-0000-0000-000000000003', v_manager_role),
    ('66666666-6000-0000-0000-000000000004', v_operator_role),
    ('66666666-6000-0000-0000-000000000005', v_viewer_role);

  -- All following fixture writes use the real actor/integrity/audit triggers.
  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);

  INSERT INTO catalog_categories (id, organization_id, code, name, is_active) VALUES
    (v_main_category, v_main_org, 'PRC06B-MAIN', 'PRC06B Main', true),
    (v_cross_category, v_cross_org, 'PRC06B-CROSS', 'PRC06B Cross', true),
    (v_manager_category, v_manager_org, 'PRC06B-MANAGER', 'PRC06B Manager', true),
    (v_operator_category, v_operator_org, 'PRC06B-OPERATOR', 'PRC06B Operator', true),
    (v_viewer_category, v_viewer_org, 'PRC06B-VIEWER', 'PRC06B Viewer', true),
    (v_foreign_category, v_foreign_org, 'PRC06B-FOREIGN', 'PRC06B Foreign', true);

  INSERT INTO catalog_items (
    id, organization_id, code, name, category_id, item_type,
    commercial_unit, execution_type, status, created_by, updated_by
  ) VALUES
    (v_item_a, v_main_org, 'PRC06B-ITEM-A', 'PRC06B Item A', v_main_category, 'other_service', 'unit', 'own', 'active', v_user, v_user),
    (v_item_b, v_main_org, 'PRC06B-ITEM-B', 'PRC06B Item B', v_main_category, 'other_service', 'unit', 'own', 'active', v_user, v_user),
    (v_item_inactive, v_main_org, 'PRC06B-ITEM-I', 'PRC06B Inactive Item', v_main_category, 'other_service', 'unit', 'own', 'inactive', v_user, v_user),
    (v_cross_item, v_cross_org, 'PRC06B-XITEM', 'PRC06B Cross Item', v_cross_category, 'other_service', 'unit', 'own', 'active', v_user, v_user),
    (v_manager_item, v_manager_org, 'PRC06B-MITEM', 'PRC06B Manager Item', v_manager_category, 'other_service', 'unit', 'own', 'active', v_user, v_user),
    (v_operator_item, v_operator_org, 'PRC06B-OITEM', 'PRC06B Operator Item', v_operator_category, 'other_service', 'unit', 'own', 'active', v_user, v_user),
    (v_viewer_item, v_viewer_org, 'PRC06B-VITEM', 'PRC06B Viewer Item', v_viewer_category, 'other_service', 'unit', 'own', 'active', v_user, v_user),
    (v_foreign_item, v_foreign_org, 'PRC06B-FITEM', 'PRC06B Foreign Item', v_foreign_category, 'other_service', 'unit', 'own', 'active', v_user, v_user);

  INSERT INTO companies (id, organization_id, legal_name, trade_name, status, created_by, updated_by) VALUES
    (v_client, v_main_org, 'PRC06B Main Client', 'Main Client', 'active', v_user, v_user),
    (v_dual_role_client, v_main_org, 'PRC06B Dual Role Company', 'Dual Role', 'active', v_user, v_user),
    (v_inactive_company, v_main_org, 'PRC06B Inactive History Company', 'Inactive History', 'active', v_user, v_user),
    (v_blocked_client, v_main_org, 'PRC06B Blocked Client', 'Blocked', 'active', v_user, v_user),
    (v_cross_client, v_cross_org, 'PRC06B Cross Client', 'Cross Client', 'active', v_user, v_user),
    (v_manager_client, v_manager_org, 'PRC06B Manager Client', 'Manager Client', 'active', v_user, v_user),
    (v_operator_client, v_operator_org, 'PRC06B Operator Client', 'Operator Client', 'active', v_user, v_user),
    (v_viewer_client, v_viewer_org, 'PRC06B Viewer Client', 'Viewer Client', 'active', v_user, v_user),
    (v_foreign_client, v_foreign_org, 'PRC06B Foreign Client', 'Foreign Client', 'active', v_user, v_user),
    (v_profile_candidate, v_main_org, 'PRC06B Profile Candidate', 'Profile Candidate', 'active', v_user, v_user),
    (v_inactive_candidate, v_main_org, 'PRC06B Inactive Candidate', 'Inactive Candidate', 'inactive', v_user, v_user),
    (v_manager_candidate, v_manager_org, 'PRC06B Manager Candidate', 'Manager Candidate', 'active', v_user, v_user);

  -- One company intentionally carries supplier and client roles simultaneously.
  INSERT INTO supplier_profiles (
    company_id, organization_id, supplier_category, status, created_by, updated_by
  ) VALUES (v_dual_role_client, v_main_org, 'other', 'active', v_user, v_user);

  INSERT INTO client_profiles (company_id, organization_id, commercial_notes) VALUES
    (v_client, v_main_org, 'main client'),
    (v_dual_role_client, v_main_org, 'supplier and client'),
    (v_inactive_company, v_main_org, 'historical active profile on inactive company'),
    (v_blocked_client, v_main_org, 'eligibility fixture'),
    (v_cross_client, v_cross_org, 'cross admin fixture'),
    (v_manager_client, v_manager_org, 'manager fixture'),
    (v_operator_client, v_operator_org, 'operator fixture'),
    (v_viewer_client, v_viewer_org, 'viewer fixture'),
    (v_foreign_client, v_foreign_org, 'foreign fixture');

  -- Stable commercial identities in each security topology organization.
  INSERT INTO commercial_price_tables (id, organization_id, code, name, status) VALUES
    (v_main_table, v_main_org, 'PRC06B-MAIN-TABLE', 'PRC06B Main Table', 'active'),
    (v_cross_table, v_cross_org, 'PRC06B-CROSS-TABLE', 'PRC06B Cross Table', 'active'),
    (v_manager_table, v_manager_org, 'PRC06B-MANAGER-TABLE', 'PRC06B Manager Table', 'active'),
    (v_operator_table, v_operator_org, 'PRC06B-OPERATOR-TABLE', 'PRC06B Operator Table', 'active'),
    (v_viewer_table, v_viewer_org, 'PRC06B-VIEWER-TABLE', 'PRC06B Viewer Table', 'active'),
    (v_foreign_table, v_foreign_org, 'PRC06B-FOREIGN-TABLE', 'PRC06B Foreign Table', 'active'),
    (v_inactive_table, v_main_org, 'PRC06B-INACTIVE-TABLE', 'PRC06B Inactive Table', 'inactive');

  -- Main table has a real published version/item used by trusted provenance.
  INSERT INTO commercial_price_table_versions (
    id, organization_id, commercial_price_table_id, version_number,
    valid_from, valid_to, status, version_label
  ) VALUES (
    v_main_version, v_main_org, v_main_table, 1,
    DATE '2025-01-01', NULL, 'draft', 'PRC06B-v1'
  );
  INSERT INTO commercial_price_items (
    id, organization_id, commercial_price_table_version_id, catalog_item_id,
    price_amount, currency, origin_type
  ) VALUES (
    v_main_price_item, v_main_org, v_main_version, v_item_a,
    100.0000, 'BRL', 'manual'
  );
  PERFORM set_config('app.commercial_price_rpc_active', 'true', true);
  UPDATE commercial_price_table_versions SET status = 'under_review' WHERE id = v_main_version;
  UPDATE commercial_price_table_versions SET status = 'approved' WHERE id = v_main_version;
  UPDATE commercial_price_table_versions SET status = 'active' WHERE id = v_main_version;
  PERFORM set_config('app.commercial_price_rpc_active', 'false', true);

  -- Publish client-pricing history before inactivating the company. The rows
  -- must remain readable and immutable after the parent becomes inactive.
  INSERT INTO client_commercial_table_assignments (
    id, organization_id, client_company_id, commercial_price_table_id,
    status, valid_from, valid_to, notes
  ) VALUES (
    v_inactive_history_assignment, v_main_org, v_inactive_company, v_main_table,
    'draft', current_date, current_date + 30, 'history survives company inactivation'
  );
  INSERT INTO client_price_overrides (
    id, organization_id, client_company_id, catalog_item_id,
    price_amount, currency, reason, status, valid_from, valid_to,
    item_code_snapshot, item_name_snapshot, item_type_snapshot
  ) VALUES (
    v_inactive_history_override, v_main_org, v_inactive_company, v_item_b,
    77.0000, 'BRL', 'history survives company inactivation', 'draft',
    current_date, current_date + 30, 'x', 'x', 'x'
  );
  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE client_commercial_table_assignments SET status = 'under_review' WHERE id = v_inactive_history_assignment;
  UPDATE client_commercial_table_assignments SET status = 'approved' WHERE id = v_inactive_history_assignment;
  UPDATE client_commercial_table_assignments SET status = 'active' WHERE id = v_inactive_history_assignment;
  UPDATE client_price_overrides SET status = 'under_review' WHERE id = v_inactive_history_override;
  UPDATE client_price_overrides SET status = 'approved' WHERE id = v_inactive_history_override;
  UPDATE client_price_overrides SET status = 'active' WHERE id = v_inactive_history_override;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
  UPDATE companies SET status = 'inactive' WHERE id = v_inactive_company;

  -- Profile eligibility fixture: status changes are accepted only under the dedicated gate.
  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE client_profiles
  SET status = 'blocked', status_reason = 'PRC06B eligibility proof'
  WHERE company_id = v_blocked_client;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);

  -- Active assignment proof row, created and advanced through every real trigger.
  INSERT INTO client_commercial_table_assignments (
    id, organization_id, client_company_id, commercial_price_table_id,
    status, valid_from, valid_to, contract_reference, notes
  ) VALUES (
    v_active_assignment, v_main_org, v_client, v_main_table,
    'draft', current_date, current_date + 30, 'PRC06B-ACTIVE', 'gate-created active proof'
  );
  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE client_commercial_table_assignments SET status = 'under_review' WHERE id = v_active_assignment;
  UPDATE client_commercial_table_assignments SET status = 'approved' WHERE id = v_active_assignment;
  UPDATE client_commercial_table_assignments SET status = 'active' WHERE id = v_active_assignment;

  -- An adjacent future range is valid and becomes scheduled.
  INSERT INTO client_commercial_table_assignments (
    id, organization_id, client_company_id, commercial_price_table_id,
    status, valid_from, notes
  ) VALUES (
    v_scheduled_assignment, v_main_org, v_client, v_main_table,
    'draft', current_date + 30, 'adjacent scheduled assignment proof'
  );
  UPDATE client_commercial_table_assignments SET status = 'under_review' WHERE id = v_scheduled_assignment;
  UPDATE client_commercial_table_assignments SET status = 'approved' WHERE id = v_scheduled_assignment;
  UPDATE client_commercial_table_assignments SET status = 'scheduled' WHERE id = v_scheduled_assignment;

  -- An overlapping published range must fail the deferred GiST exclusion.
  BEGIN
    INSERT INTO client_commercial_table_assignments (
      id, organization_id, client_company_id, commercial_price_table_id,
      status, valid_from, notes
    ) VALUES (
      v_overlap_assignment, v_main_org, v_client, v_main_table,
      'draft', current_date + 15, 'transient overlap attempt'
    );
    UPDATE client_commercial_table_assignments SET status = 'under_review' WHERE id = v_overlap_assignment;
    UPDATE client_commercial_table_assignments SET status = 'approved' WHERE id = v_overlap_assignment;
    UPDATE client_commercial_table_assignments SET status = 'scheduled' WHERE id = v_overlap_assignment;
    SET CONSTRAINTS ex_client_assignment_active_scheduled_no_overlap IMMEDIATE;
    RAISE EXCEPTION 'PRC06B assignment overlap was not rejected';
  EXCEPTION WHEN exclusion_violation THEN
    NULL;
  END;
  SET CONSTRAINTS ex_client_assignment_active_scheduled_no_overlap DEFERRED;

  -- Trusted, all-or-none provenance can be created only while the gate is true.
  INSERT INTO client_price_overrides (
    id, organization_id, client_company_id, catalog_item_id,
    price_amount, currency, reason, status, valid_from, valid_to,
    item_code_snapshot, item_name_snapshot, item_type_snapshot,
    source_reference_date, source_commercial_price_table_id,
    source_commercial_price_table_version_id, source_commercial_price_item_id,
    source_table_price_amount
  ) VALUES (
    v_provenance_override, v_main_org, v_client, v_item_a,
    92.0000, 'BRL', 'PRC06B trusted baseline proof', 'draft', current_date, current_date + 30,
    'UNTRUSTED', 'UNTRUSTED', 'UNTRUSTED',
    current_date, v_main_table, v_main_version, v_main_price_item, 100.0000
  );
  UPDATE client_price_overrides SET status = 'under_review' WHERE id = v_provenance_override;
  UPDATE client_price_overrides SET status = 'approved' WHERE id = v_provenance_override;
  UPDATE client_price_overrides SET status = 'active' WHERE id = v_provenance_override;

  INSERT INTO client_price_overrides (
    id, organization_id, client_company_id, catalog_item_id,
    price_amount, currency, reason, status, valid_from,
    item_code_snapshot, item_name_snapshot, item_type_snapshot
  ) VALUES (
    v_scheduled_override, v_main_org, v_client, v_item_a,
    90.0000, 'BRL', 'adjacent scheduled override proof', 'draft', current_date + 30,
    'UNTRUSTED', 'UNTRUSTED', 'UNTRUSTED'
  );
  UPDATE client_price_overrides SET status = 'under_review' WHERE id = v_scheduled_override;
  UPDATE client_price_overrides SET status = 'approved' WHERE id = v_scheduled_override;
  UPDATE client_price_overrides SET status = 'scheduled' WHERE id = v_scheduled_override;

  BEGIN
    INSERT INTO client_price_overrides (
      id, organization_id, client_company_id, catalog_item_id,
      price_amount, currency, reason, status, valid_from,
      item_code_snapshot, item_name_snapshot, item_type_snapshot
    ) VALUES (
      v_overlap_override, v_main_org, v_client, v_item_a,
      91.0000, 'BRL', 'transient overlap attempt', 'draft', current_date + 15,
      'UNTRUSTED', 'UNTRUSTED', 'UNTRUSTED'
    );
    UPDATE client_price_overrides SET status = 'under_review' WHERE id = v_overlap_override;
    UPDATE client_price_overrides SET status = 'approved' WHERE id = v_overlap_override;
    UPDATE client_price_overrides SET status = 'scheduled' WHERE id = v_overlap_override;
    SET CONSTRAINTS ex_client_override_active_scheduled_no_overlap IMMEDIATE;
    RAISE EXCEPTION 'PRC06B override overlap was not rejected';
  EXCEPTION WHEN exclusion_violation THEN
    NULL;
  END;
  SET CONSTRAINTS ex_client_override_active_scheduled_no_overlap DEFERRED;

  -- Gate=true still enforces transition, temporal and provenance structure.
  INSERT INTO client_commercial_table_assignments (
    id, organization_id, client_company_id, commercial_price_table_id,
    status, valid_from, notes
  ) VALUES (
    v_temp_assignment, v_main_org, v_dual_role_client, v_main_table,
    'draft', current_date + 60, 'negative gate proof'
  );

  v_blocked := false;
  BEGIN
    UPDATE client_commercial_table_assignments
    SET status = 'approved'
    WHERE id = v_temp_assignment;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'PRC06B invalid draft-to-approved transition was not blocked';
  END IF;

  v_blocked := false;
  BEGIN
    UPDATE client_commercial_table_assignments
    SET valid_to = current_date + 31
    WHERE id = v_active_assignment;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'PRC06B active assignment valid_to extension was not blocked';
  END IF;

  v_blocked := false;
  BEGIN
    UPDATE client_price_overrides
    SET valid_to = NULL
    WHERE id = v_provenance_override;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'PRC06B active override valid_to reopening was not blocked';
  END IF;

  v_blocked := false;
  BEGIN
    INSERT INTO client_price_overrides (
      organization_id, client_company_id, catalog_item_id,
      price_amount, currency, reason, status, valid_from,
      item_code_snapshot, item_name_snapshot, item_type_snapshot,
      source_reference_date
    ) VALUES (
      v_main_org, v_client, v_item_a, 91, 'BRL', 'partial provenance proof',
      'draft', current_date, 'x', 'x', 'x', current_date
    );
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'PRC06B partial provenance was not blocked with gate=true';
  END IF;

  v_blocked := false;
  BEGIN
    INSERT INTO client_price_overrides (
      organization_id, client_company_id, catalog_item_id,
      price_amount, currency, reason, status, valid_from,
      item_code_snapshot, item_name_snapshot, item_type_snapshot,
      source_reference_date, source_commercial_price_table_id,
      source_commercial_price_table_version_id, source_commercial_price_item_id,
      source_table_price_amount
    ) VALUES (
      v_main_org, v_client, v_item_a, 91, 'BRL', 'wrong source amount proof',
      'draft', current_date, 'x', 'x', 'x', current_date,
      v_main_table, v_main_version, v_main_price_item, 99
    );
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'PRC06B fake source price was not blocked with gate=true';
  END IF;

  v_blocked := false;
  BEGIN
    INSERT INTO client_price_overrides (
      organization_id, client_company_id, catalog_item_id,
      price_amount, currency, reason, status, valid_from,
      item_code_snapshot, item_name_snapshot, item_type_snapshot,
      source_reference_date, source_commercial_price_table_id,
      source_commercial_price_table_version_id, source_commercial_price_item_id,
      source_table_price_amount
    ) VALUES (
      v_main_org, v_client, v_item_b, 91, 'BRL', 'catalog mismatch proof',
      'draft', current_date, 'x', 'x', 'x', current_date,
      v_main_table, v_main_version, v_main_price_item, 100
    );
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'PRC06B source catalog mismatch was not blocked with gate=true';
  END IF;

  v_blocked := false;
  BEGIN
    INSERT INTO client_price_overrides (
      organization_id, client_company_id, catalog_item_id,
      price_amount, currency, reason, status, valid_from,
      item_code_snapshot, item_name_snapshot, item_type_snapshot,
      source_reference_date, source_commercial_price_table_id,
      source_commercial_price_table_version_id, source_commercial_price_item_id,
      source_table_price_amount
    ) VALUES (
      v_main_org, v_dual_role_client, v_item_a, 91, 'BRL', 'assignment mismatch proof',
      'draft', current_date, 'x', 'x', 'x', current_date,
      v_main_table, v_main_version, v_main_price_item, 100
    );
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'PRC06B source assignment mismatch was not blocked with gate=true';
  END IF;

  -- Eligibility is rechecked when a valid draft advances.
  INSERT INTO client_profiles (company_id, organization_id, commercial_notes)
  VALUES (v_profile_candidate, v_main_org, 'temporary eligibility proof');
  INSERT INTO client_commercial_table_assignments (
    organization_id, client_company_id, commercial_price_table_id,
    status, valid_from, notes
  ) VALUES (
    v_main_org, v_profile_candidate, v_main_table,
    'draft', current_date + 90, 'eligibility recheck proof'
  );
  UPDATE client_profiles
  SET status = 'blocked', status_reason = 'eligibility changed before submit'
  WHERE company_id = v_profile_candidate;
  v_blocked := false;
  BEGIN
    UPDATE client_commercial_table_assignments
    SET status = 'under_review'
    WHERE client_company_id = v_profile_candidate;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'PRC06B ineligible client advanced through submit gate';
  END IF;
  DELETE FROM client_commercial_table_assignments
  WHERE client_company_id = v_profile_candidate AND status = 'draft';
  DELETE FROM client_profiles WHERE company_id = v_profile_candidate;

  DELETE FROM client_commercial_table_assignments WHERE id = v_temp_assignment;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);

  -- Gate proof: blank and false must remain closed; true permits the valid transition.
  INSERT INTO client_commercial_table_assignments (
    id, organization_id, client_company_id, commercial_price_table_id,
    status, valid_from, notes
  ) VALUES (
    v_gate_assignment, v_main_org, v_dual_role_client, v_main_table,
    'draft', current_date + 30, 'NULL-safe gate proof'
  );

  PERFORM set_config('app.client_pricing_rpc_active', '', true);
  BEGIN
    UPDATE client_commercial_table_assignments SET status = 'under_review' WHERE id = v_gate_assignment;
    RAISE EXCEPTION 'PRC06B gate verification failed: blank gate allowed transition';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%controlled client-pricing RPC%' THEN RAISE; END IF;
  END;
  IF (SELECT status FROM client_commercial_table_assignments WHERE id = v_gate_assignment) <> 'draft' THEN
    RAISE EXCEPTION 'PRC06B blank gate changed persisted status';
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
  BEGIN
    UPDATE client_commercial_table_assignments SET status = 'under_review' WHERE id = v_gate_assignment;
    RAISE EXCEPTION 'PRC06B gate verification failed: false gate allowed transition';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%controlled client-pricing RPC%' THEN RAISE; END IF;
  END;
  IF (SELECT status FROM client_commercial_table_assignments WHERE id = v_gate_assignment) <> 'draft' THEN
    RAISE EXCEPTION 'PRC06B false gate changed persisted status';
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE client_commercial_table_assignments SET status = 'under_review' WHERE id = v_gate_assignment;
  IF (SELECT status FROM client_commercial_table_assignments WHERE id = v_gate_assignment) <> 'under_review' THEN
    RAISE EXCEPTION 'PRC06B true gate did not allow valid transition';
  END IF;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);

  -- Read-only and no-membership fixtures are ordinary draft rows with full integrity.
  INSERT INTO client_commercial_table_assignments (
    id, organization_id, client_company_id, commercial_price_table_id, status, valid_from
  ) VALUES
    (v_operator_assignment, v_operator_org, v_operator_client, v_operator_table, 'draft', DATE '2027-01-01'),
    (v_viewer_assignment, v_viewer_org, v_viewer_client, v_viewer_table, 'draft', DATE '2027-01-01'),
    (v_foreign_assignment, v_foreign_org, v_foreign_client, v_foreign_table, 'draft', DATE '2027-01-01'),
    (v_cross_assignment, v_cross_org, v_cross_client, v_cross_table, 'draft', DATE '2027-01-01');
  INSERT INTO client_price_overrides (
    id, organization_id, client_company_id, catalog_item_id,
    price_amount, currency, reason, status, valid_from,
    item_code_snapshot, item_name_snapshot, item_type_snapshot
  ) VALUES
    (v_operator_override, v_operator_org, v_operator_client, v_operator_item, 20, 'BRL', 'operator read fixture', 'draft', DATE '2027-01-01', 'x', 'x', 'x'),
    (v_viewer_override, v_viewer_org, v_viewer_client, v_viewer_item, 30, 'BRL', 'viewer read fixture', 'draft', DATE '2027-01-01', 'x', 'x', 'x'),
    (v_foreign_override, v_foreign_org, v_foreign_client, v_foreign_item, 40, 'BRL', 'foreign hidden fixture', 'draft', DATE '2027-01-01', 'x', 'x', 'x'),
    (v_cross_override, v_cross_org, v_cross_client, v_cross_item, 50, 'BRL', 'cross admin fixture', 'draft', DATE '2027-01-01', 'x', 'x', 'x');

  -- Structural role-map checks fail the setup instead of becoming soft test passes.
  IF (SELECT count(*) FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = v_admin_role AND p.code LIKE 'pricing.client.%') <> 6 THEN
    RAISE EXCEPTION 'PRC06B admin role must have all six pricing.client permissions';
  END IF;
  IF (SELECT count(*) FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = v_manager_role AND p.code LIKE 'pricing.client.%') <> 5 THEN
    RAISE EXCEPTION 'PRC06B manager role must have five pricing.client permissions';
  END IF;
  IF EXISTS (SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = v_manager_role AND p.code = 'pricing.client.publish') THEN
    RAISE EXCEPTION 'PRC06B manager must not have pricing.client.publish';
  END IF;
  IF (SELECT count(*) FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = v_operator_role AND p.code LIKE 'pricing.client.%') <> 1 THEN
    RAISE EXCEPTION 'PRC06B operator must have view only';
  END IF;
  IF (SELECT count(*) FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = v_viewer_role AND p.code LIKE 'pricing.client.%') <> 1 THEN
    RAISE EXCEPTION 'PRC06B viewer must have view only';
  END IF;
  IF EXISTS (SELECT 1 FROM permissions WHERE code = 'pricing.client.override_approve') THEN
    RAISE EXCEPTION 'PRC06B must not create pricing.client.override_approve';
  END IF;
  IF to_regclass('public.client_price_override_exceptions') IS NOT NULL THEN
    RAISE EXCEPTION 'PRC06B must not create a redundant override exception table';
  END IF;

  RAISE NOTICE 'PRC06B SETUP DONE: main=% cross=% manager=% operator=% viewer=% foreign=%',
    v_main_org, v_cross_org, v_manager_org, v_operator_org, v_viewer_org, v_foreign_org;
END $$;

COMMIT;
