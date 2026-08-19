-- PRC-04C: Pricing Policy Workflow RPCs + pricing.calculate permission
-- Migrations 001-027 are IMMUTABLE.
-- This migration creates:
--   1. pricing.calculate permission + RBAC mappings
--   2. Workflow RPCs: create policy, create version, component writes, submit, approve, return-to-draft, cancel, publish
--   3. Scheduled cutover RPC: fn_sync_pricing_policy_version_status
--
-- Patterns follow PRC-03B cost module conventions:
--   - SECURITY DEFINER + SET search_path = public
--   - Server-derived auth.uid()
--   - app.pricing_rpc_active session gate for trigger validation
--   - FOR UPDATE locking for concurrency-safe version allocation
--   - REVOKE FROM PUBLIC/anon

-- ============================================================
-- 1. NEW PERMISSION: pricing.calculate
-- ============================================================
INSERT INTO permissions (code, name, description) VALUES
  ('pricing.calculate', 'Calcular/Simular Preços', 'Executar cálculos/simulações de preço autoritativos via RPC')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. RBAC MAPPINGS for pricing.calculate
-- ============================================================

-- admin: YES
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'admin'
  AND p.code = 'pricing.calculate'
ON CONFLICT DO NOTHING;

-- manager: YES
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'manager'
  AND p.code = 'pricing.calculate'
ON CONFLICT DO NOTHING;

-- operator: YES
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'operator'
  AND p.code = 'pricing.calculate'
ON CONFLICT DO NOTHING;

-- viewer: NO (consistent with viewer not having other pricing permissions)

-- ============================================================
-- 3. fn_create_pricing_policy — create policy identity
-- ============================================================
CREATE OR REPLACE FUNCTION fn_create_pricing_policy(
  p_organization_id  uuid,
  p_code             text,
  p_name             text,
  p_description      text,
  p_scope_type       text,
  p_catalog_category_id uuid DEFAULT NULL,
  p_catalog_item_id     uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_user_id    uuid;
  v_policy_id  uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT is_member_of(p_organization_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF NOT has_permission('pricing.policy.create', p_organization_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.policy.create)';
  END IF;

  INSERT INTO pricing_policies (
    organization_id, code, name, description,
    scope_type, catalog_category_id, catalog_item_id,
    created_by, updated_by
  ) VALUES (
    p_organization_id, p_code, p_name, p_description,
    p_scope_type, p_catalog_category_id, p_catalog_item_id,
    v_user_id, v_user_id
  ) RETURNING id INTO v_policy_id;

  RETURN v_policy_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_create_pricing_policy(uuid, text, text, text, text, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_create_pricing_policy(uuid, text, text, text, text, uuid, uuid) FROM anon;

-- ============================================================
-- 4. fn_create_pricing_policy_version — concurrency-safe version allocation
-- ============================================================
CREATE OR REPLACE FUNCTION fn_create_pricing_policy_version(
  p_policy_id          uuid,
  p_valid_from         date,
  p_valid_to           date DEFAULT NULL,
  p_pricing_method     text,
  p_target_margin_rate numeric(9,6) DEFAULT NULL,
  p_markup_rate        numeric(9,6) DEFAULT NULL,
  p_fixed_price        numeric(14,4) DEFAULT NULL,
  p_minimum_margin_rate   numeric(9,6) DEFAULT NULL,
  p_maximum_discount_rate numeric(9,6) DEFAULT NULL,
  p_rounding_mode      text DEFAULT 'none',
  p_rounding_step      numeric(12,4) DEFAULT NULL,
  p_notes              text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_user_id     uuid;
  v_org_id      uuid;
  v_version_num integer;
  v_version_id  uuid;
  v_policy      record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- FOR UPDATE lock on the policy row (concurrency-safe)
  SELECT pp.id, pp.organization_id
  INTO v_policy
  FROM pricing_policies pp
  WHERE pp.id = p_policy_id
  FOR UPDATE;

  IF v_policy IS NULL THEN
    RAISE EXCEPTION 'Pricing policy not found';
  END IF;

  v_org_id := v_policy.organization_id;

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF NOT has_permission('pricing.policy.create', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.policy.create)';
  END IF;

  -- Atomic version number (under FOR UPDATE lock)
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_num
  FROM pricing_policy_versions
  WHERE pricing_policy_id = p_policy_id;

  INSERT INTO pricing_policy_versions (
    organization_id, pricing_policy_id, version_number,
    valid_from, valid_to, status,
    pricing_method, target_margin_rate, markup_rate, fixed_price,
    minimum_margin_rate, maximum_discount_rate,
    rounding_mode, rounding_step, notes,
    created_by
  ) VALUES (
    v_org_id, p_policy_id, v_version_num,
    p_valid_from, p_valid_to, 'draft',
    p_pricing_method, p_target_margin_rate, p_markup_rate, p_fixed_price,
    p_minimum_margin_rate, p_maximum_discount_rate,
    p_rounding_mode, p_rounding_step, p_notes,
    v_user_id
  ) RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_create_pricing_policy_version(uuid, date, date, text, numeric, numeric, numeric, numeric, numeric, text, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_create_pricing_policy_version(uuid, date, date, text, numeric, numeric, numeric, numeric, numeric, text, numeric, text) FROM anon;

-- ============================================================
-- 5. fn_add_pricing_policy_component
-- ============================================================
CREATE OR REPLACE FUNCTION fn_add_pricing_policy_component(
  p_version_id   uuid,
  p_name         text,
  p_component_type text,
  p_fixed_amount numeric(14,4) DEFAULT NULL,
  p_rate         numeric(9,6) DEFAULT NULL,
  p_sort_order   integer DEFAULT 0
)
RETURNS uuid AS $$
DECLARE
  v_user_id  uuid;
  v_org_id   uuid;
  v_comp_id  uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT v.organization_id INTO v_org_id
  FROM pricing_policy_versions v
  WHERE v.id = p_version_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF NOT has_permission('pricing.policy.edit', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.policy.edit)';
  END IF;

  INSERT INTO pricing_policy_components (
    organization_id, pricing_policy_version_id,
    name, component_type, fixed_amount, rate, sort_order,
    created_by, updated_by
  ) VALUES (
    v_org_id, p_version_id,
    p_name, p_component_type, p_fixed_amount, p_rate, p_sort_order,
    v_user_id, v_user_id
  ) RETURNING id INTO v_comp_id;

  RETURN v_comp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_add_pricing_policy_component(uuid, text, text, numeric, numeric, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_add_pricing_policy_component(uuid, text, text, numeric, numeric, integer) FROM anon;

-- ============================================================
-- 6. fn_update_pricing_policy_component
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_pricing_policy_component(
  p_component_id uuid,
  p_name         text DEFAULT NULL,
  p_fixed_amount numeric(14,4) DEFAULT NULL,
  p_rate         numeric(9,6) DEFAULT NULL,
  p_sort_order   integer DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_user_id      uuid;
  v_org_id       uuid;
  v_component_type text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT c.organization_id, c.component_type INTO v_org_id, v_component_type
  FROM pricing_policy_components c
  WHERE c.id = p_component_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Component not found';
  END IF;

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF NOT has_permission('pricing.policy.edit', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.policy.edit)';
  END IF;

  -- Component-type integrity: reject cross-type field mutations
  IF v_component_type = 'fixed' AND p_rate IS NOT NULL AND p_fixed_amount IS NULL AND p_name IS NULL THEN
    RAISE EXCEPTION 'Cannot set rate on a fixed component (provide fixed_amount instead)';
  END IF;

  IF v_component_type = 'percentage_of_base_cost' AND p_fixed_amount IS NOT NULL AND p_rate IS NULL AND p_name IS NULL THEN
    RAISE EXCEPTION 'Cannot set fixed_amount on a percentage_of_base_cost component (provide rate instead)';
  END IF;

  UPDATE pricing_policy_components
  SET name = COALESCE(p_name, name),
      fixed_amount = COALESCE(p_fixed_amount, fixed_amount),
      rate = COALESCE(p_rate, rate),
      sort_order = COALESCE(p_sort_order, sort_order),
      updated_by = v_user_id
  WHERE id = p_component_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_update_pricing_policy_component(uuid, text, numeric, numeric, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_update_pricing_policy_component(uuid, text, numeric, numeric, integer) FROM anon;

-- ============================================================
-- 7. fn_delete_pricing_policy_component
-- ============================================================
CREATE OR REPLACE FUNCTION fn_delete_pricing_policy_component(
  p_component_id uuid
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_org_id  uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT c.organization_id INTO v_org_id
  FROM pricing_policy_components c
  WHERE c.id = p_component_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Component not found';
  END IF;

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF NOT has_permission('pricing.policy.edit', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.policy.edit)';
  END IF;

  DELETE FROM pricing_policy_components WHERE id = p_component_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_delete_pricing_policy_component(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_delete_pricing_policy_component(uuid) FROM anon;

-- ============================================================
-- 8. fn_submit_pricing_policy_version — draft → under_review
-- ============================================================
CREATE OR REPLACE FUNCTION fn_submit_pricing_policy_version(
  p_version_id uuid
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_org_id  uuid;
  v_status  text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT v.organization_id, v.status INTO v_org_id, v_status
  FROM pricing_policy_versions v
  WHERE v.id = p_version_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF v_status != 'draft' THEN
    RAISE EXCEPTION 'Only draft versions can be submitted for review';
  END IF;

  PERFORM set_config('app.pricing_rpc_active', 'true', true);
  UPDATE pricing_policy_versions
  SET status = 'under_review'
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_submit_pricing_policy_version(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_submit_pricing_policy_version(uuid) FROM anon;

-- ============================================================
-- 9. fn_approve_pricing_policy_version — under_review → approved
-- ============================================================
CREATE OR REPLACE FUNCTION fn_approve_pricing_policy_version(
  p_version_id uuid
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_org_id  uuid;
  v_status  text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT v.organization_id, v.status INTO v_org_id, v_status
  FROM pricing_policy_versions v
  WHERE v.id = p_version_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF v_status != 'under_review' THEN
    RAISE EXCEPTION 'Only versions under review can be approved';
  END IF;

  PERFORM set_config('app.pricing_rpc_active', 'true', true);
  UPDATE pricing_policy_versions
  SET status = 'approved',
      approved_by = v_user_id,
      approved_at = now()
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_approve_pricing_policy_version(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_approve_pricing_policy_version(uuid) FROM anon;

-- ============================================================
-- 10. fn_return_pricing_policy_version_to_draft — under_review → draft
-- ============================================================
CREATE OR REPLACE FUNCTION fn_return_pricing_policy_version_to_draft(
  p_version_id uuid
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_org_id  uuid;
  v_status  text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT v.organization_id, v.status INTO v_org_id, v_status
  FROM pricing_policy_versions v
  WHERE v.id = p_version_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF v_status != 'under_review' THEN
    RAISE EXCEPTION 'Only versions under review can be returned to draft';
  END IF;

  PERFORM set_config('app.pricing_rpc_active', 'true', true);
  UPDATE pricing_policy_versions
  SET status = 'draft'
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_return_pricing_policy_version_to_draft(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_return_pricing_policy_version_to_draft(uuid) FROM anon;

-- ============================================================
-- 11. fn_cancel_pricing_policy_version — draft/under_review/approved → cancelled
-- ============================================================
CREATE OR REPLACE FUNCTION fn_cancel_pricing_policy_version(
  p_version_id uuid
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_org_id  uuid;
  v_status  text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT v.organization_id, v.status INTO v_org_id, v_status
  FROM pricing_policy_versions v
  WHERE v.id = p_version_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF v_status NOT IN ('draft', 'under_review', 'approved') THEN
    RAISE EXCEPTION 'Cannot cancel version with status % (only draft/under_review/approved)', v_status;
  END IF;

  PERFORM set_config('app.pricing_rpc_active', 'true', true);
  UPDATE pricing_policy_versions
  SET status = 'cancelled'
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_cancel_pricing_policy_version(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_cancel_pricing_policy_version(uuid) FROM anon;

-- ============================================================
-- 12. fn_publish_pricing_policy_version — approved → active/scheduled
--     Mirrors fn_publish_cost_version temporal semantics (DEC-029).
-- ============================================================
CREATE OR REPLACE FUNCTION fn_publish_pricing_policy_version(
  p_version_id uuid
)
RETURNS void AS $$
DECLARE
  v_user_id    uuid;
  v_org_id     uuid;
  v_status     text;
  v_valid_from date;
  v_valid_to   date;
  v_policy_id  uuid;
  v_new_status text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT v.organization_id, v.status, v.valid_from, v.valid_to, v.pricing_policy_id
  INTO v_org_id, v_status, v_valid_from, v_valid_to, v_policy_id
  FROM pricing_policy_versions v
  WHERE v.id = p_version_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF NOT has_permission('pricing.policy.publish', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions for publish (requires pricing.policy.publish)';
  END IF;

  IF v_status != 'approved' THEN
    RAISE EXCEPTION 'Only approved versions can be published';
  END IF;

  -- Date-driven status
  IF v_valid_from > current_date THEN
    v_new_status := 'scheduled';
  ELSE
    v_new_status := 'active';
  END IF;

  -- Signal RPC context
  PERFORM set_config('app.pricing_rpc_active', 'true', true);

  IF v_new_status = 'active' THEN
    -- Active publish: supersede ALL other active/scheduled versions for this policy
    UPDATE pricing_policy_versions
    SET status = 'superseded',
        superseded_at = now(),
        valid_to = CASE
          WHEN v_valid_from > valid_from THEN v_valid_from
          ELSE valid_to
        END
    WHERE pricing_policy_id = v_policy_id
      AND id != p_version_id
      AND status IN ('active', 'scheduled');
  ELSE
    -- Scheduled publish: keep predecessor ACTIVE, close its valid_to
    UPDATE pricing_policy_versions
    SET valid_to = v_valid_from
    WHERE pricing_policy_id = v_policy_id
      AND id != p_version_id
      AND status = 'active'
      AND valid_from < v_valid_from
      AND (valid_to IS NULL OR valid_to > v_valid_from);

    -- Supersede overlapping scheduled versions
    UPDATE pricing_policy_versions
    SET status = 'superseded',
        superseded_at = now()
    WHERE pricing_policy_id = v_policy_id
      AND id != p_version_id
      AND status = 'scheduled'
      AND daterange(valid_from, valid_to, '[)') && daterange(v_valid_from, v_valid_to, '[)');
  END IF;

  -- Publish the new version
  UPDATE pricing_policy_versions
  SET status = v_new_status,
      published_by = v_user_id,
      published_at = now()
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_publish_pricing_policy_version(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_publish_pricing_policy_version(uuid) FROM anon;

-- ============================================================
-- 13. fn_sync_pricing_policy_version_status — idempotent scheduled→active cutover
-- ============================================================
CREATE OR REPLACE FUNCTION fn_sync_pricing_policy_version_status(
  p_reference_date date DEFAULT current_date
)
RETURNS integer AS $$
DECLARE
  v_user_id uuid;
  v_count   integer := 0;
  v_sched   record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_reference_date IS NULL THEN
    RAISE EXCEPTION 'Reference date is required';
  END IF;

  -- Signal RPC context for trigger validation
  PERFORM set_config('app.pricing_rpc_active', 'true', true);

  FOR v_sched IN
    SELECT pv.id, pv.pricing_policy_id, pv.valid_from, pv.valid_to, pv.organization_id
    FROM pricing_policy_versions pv
    WHERE pv.status = 'scheduled'
      AND pv.valid_from <= p_reference_date
      AND (pv.valid_to IS NULL OR pv.valid_to > p_reference_date)
    ORDER BY pv.pricing_policy_id, pv.valid_from ASC, pv.version_number ASC
  LOOP
    IF NOT has_permission('pricing.policy.publish', v_sched.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for policy activation';
    END IF;

    -- Supersede the active predecessor whose range ends where this begins
    UPDATE pricing_policy_versions
    SET status = 'superseded',
        superseded_at = now()
    WHERE pricing_policy_id = v_sched.pricing_policy_id
      AND status = 'active'
      AND id NOT IN (
        SELECT pv2.id
        FROM pricing_policy_versions pv2
        WHERE pv2.pricing_policy_id = v_sched.pricing_policy_id
          AND pv2.status = 'scheduled'
          AND pv2.valid_from <= p_reference_date
          AND (pv2.valid_to IS NULL OR pv2.valid_to > p_reference_date)
      )
      AND valid_from <= v_sched.valid_from
      AND (valid_to IS NULL OR valid_to >= v_sched.valid_from);

    -- Activate the scheduled version
    UPDATE pricing_policy_versions
    SET status = 'active',
        published_by = v_user_id,
        published_at = now()
    WHERE id = v_sched.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_sync_pricing_policy_version_status(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_sync_pricing_policy_version_status(date) FROM anon;
GRANT EXECUTE ON FUNCTION fn_sync_pricing_policy_version_status(date) TO authenticated;
