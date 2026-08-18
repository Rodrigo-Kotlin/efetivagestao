-- PRC-03: RBAC permissions + RPCs for cost management

-- ============================================================
-- Permissions
-- ============================================================
INSERT INTO permissions (code, name, description) VALUES
  ('pricing.cost.view',    'Visualizar Custos',    'Visualizar tabelas, versões e itens de custo'),
  ('pricing.cost.create',  'Criar Custos',         'Criar tabelas de custo e versões'),
  ('pricing.cost.edit',    'Editar Custos',        'Editar itens de custo em versões draft'),
  ('pricing.cost.approve', 'Aprovar Custos',       'Aprovar versões de custo'),
  ('pricing.cost.publish', 'Publicar Custos',      'Publicar versões aprovadas'),
  ('pricing.cost.archive', 'Arquivar Custos',      'Arquivar tabelas de custo')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Role → Permission assignments
-- ============================================================

-- admin: all
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'admin'
  AND p.code IN ('pricing.cost.view','pricing.cost.create','pricing.cost.edit',
                  'pricing.cost.approve','pricing.cost.publish','pricing.cost.archive')
ON CONFLICT DO NOTHING;

-- manager: view + create + edit + approve
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'manager'
  AND p.code IN ('pricing.cost.view','pricing.cost.create','pricing.cost.edit',
                  'pricing.cost.approve')
ON CONFLICT DO NOTHING;

-- operator: no cost permissions
-- viewer: no cost permissions

-- ============================================================
-- Audit triggers for cost tables
-- ============================================================
CREATE OR REPLACE FUNCTION fn_audit_cost_tables()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'cost.table.created', 'supplier_cost_table', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status = 'inactive' THEN
      PERFORM log_audit(NEW.organization_id, 'cost.table.inactivated', 'supplier_cost_table', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status != 'archived' AND NEW.status = 'archived' THEN
      PERFORM log_audit(NEW.organization_id, 'cost.table.archived', 'supplier_cost_table', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSE
      PERFORM log_audit(NEW.organization_id, 'cost.table.updated', 'supplier_cost_table', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'cost.table.deleted', 'supplier_cost_table', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_cost_tables
  AFTER INSERT OR UPDATE OR DELETE ON supplier_cost_tables
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_cost_tables();

-- ============================================================
-- Audit triggers for cost table versions
-- ============================================================
CREATE OR REPLACE FUNCTION fn_audit_cost_table_versions()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'cost.version.created', 'supplier_cost_table_version', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'draft' AND NEW.status = 'under_review' THEN
      PERFORM log_audit(NEW.organization_id, 'cost.version.submitted', 'supplier_cost_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status = 'under_review' AND NEW.status = 'approved' THEN
      PERFORM log_audit(NEW.organization_id, 'cost.version.approved', 'supplier_cost_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status = 'approved' AND NEW.status IN ('active','scheduled') THEN
      PERFORM log_audit(NEW.organization_id, 'cost.version.published', 'supplier_cost_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF NEW.status = 'superseded' THEN
      PERFORM log_audit(NEW.organization_id, 'cost.version.superseded', 'supplier_cost_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM log_audit(NEW.organization_id, 'cost.version.cancelled', 'supplier_cost_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSE
      PERFORM log_audit(NEW.organization_id, 'cost.version.updated', 'supplier_cost_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'cost.version.deleted', 'supplier_cost_table_version', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_cost_table_versions
  AFTER INSERT OR UPDATE OR DELETE ON supplier_cost_table_versions
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_cost_table_versions();

-- ============================================================
-- Audit triggers for cost items
-- ============================================================
CREATE OR REPLACE FUNCTION fn_audit_cost_items()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'cost.item.created', 'supplier_cost_item', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit(NEW.organization_id, 'cost.item.updated', 'supplier_cost_item', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'cost.item.deleted', 'supplier_cost_item', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_cost_items
  AFTER INSERT OR UPDATE OR DELETE ON supplier_cost_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_cost_items();

-- ============================================================
-- RPC: Create cost table
-- ============================================================
CREATE OR REPLACE FUNCTION fn_create_cost_table(
  p_organization_id     uuid,
  p_supplier_company_id uuid,
  p_code                text,
  p_name                text,
  p_description         text
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_table_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT has_permission('pricing.cost.create', p_organization_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF NOT is_member_of(p_organization_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  INSERT INTO supplier_cost_tables (
    organization_id, supplier_company_id, code, name, description,
    created_by, updated_by
  ) VALUES (
    p_organization_id, p_supplier_company_id, p_code, p_name, p_description,
    v_user_id, v_user_id
  ) RETURNING id INTO v_table_id;

  RETURN v_table_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_create_cost_table(uuid, uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_create_cost_table(uuid, uuid, text, text, text) FROM anon;

-- ============================================================
-- RPC: Create version (auto-generates version_number)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_create_cost_version(
  p_cost_table_id   uuid,
  p_valid_from      date,
  p_valid_to        date,
  p_version_label   text,
  p_source_date     date,
  p_notes           text
)
RETURNS uuid AS $$
DECLARE
  v_user_id      uuid;
  v_org_id       uuid;
  v_version_num  integer;
  v_version_id   uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT ct.organization_id INTO v_org_id
  FROM supplier_cost_tables ct
  WHERE ct.id = p_cost_table_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Cost table not found';
  END IF;

  IF NOT has_permission('pricing.cost.create', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Auto-generate version number (atomic via COALESCE + MAX)
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_num
  FROM supplier_cost_table_versions
  WHERE cost_table_id = p_cost_table_id;

  INSERT INTO supplier_cost_table_versions (
    organization_id, cost_table_id, version_number, version_label,
    source_date, valid_from, valid_to, status, notes,
    created_by
  ) VALUES (
    v_org_id, p_cost_table_id, v_version_num, p_version_label,
    p_source_date, p_valid_from, p_valid_to, 'draft', p_notes,
    v_user_id
  ) RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_create_cost_version(uuid, date, date, text, date, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_create_cost_version(uuid, date, date, text, date, text) FROM anon;

-- ============================================================
-- RPC: Submit version for review
-- ============================================================
CREATE OR REPLACE FUNCTION fn_submit_cost_version(
  p_version_id uuid
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_org_id  uuid;
  v_status  text;
  v_item_count integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT v.organization_id, v.status INTO v_org_id, v_status
  FROM supplier_cost_table_versions v
  WHERE v.id = p_version_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF NOT has_permission('pricing.cost.create', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF v_status != 'draft' THEN
    RAISE EXCEPTION 'Only draft versions can be submitted for review';
  END IF;

  -- Must have at least one cost item
  SELECT count(*) INTO v_item_count
  FROM supplier_cost_items
  WHERE cost_table_version_id = p_version_id;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Version must have at least one cost item';
  END IF;

  UPDATE supplier_cost_table_versions
  SET status = 'under_review'
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_submit_cost_version(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_submit_cost_version(uuid) FROM anon;

-- ============================================================
-- RPC: Approve version
-- ============================================================
CREATE OR REPLACE FUNCTION fn_approve_cost_version(
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
  FROM supplier_cost_table_versions v
  WHERE v.id = p_version_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF NOT has_permission('pricing.cost.approve', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions for approve';
  END IF;

  IF v_status != 'under_review' THEN
    RAISE EXCEPTION 'Only versions under review can be approved';
  END IF;

  UPDATE supplier_cost_table_versions
  SET status = 'approved',
      approved_by = v_user_id,
      approved_at = now()
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_approve_cost_version(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_approve_cost_version(uuid) FROM anon;

-- ============================================================
-- RPC: Publish version (approved → active/scheduled)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_publish_cost_version(
  p_version_id uuid
)
RETURNS void AS $$
DECLARE
  v_user_id    uuid;
  v_org_id     uuid;
  v_status     text;
  v_valid_from date;
  v_new_status text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT v.organization_id, v.status, v.valid_from
  INTO v_org_id, v_status, v_valid_from
  FROM supplier_cost_table_versions v
  WHERE v.id = p_version_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF NOT has_permission('pricing.cost.publish', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions for publish';
  END IF;

  IF v_status != 'approved' THEN
    RAISE EXCEPTION 'Only approved versions can be published';
  END IF;

  -- Determine active vs scheduled
  IF v_valid_from > current_date THEN
    v_new_status := 'scheduled';
  ELSE
    v_new_status := 'active';
  END IF;

  -- Supersede any currently active/scheduled version for same table
  UPDATE supplier_cost_table_versions
  SET status = 'superseded',
      superseded_at = now()
  WHERE cost_table_id = (
    SELECT cost_table_id FROM supplier_cost_table_versions WHERE id = p_version_id
  )
  AND id != p_version_id
  AND status IN ('active', 'scheduled');

  -- Publish
  UPDATE supplier_cost_table_versions
  SET status = v_new_status,
      published_by = v_user_id,
      published_at = now()
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_publish_cost_version(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_publish_cost_version(uuid) FROM anon;

-- ============================================================
-- RPC: Resolve current cost for a catalog item
-- ============================================================
CREATE OR REPLACE FUNCTION fn_resolve_supplier_cost(
  p_organization_id     uuid,
  p_supplier_company_id uuid,
  p_catalog_item_id     uuid,
  p_reference_date      date DEFAULT current_date
)
RETURNS TABLE (
  amount          numeric(14,4),
  cost_status     text,
  currency_code   char(3),
  mapping_id      uuid,
  cost_table_id   uuid,
  version_id      uuid,
  version_number  integer,
  valid_from      date,
  valid_to        date
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sci.amount,
    sci.cost_status,
    sci.currency_code,
    sci.supplier_catalog_item_id,
    ct.id,
    v.id,
    v.version_number,
    v.valid_from,
    v.valid_to
  FROM supplier_cost_table_versions v
  JOIN supplier_cost_tables ct ON ct.id = v.cost_table_id
  JOIN supplier_cost_items sci ON sci.cost_table_version_id = v.id
  WHERE ct.organization_id = p_organization_id
    AND ct.supplier_company_id = p_supplier_company_id
    AND sci.catalog_item_id = p_catalog_item_id
    AND v.status = 'active'
    AND v.valid_from <= p_reference_date
    AND (v.valid_to IS NULL OR v.valid_to > p_reference_date)
    AND sci.cost_status = 'provided'
  ORDER BY v.version_number DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_resolve_supplier_cost(uuid, uuid, uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_resolve_supplier_cost(uuid, uuid, uuid, date) FROM anon;

-- ============================================================
-- RPC: Get cost version for comparison (version diff data)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_version_items(
  p_version_id uuid
)
RETURNS TABLE (
  id                        uuid,
  supplier_catalog_item_id  uuid,
  catalog_item_id           uuid,
  cost_status               text,
  amount                    numeric(14,4),
  currency_code             char(3),
  notes                     text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sci.id,
    sci.supplier_catalog_item_id,
    sci.catalog_item_id,
    sci.cost_status,
    sci.amount,
    sci.currency_code,
    sci.notes
  FROM supplier_cost_items sci
  WHERE sci.cost_table_version_id = p_version_id
  ORDER BY sci.supplier_catalog_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_get_version_items(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_get_version_items(uuid) FROM anon;

-- ============================================================
-- RPC: Get cost stats for dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_cost_stats(
  p_organization_id uuid
)
RETURNS TABLE (
  active_tables      bigint,
  versions_in_review bigint,
  scheduled_versions bigint,
  items_without_cost bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM supplier_cost_tables
     WHERE organization_id = p_organization_id AND status = 'active'),
    (SELECT count(*) FROM supplier_cost_table_versions v
     JOIN supplier_cost_tables ct ON ct.id = v.cost_table_id
     WHERE ct.organization_id = p_organization_id AND v.status = 'under_review'),
    (SELECT count(*) FROM supplier_cost_table_versions v
     JOIN supplier_cost_tables ct ON ct.id = v.cost_table_id
     WHERE ct.organization_id = p_organization_id AND v.status = 'scheduled'),
    (SELECT count(*) FROM supplier_cost_items sci
     JOIN supplier_cost_table_versions v ON v.id = sci.cost_table_version_id
     JOIN supplier_cost_tables ct ON ct.id = v.cost_table_id
     WHERE ct.organization_id = p_organization_id
       AND v.status IN ('draft')
       AND sci.cost_status IN ('not_provided','awaiting_quote'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_get_cost_stats(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_get_cost_stats(uuid) FROM anon;
