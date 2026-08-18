-- PRC-02: RBAC permissions, role assignments, audit triggers, alias extension

-- ============================================================
-- Server-side audit helper (used by triggers)
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit(
  p_org_id         uuid,
  p_actor_user_id  uuid,
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
    p_org_id, p_actor_user_id, p_action,
    p_entity_type, p_entity_id, p_old_data, p_new_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;

-- ============================================================
-- New permissions: core.company.*
-- ============================================================
INSERT INTO permissions (code, name, description) VALUES
  ('core.company.view',            'Visualizar Empresas',         'Listar e detalhar empresas externas'),
  ('core.company.create',          'Criar Empresa',               'Criar cadastro de empresa externa'),
  ('core.company.edit',            'Editar Empresa',              'Editar dados de empresa externa'),
  ('core.company.archive',         'Arquivar Empresa',            'Inativar ou arquivar empresa externa')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- New permissions: pricing.supplier.*
-- ============================================================
INSERT INTO permissions (code, name, description) VALUES
  ('pricing.supplier.view',              'Visualizar Fornecedores',           'Listar e detalhar fornecedores'),
  ('pricing.supplier.create',            'Criar Fornecedor',                  'Criar perfil de fornecedor'),
  ('pricing.supplier.edit',              'Editar Fornecedor',                 'Editar perfil de fornecedor'),
  ('pricing.supplier.archive',           'Arquivar Fornecedor',               'Inativar ou bloquear fornecedor'),
  ('pricing.supplier.manage_mappings',   'Gerenciar Mapeamentos',            'Criar, editar e gerenciar mapeamentos fornecedor x catálogo')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Role → Permission assignments
-- ============================================================

-- admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'admin'
  AND p.code IN (
    'core.company.view','core.company.create','core.company.edit','core.company.archive',
    'pricing.supplier.view','pricing.supplier.create','pricing.supplier.edit',
    'pricing.supplier.archive','pricing.supplier.manage_mappings'
  )
ON CONFLICT DO NOTHING;

-- manager: view + create + edit + manage_mappings
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'manager'
  AND p.code IN (
    'core.company.view','core.company.create','core.company.edit',
    'pricing.supplier.view','pricing.supplier.create','pricing.supplier.edit',
    'pricing.supplier.manage_mappings'
  )
ON CONFLICT DO NOTHING;

-- operator: view only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'operator'
  AND p.code IN (
    'core.company.view',
    'pricing.supplier.view'
  )
ON CONFLICT DO NOTHING;

-- viewer: view only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'viewer'
  AND p.code IN (
    'core.company.view',
    'pricing.supplier.view'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- Audit triggers for companies
-- ============================================================
CREATE OR REPLACE FUNCTION fn_audit_companies()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(
      NEW.organization_id,
      auth.uid(),
      'company.created',
      'company',
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status = 'inactive' THEN
      PERFORM log_audit(
        NEW.organization_id,
        auth.uid(),
        'company.inactivated',
        'company',
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    ELSIF OLD.status != 'archived' AND NEW.status = 'archived' THEN
      PERFORM log_audit(
        NEW.organization_id,
        auth.uid(),
        'company.archived',
        'company',
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    ELSE
      PERFORM log_audit(
        NEW.organization_id,
        auth.uid(),
        'company.updated',
        'company',
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      OLD.organization_id,
      auth.uid(),
      'company.deleted',
      'company',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;

CREATE TRIGGER trg_audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_companies();

-- ============================================================
-- Audit triggers for supplier_profiles
-- ============================================================
CREATE OR REPLACE FUNCTION fn_audit_supplier_profiles()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(
      NEW.organization_id,
      auth.uid(),
      'supplier.created',
      'supplier',
      NEW.company_id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status = 'blocked' THEN
      PERFORM log_audit(
        NEW.organization_id,
        auth.uid(),
        'supplier.blocked',
        'supplier',
        NEW.company_id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    ELSIF OLD.status = 'active' AND NEW.status = 'inactive' THEN
      PERFORM log_audit(
        NEW.organization_id,
        auth.uid(),
        'supplier.inactivated',
        'supplier',
        NEW.company_id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    ELSE
      PERFORM log_audit(
        NEW.organization_id,
        auth.uid(),
        'supplier.updated',
        'supplier',
        NEW.company_id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      OLD.organization_id,
      auth.uid(),
      'supplier.deleted',
      'supplier',
      OLD.company_id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;

CREATE TRIGGER trg_audit_supplier_profiles
  AFTER INSERT OR UPDATE OR DELETE ON supplier_profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_supplier_profiles();

-- ============================================================
-- Audit triggers for supplier_catalog_items
-- ============================================================
CREATE OR REPLACE FUNCTION fn_audit_supplier_catalog_items()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(
      NEW.organization_id,
      auth.uid(),
      'supplier.mapping.created',
      'supplier_catalog_item',
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_preferred = false AND NEW.is_preferred = true THEN
      PERFORM log_audit(
        NEW.organization_id,
        auth.uid(),
        'supplier.mapping.preferred',
        'supplier_catalog_item',
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    ELSIF OLD.status = 'active' AND NEW.status = 'inactive' THEN
      PERFORM log_audit(
        NEW.organization_id,
        auth.uid(),
        'supplier.mapping.inactivated',
        'supplier_catalog_item',
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    ELSIF OLD.status != 'discontinued' AND NEW.status = 'discontinued' THEN
      PERFORM log_audit(
        NEW.organization_id,
        auth.uid(),
        'supplier.mapping.discontinued',
        'supplier_catalog_item',
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    ELSE
      PERFORM log_audit(
        NEW.organization_id,
        auth.uid(),
        'supplier.mapping.updated',
        'supplier_catalog_item',
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      OLD.organization_id,
      auth.uid(),
      'supplier.mapping.deleted',
      'supplier_catalog_item',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;

CREATE TRIGGER trg_audit_supplier_catalog_items
  AFTER INSERT OR UPDATE OR DELETE ON supplier_catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_supplier_catalog_items();

-- ============================================================
-- Extend catalog_item_aliases to support supplier source
-- ============================================================
ALTER TABLE catalog_item_aliases
  ADD COLUMN source_company_id uuid REFERENCES companies(id),
  ADD COLUMN supplier_catalog_item_id uuid REFERENCES supplier_catalog_items(id),
  ADD COLUMN external_code text;

-- Backfill constraint: supplier source requires both company and mapping
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
$$ LANGUAGE plpgsql;

-- Drop old CHECK constraint on source_type and recreate with 'supplier'
ALTER TABLE catalog_item_aliases
  DROP CONSTRAINT IF EXISTS catalog_item_aliases_source_type_check;

ALTER TABLE catalog_item_aliases
  ADD CONSTRAINT catalog_item_aliases_source_type_check
  CHECK (source_type IN ('manual','legacy','internal','supplier'));

CREATE TRIGGER trg_alias_supplier_integrity
  BEFORE INSERT OR UPDATE ON catalog_item_aliases
  FOR EACH ROW
  EXECUTE FUNCTION fn_alias_supplier_source_integrity();

-- Index for supplier aliases
CREATE INDEX idx_aliases_supplier_company ON catalog_item_aliases(source_company_id)
  WHERE source_company_id IS NOT NULL;
CREATE INDEX idx_aliases_supplier_mapping ON catalog_item_aliases(supplier_catalog_item_id)
  WHERE supplier_catalog_item_id IS NOT NULL;

-- ============================================================
-- RPC: atomic mapping + alias creation
-- ============================================================
CREATE OR REPLACE FUNCTION fn_create_supplier_mapping(
  p_organization_id   uuid,
  p_supplier_company_id uuid,
  p_catalog_item_id   uuid,
  p_external_code     text,
  p_external_name     text,
  p_normalized_external_name text,
  p_external_unit     text,
  p_is_preferred      boolean,
  p_valid_from        date,
  p_valid_to          date,
  p_notes             text,
  p_user_id           uuid
)
RETURNS uuid AS $$
DECLARE
  v_mapping_id uuid;
BEGIN
  -- Validate user permission
  IF NOT has_permission('pricing.supplier.manage_mappings', p_organization_id) THEN
    RAISE EXCEPTION 'Insufficient permissions for manage_mappings';
  END IF;

  -- Validate cross-org
  IF NOT EXISTS (
    SELECT 1 FROM companies
    WHERE id = p_supplier_company_id AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Supplier company does not belong to this organization';
  END IF;

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
        updated_by = p_user_id,
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
    p_user_id, p_user_id
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
    true, p_user_id, now()
  );

  RETURN v_mapping_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;

-- ============================================================
-- RPC: atomic preferred toggle
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_preferred_mapping(
  p_mapping_id   uuid,
  p_user_id      uuid
)
RETURNS void AS $$
DECLARE
  v_org_id uuid;
  v_catalog_item_id uuid;
BEGIN
  SELECT organization_id, catalog_item_id
  INTO v_org_id, v_catalog_item_id
  FROM supplier_catalog_items
  WHERE id = p_mapping_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Mapping not found';
  END IF;

  IF NOT has_permission('pricing.supplier.manage_mappings', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Remove existing preferred for same catalog_item
  UPDATE supplier_catalog_items
  SET is_preferred = false,
      updated_by = p_user_id,
      updated_at = now()
  WHERE catalog_item_id = v_catalog_item_id
    AND organization_id = v_org_id
    AND is_preferred = true
    AND id != p_mapping_id;

  -- Set new preferred
  UPDATE supplier_catalog_items
  SET is_preferred = true,
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_mapping_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;
