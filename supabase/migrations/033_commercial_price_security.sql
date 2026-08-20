-- PRC-05B: Commercial Price Security — permissions, RBAC mappings, RLS, audit
-- Baseline: e9e3e4d61a190a4aef4e6cabee4d2ac0cc4b04e6
-- Reuses existing helpers: is_member_of() (005), has_permission() (008), log_audit() (016).
-- Migrations 001-031 are IMMUTABLE.
--
-- Placeholder reconciliation: the legacy placeholder permission 'pricing.price.publish'
-- may exist in the database with NO role mappings (verified during PRC-05B). It is
-- superseded by the pricing.commercial.* set below. It is NOT destructively removed
-- (kept for compatibility); it is documented as deprecated in docs/RBAC.md and
-- is simply never granted to any role.

-- ============================================================
-- 1. PERMISSIONS (section 42)
-- ============================================================
INSERT INTO permissions (code, name, description) VALUES
  ('pricing.commercial.view',             'Visualizar Tabelas Comerciais',       'Visualizar tabelas comerciais, versões, itens e exceções'),
  ('pricing.commercial.create',           'Criar Tabelas Comerciais',            'Criar tabelas comerciais, versões e itens de draft'),
  ('pricing.commercial.edit',             'Editar Tabelas Comerciais',           'Editar drafts (itens, preços, notas)'),
  ('pricing.commercial.review',           'Revisar Tabelas Comerciais',          'Submeter versões para revisão e solicitar exceções'),
  ('pricing.commercial.approve',          'Aprovar Tabelas Comerciais',          'Aprovar versões de tabela'),
  ('pricing.commercial.publish',          'Publicar Tabelas Comerciais',         'Publicar versões aprovadas'),
  ('pricing.commercial.exception_approve','Aprovar Exceções Comerciais',         'Decidir pedidos de exceção comercial')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. ROLE → PERMISSION MAPPINGS (section 43)
-- ============================================================

-- admin: all commercial permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'admin'
  AND p.code IN ('pricing.commercial.view','pricing.commercial.create','pricing.commercial.edit',
                 'pricing.commercial.review','pricing.commercial.approve','pricing.commercial.publish',
                 'pricing.commercial.exception_approve')
ON CONFLICT DO NOTHING;

-- manager: view + create + edit + review + approve
-- (publish and exception_approve stay admin-only, consistent with
--  pricing.cost.publish / pricing.policy.publish being admin-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'manager'
  AND p.code IN ('pricing.commercial.view','pricing.commercial.create','pricing.commercial.edit',
                 'pricing.commercial.review','pricing.commercial.approve')
ON CONFLICT DO NOTHING;

-- operator: view only (conservative read-only default, aligned with cost/policy domains)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'operator'
  AND p.code = 'pricing.commercial.view'
ON CONFLICT DO NOTHING;

-- viewer: view only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'viewer'
  AND p.code = 'pricing.commercial.view'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. ENABLE RLS (section 54)
-- ============================================================
ALTER TABLE commercial_price_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_price_table_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_price_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_price_exceptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES
--    Every policy enforces: organization membership AND required permission.
--    DELETE relies on the schema-level hard-delete guards (draft-only, append-only).
-- ============================================================

-- commercial_price_tables
CREATE POLICY cpt_select ON commercial_price_tables
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.view', organization_id)
  );

CREATE POLICY cpt_insert ON commercial_price_tables
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.create', organization_id)
  );

CREATE POLICY cpt_update ON commercial_price_tables
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.edit', organization_id)
  );

CREATE POLICY cpt_delete ON commercial_price_tables
  FOR DELETE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.edit', organization_id)
  );

-- commercial_price_table_versions
CREATE POLICY cptv_select ON commercial_price_table_versions
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.view', organization_id)
  );

CREATE POLICY cptv_insert ON commercial_price_table_versions
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.create', organization_id)
  );

CREATE POLICY cptv_update ON commercial_price_table_versions
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.edit', organization_id)
  );

CREATE POLICY cptv_delete ON commercial_price_table_versions
  FOR DELETE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.edit', organization_id)
  );

-- commercial_price_items
CREATE POLICY cpi_select ON commercial_price_items
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.view', organization_id)
  );

CREATE POLICY cpi_insert ON commercial_price_items
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.create', organization_id)
  );

CREATE POLICY cpi_update ON commercial_price_items
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.edit', organization_id)
  );

CREATE POLICY cpi_delete ON commercial_price_items
  FOR DELETE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.edit', organization_id)
  );

-- commercial_price_exceptions
-- INSERT/request under review; decisions (UPDATE) under exception_approve.
-- No ordinary authenticated DELETE: no DELETE policy is created and the
-- append-only trigger blocks any delete regardless of role.
CREATE POLICY cpe_select ON commercial_price_exceptions
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.view', organization_id)
  );

CREATE POLICY cpe_insert ON commercial_price_exceptions
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.review', organization_id)
  );

CREATE POLICY cpe_update ON commercial_price_exceptions
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.commercial.exception_approve', organization_id)
  );

-- ============================================================
-- 5. AUDIT INTEGRATION (section 45)
-- ============================================================
-- Append-only via audit_logs triggers (004). log_audit derives actor from
-- auth.uid() and is revoked from PUBLIC/anon/authenticated (016). Reads are
-- never audited.

-- tables
CREATE OR REPLACE FUNCTION public.fn_audit_commercial_price_tables()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'pricing.commercial.table.created', 'commercial_price_table', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status = 'inactive' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.table.inactivated', 'commercial_price_table', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSE
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.table.updated', 'commercial_price_table', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'pricing.commercial.table.deleted', 'commercial_price_table', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_commercial_price_tables
  AFTER INSERT OR UPDATE OR DELETE ON commercial_price_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_commercial_price_tables();

-- versions
CREATE OR REPLACE FUNCTION public.fn_audit_commercial_price_table_versions()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'pricing.commercial.version.created', 'commercial_price_table_version', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'draft' AND NEW.status = 'under_review' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.version.submitted', 'commercial_price_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status = 'under_review' AND NEW.status = 'draft' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.version.returned_to_draft', 'commercial_price_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status = 'under_review' AND NEW.status = 'approved' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.version.approved', 'commercial_price_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status = 'approved' AND NEW.status IN ('active','scheduled') THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.version.published', 'commercial_price_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status = 'scheduled' AND NEW.status = 'active' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.version.activated', 'commercial_price_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF NEW.status = 'superseded' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.version.superseded', 'commercial_price_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.version.cancelled', 'commercial_price_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSE
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.version.updated', 'commercial_price_table_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'pricing.commercial.version.deleted', 'commercial_price_table_version', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_commercial_price_table_versions
  AFTER INSERT OR UPDATE OR DELETE ON commercial_price_table_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_commercial_price_table_versions();

-- items
CREATE OR REPLACE FUNCTION public.fn_audit_commercial_price_items()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'pricing.commercial.item.created', 'commercial_price_item', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit(NEW.organization_id, 'pricing.commercial.item.updated', 'commercial_price_item', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'pricing.commercial.item.deleted', 'commercial_price_item', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_commercial_price_items
  AFTER INSERT OR UPDATE OR DELETE ON commercial_price_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_commercial_price_items();

-- exceptions
CREATE OR REPLACE FUNCTION public.fn_audit_commercial_price_exceptions()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'pricing.commercial.exception.requested', 'commercial_price_exception', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'approved' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.exception.approved', 'commercial_price_exception', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF NEW.status = 'denied' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.exception.denied', 'commercial_price_exception', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSE
      PERFORM log_audit(NEW.organization_id, 'pricing.commercial.exception.updated', 'commercial_price_exception', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'pricing.commercial.exception.deleted', 'commercial_price_exception', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_commercial_price_exceptions
  AFTER INSERT OR UPDATE OR DELETE ON commercial_price_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_commercial_price_exceptions();

-- ============================================================
-- 6. INTERNAL AUDIT FUNCTION REVOKES
-- ============================================================
-- Audit triggers are SECURITY DEFINER; EXECUTE stays with `authenticated`
-- (revoking it would break trigger invocation by the DML role — see 032 note).
DO $$
DECLARE
  v_rec record;
BEGIN
  FOR v_rec IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'fn_audit_commercial_price_tables',
        'fn_audit_commercial_price_table_versions',
        'fn_audit_commercial_price_items',
        'fn_audit_commercial_price_exceptions'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      v_rec.proname, v_rec.args
    );
  END LOOP;
END $$;