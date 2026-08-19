-- PRC-04B: Pricing Policy Security — permissions, RBAC mappings, RLS, audit
-- Baseline: 9dc702ea6c85fd230cc4b5743f2989935a3abb9f
-- Reuses existing helpers: is_member_of() (005), has_permission() (008), log_audit() (016).
-- Migrations 001-025 are IMMUTABLE.

-- ============================================================
-- 1. PERMISSIONS (section 20)
-- ============================================================
INSERT INTO permissions (code, name, description) VALUES
  ('pricing.policy.view',    'Visualizar Políticas de Preço', 'Visualizar políticas de preço, versões e componentes'),
  ('pricing.policy.create',  'Criar Políticas de Preço',      'Criar políticas de preço e versões'),
  ('pricing.policy.edit',    'Editar Políticas de Preço',     'Editar políticas e parâmetros de versões em draft'),
  ('pricing.policy.review',  'Revisar Políticas de Preço',    'Submeter versões para revisão'),
  ('pricing.policy.approve', 'Aprovar Políticas de Preço',    'Aprovar versões de política'),
  ('pricing.policy.publish', 'Publicar Políticas de Preço',   'Publicar versões aprovadas')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. ROLE → PERMISSION MAPPINGS
-- ============================================================

-- admin: all
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'admin'
  AND p.code IN ('pricing.policy.view','pricing.policy.create','pricing.policy.edit',
                 'pricing.policy.review','pricing.policy.approve','pricing.policy.publish')
ON CONFLICT DO NOTHING;

-- manager: view + create + edit + review + approve (publish stays admin-only,
-- consistent with pricing.cost.publish being admin-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'manager'
  AND p.code IN ('pricing.policy.view','pricing.policy.create','pricing.policy.edit',
                 'pricing.policy.review','pricing.policy.approve')
ON CONFLICT DO NOTHING;

-- operator: no policy permissions (consistent with cost module conventions)
-- viewer: no policy permissions

-- ============================================================
-- 3. ENABLE RLS (section 21)
-- ============================================================
ALTER TABLE pricing_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_policy_components ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES (section 21)
--    Every policy enforces: organization membership AND required permission.
-- ============================================================

-- pricing_policies
CREATE POLICY pp_select ON pricing_policies
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('pricing.policy.view', organization_id)
  );

CREATE POLICY pp_insert ON pricing_policies
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('pricing.policy.create', organization_id)
  );

CREATE POLICY pp_update ON pricing_policies
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.policy.edit', organization_id)
  );

CREATE POLICY pp_delete ON pricing_policies
  FOR DELETE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.policy.edit', organization_id)
  );

-- pricing_policy_versions
CREATE POLICY ppv_select ON pricing_policy_versions
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('pricing.policy.view', organization_id)
  );

CREATE POLICY ppv_insert ON pricing_policy_versions
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('pricing.policy.create', organization_id)
  );

CREATE POLICY ppv_update ON pricing_policy_versions
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.policy.edit', organization_id)
  );

CREATE POLICY ppv_delete ON pricing_policy_versions
  FOR DELETE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.policy.edit', organization_id)
  );

-- pricing_policy_components
CREATE POLICY ppc_select ON pricing_policy_components
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('pricing.policy.view', organization_id)
  );

CREATE POLICY ppc_insert ON pricing_policy_components
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('pricing.policy.create', organization_id)
  );

CREATE POLICY ppc_update ON pricing_policy_components
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.policy.edit', organization_id)
  );

CREATE POLICY ppc_delete ON pricing_policy_components
  FOR DELETE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.policy.edit', organization_id)
  );

-- ============================================================
-- 5. AUDIT INTEGRATION (section 24)
-- ============================================================
-- Append-only via audit_logs triggers (004). log_audit derives actor from
-- auth.uid() and is revoked from PUBLIC/anon/authenticated (016).

-- policies
CREATE OR REPLACE FUNCTION fn_audit_pricing_policies()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'pricing.policy.created', 'pricing_policy', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status = 'inactive' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.policy.inactivated', 'pricing_policy', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSE
      PERFORM log_audit(NEW.organization_id, 'pricing.policy.updated', 'pricing_policy', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'pricing.policy.deleted', 'pricing_policy', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_pricing_policies
  AFTER INSERT OR UPDATE OR DELETE ON pricing_policies
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_pricing_policies();

-- versions
CREATE OR REPLACE FUNCTION fn_audit_pricing_policy_versions()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'pricing.policy.version.created', 'pricing_policy_version', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'draft' AND NEW.status = 'under_review' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.policy.version.submitted', 'pricing_policy_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status = 'under_review' AND NEW.status = 'approved' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.policy.version.approved', 'pricing_policy_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.status = 'approved' AND NEW.status IN ('active','scheduled') THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.policy.version.published', 'pricing_policy_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF NEW.status = 'superseded' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.policy.version.superseded', 'pricing_policy_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM log_audit(NEW.organization_id, 'pricing.policy.version.cancelled', 'pricing_policy_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSE
      PERFORM log_audit(NEW.organization_id, 'pricing.policy.version.updated', 'pricing_policy_version', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'pricing.policy.version.deleted', 'pricing_policy_version', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_pricing_policy_versions
  AFTER INSERT OR UPDATE OR DELETE ON pricing_policy_versions
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_pricing_policy_versions();

-- components
CREATE OR REPLACE FUNCTION fn_audit_pricing_policy_components()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.organization_id, 'pricing.policy.component.created', 'pricing_policy_component', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit(NEW.organization_id, 'pricing.policy.component.updated', 'pricing_policy_component', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(OLD.organization_id, 'pricing.policy.component.deleted', 'pricing_policy_component', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_pricing_policy_components
  AFTER INSERT OR UPDATE OR DELETE ON pricing_policy_components
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_pricing_policy_components();