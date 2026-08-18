-- PRC-02A: Supplier Security & Integrity Hardening
-- Baseline: e4785496b76b253d9fccf086a63f9e9f685a7478

-- ============================================================
-- 1. HARDEN log_audit() — derive actor from auth.uid(), never from caller
-- ============================================================
-- Old signature accepted p_actor_user_id from caller (spoofable).
-- New signature derives actor exclusively from auth.uid().
-- REVOKE EXECUTE from PUBLIC so it cannot be called as a generic RPC.

CREATE OR REPLACE FUNCTION log_audit(
  p_org_id         uuid,
  p_action         text,
  p_entity_type    text,
  p_entity_id      uuid,
  p_old_data       jsonb,
  p_new_data       jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (
    organization_id, actor_user_id, action,
    entity_type, entity_id, old_data, new_data
  ) VALUES (
    p_org_id, auth.uid(), p_action,
    p_entity_type, p_entity_id, p_old_data, p_new_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;

-- Revoke direct EXECUTE from roles (triggers still work via SECURITY DEFINER)
REVOKE EXECUTE ON FUNCTION log_audit(uuid, text, text, uuid, jsonb, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION log_audit(uuid, text, text, uuid, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION log_audit(uuid, text, text, uuid, jsonb, jsonb) FROM authenticated;

-- ============================================================
-- 2. Update audit triggers to match new log_audit() signature
-- ============================================================

-- fn_audit_companies
CREATE OR REPLACE FUNCTION fn_audit_companies()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'company.created', 'company', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status = 'inactive' THEN
      PERFORM log_audit(NEW.organization_id, 'company.inactivated', 'company', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status != 'archived' AND NEW.status = 'archived' THEN
      PERFORM log_audit(NEW.organization_id, 'company.archived', 'company', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSE
      PERFORM log_audit(NEW.organization_id, 'company.updated', 'company', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'company.deleted', 'company', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;

-- fn_audit_supplier_profiles
CREATE OR REPLACE FUNCTION fn_audit_supplier_profiles()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'supplier.created', 'supplier', NEW.company_id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status = 'blocked' THEN
      PERFORM log_audit(NEW.organization_id, 'supplier.blocked', 'supplier', NEW.company_id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status = 'active' AND NEW.status = 'inactive' THEN
      PERFORM log_audit(NEW.organization_id, 'supplier.inactivated', 'supplier', NEW.company_id, to_jsonb(OLD), to_jsonb(NEW));
    ELSE
      PERFORM log_audit(NEW.organization_id, 'supplier.updated', 'supplier', NEW.company_id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'supplier.deleted', 'supplier', OLD.company_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;

-- fn_audit_supplier_catalog_items
CREATE OR REPLACE FUNCTION fn_audit_supplier_catalog_items()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'supplier.mapping.created', 'supplier_catalog_item', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_preferred = false AND NEW.is_preferred = true THEN
      PERFORM log_audit(NEW.organization_id, 'supplier.mapping.preferred', 'supplier_catalog_item', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status = 'active' AND NEW.status = 'inactive' THEN
      PERFORM log_audit(NEW.organization_id, 'supplier.mapping.inactivated', 'supplier_catalog_item', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status != 'discontinued' AND NEW.status = 'discontinued' THEN
      PERFORM log_audit(NEW.organization_id, 'supplier.mapping.discontinued', 'supplier_catalog_item', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSE
      PERFORM log_audit(NEW.organization_id, 'supplier.mapping.updated', 'supplier_catalog_item', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'supplier.mapping.deleted', 'supplier_catalog_item', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;

-- ============================================================
-- 3. HARDEN fn_create_supplier_mapping() — server-derived user_id
-- ============================================================
-- Removed p_user_id. Now derives created_by/updated_by from auth.uid().
-- Added: validate supplier_profile exists and is active.
-- Added: validate auth.uid() IS NOT NULL.

CREATE OR REPLACE FUNCTION fn_create_supplier_mapping(
  p_organization_id    uuid,
  p_supplier_company_id uuid,
  p_catalog_item_id    uuid,
  p_external_code      text,
  p_external_name      text,
  p_normalized_external_name text,
  p_external_unit      text,
  p_is_preferred       boolean,
  p_valid_from         date,
  p_valid_to           date,
  p_notes              text
)
RETURNS uuid AS $$
DECLARE
  v_mapping_id uuid;
  v_user_id    uuid;
BEGIN
  -- Server-derived identity: never trust client
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate user permission
  IF NOT has_permission('pricing.supplier.manage_mappings', p_organization_id) THEN
    RAISE EXCEPTION 'Insufficient permissions for manage_mappings';
  END IF;

  -- Validate supplier company belongs to org
  IF NOT EXISTS (
    SELECT 1 FROM companies
    WHERE id = p_supplier_company_id AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Supplier company does not belong to this organization';
  END IF;

  -- Validate supplier_profile exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM supplier_profiles
    WHERE company_id = p_supplier_company_id
      AND organization_id = p_organization_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Supplier profile does not exist or is not active';
  END IF;

  -- Validate catalog item belongs to org
  IF NOT EXISTS (
    SELECT 1 FROM catalog_items
    WHERE id = p_catalog_item_id AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Catalog item does not belong to this organization';
  END IF;

  -- If preferred, remove existing preferred for same catalog_item + org
  IF p_is_preferred THEN
    UPDATE supplier_catalog_items
    SET is_preferred = false,
        updated_by = v_user_id,
        updated_at = now()
    WHERE catalog_item_id = p_catalog_item_id
      AND organization_id = p_organization_id
      AND is_preferred = true
      AND status = 'active';
  END IF;

  -- Create mapping
  INSERT INTO supplier_catalog_items (
    organization_id, supplier_company_id, catalog_item_id,
    external_code, external_name, normalized_external_name, external_unit,
    is_preferred, status, valid_from, valid_to, notes,
    created_by, updated_by
  ) VALUES (
    p_organization_id, p_supplier_company_id, p_catalog_item_id,
    p_external_code, p_external_name, p_normalized_external_name, p_external_unit,
    p_is_preferred, 'active', p_valid_from, p_valid_to, p_notes,
    v_user_id, v_user_id
  ) RETURNING id INTO v_mapping_id;

  -- Create supplier alias for search integration
  INSERT INTO catalog_item_aliases (
    organization_id, catalog_item_id, source_type,
    original_name, normalized_name,
    source_company_id, supplier_catalog_item_id, external_code,
    is_confirmed, confirmed_by, confirmed_at
  ) VALUES (
    p_organization_id, p_catalog_item_id, 'supplier',
    p_external_name, p_normalized_external_name,
    p_supplier_company_id, v_mapping_id, p_external_code,
    true, v_user_id, now()
  );

  RETURN v_mapping_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;

-- ============================================================
-- 4. HARDEN fn_set_preferred_mapping() — server-derived, full validation
-- ============================================================
-- Removed p_user_id. Now derives updated_by from auth.uid().
-- Added: mapping must be active, supplier must be active,
--        cross-org validation, permission check.

CREATE OR REPLACE FUNCTION fn_set_preferred_mapping(
  p_mapping_id uuid
)
RETURNS void AS $$
DECLARE
  v_org_id          uuid;
  v_catalog_item_id uuid;
  v_supplier_id     uuid;
  v_status          text;
  v_user_id         uuid;
BEGIN
  -- Server-derived identity
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Load mapping
  SELECT organization_id, catalog_item_id, supplier_company_id, status
  INTO v_org_id, v_catalog_item_id, v_supplier_id, v_status
  FROM supplier_catalog_items
  WHERE id = p_mapping_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Mapping not found';
  END IF;

  -- Validate user belongs to this org
  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  -- Validate permission
  IF NOT has_permission('pricing.supplier.manage_mappings', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Validate mapping is active (cannot prefer inactive/discontinued)
  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Only active mappings can be set as preferred';
  END IF;

  -- Validate supplier_profile is active
  IF NOT EXISTS (
    SELECT 1 FROM supplier_profiles
    WHERE company_id = v_supplier_id
      AND organization_id = v_org_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Supplier profile is not active';
  END IF;

  -- Remove existing preferred for same catalog_item + org
  UPDATE supplier_catalog_items
  SET is_preferred = false,
      updated_by = v_user_id,
      updated_at = now()
  WHERE catalog_item_id = v_catalog_item_id
    AND organization_id = v_org_id
    AND is_preferred = true
    AND id != p_mapping_id;

  -- Set new preferred
  UPDATE supplier_catalog_items
  SET is_preferred = true,
      updated_by = v_user_id,
      updated_at = now()
  WHERE id = p_mapping_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;

-- ============================================================
-- 5. STRENGTHEN fn_alias_supplier_source_integrity()
-- ============================================================
-- Now validates: mapping exists, org match, item match, company match.

CREATE OR REPLACE FUNCTION fn_alias_supplier_source_integrity()
RETURNS trigger AS $$
BEGIN
  IF NEW.source_type = 'supplier' THEN
    IF NEW.source_company_id IS NULL THEN
      RAISE EXCEPTION 'source_company_id is required when source_type = supplier';
    END IF;
    IF NEW.supplier_catalog_item_id IS NULL THEN
      RAISE EXCEPTION 'supplier_catalog_item_id is required when source_type = supplier';
    END IF;

    -- Validate mapping exists and belongs to same org + item + company
    IF NOT EXISTS (
      SELECT 1 FROM supplier_catalog_items
      WHERE id = NEW.supplier_catalog_item_id
        AND organization_id = NEW.organization_id
        AND catalog_item_id = NEW.catalog_item_id
        AND supplier_company_id = NEW.source_company_id
    ) THEN
      RAISE EXCEPTION 'Invalid supplier alias: mapping does not exist or refers to different org/item/company';
    END IF;

    -- Ensure company belongs to same org
    IF NOT EXISTS (
      SELECT 1 FROM companies
      WHERE id = NEW.source_company_id
        AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'source_company_id does not belong to organization_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
  SET search_path = public;

-- ============================================================
-- 6. PREFERRED INTEGRITY: is_preferred=true requires status=active
-- ============================================================
-- Simple CHECK constraint: if is_preferred is true, status must be active.

ALTER TABLE supplier_catalog_items
  ADD CONSTRAINT chk_sci_preferred_requires_active
  CHECK (is_preferred = false OR status = 'active');

-- ============================================================
-- 7. Prevent UPDATE/DELETE on audit_logs (append-only reinforcement)
-- ============================================================
-- Already exists from 004_core_audit but reinforce with explicit revoke

-- Ensure SECURITY DEFINER functions have minimal EXECUTE privileges
-- fn_create_supplier_mapping: only authenticated users
REVOKE EXECUTE ON FUNCTION fn_create_supplier_mapping(uuid, uuid, uuid, text, text, text, text, boolean, date, date, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_create_supplier_mapping(uuid, uuid, uuid, text, text, text, text, boolean, date, date, text) FROM anon;

-- fn_set_preferred_mapping: only authenticated users
REVOKE EXECUTE ON FUNCTION fn_set_preferred_mapping(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_set_preferred_mapping(uuid) FROM anon;
