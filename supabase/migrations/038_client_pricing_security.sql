-- PRC-06B: Client Pricing Security - permissions, RBAC mappings, RLS, audit
-- Reuses existing helpers: is_member_of() (005), has_permission() (008),
-- and the hardened six-argument log_audit() contract (016).

-- ============================================================
-- 1. PERMISSIONS
-- ============================================================
INSERT INTO public.permissions (code, name, description) VALUES
  ('pricing.client.view',    'Visualizar Precificacao de Clientes', 'Visualizar perfis, atribuicoes de tabela e overrides de clientes'),
  ('pricing.client.create',  'Criar Precificacao de Clientes',      'Criar perfis e drafts de atribuicoes e overrides de clientes'),
  ('pricing.client.edit',    'Editar Precificacao de Clientes',     'Editar perfis e drafts de atribuicoes e overrides de clientes'),
  ('pricing.client.review',  'Revisar Precificacao de Clientes',    'Submeter, retornar e cancelar registros em revisao'),
  ('pricing.client.approve', 'Aprovar Precificacao de Clientes',    'Aprovar atribuicoes e overrides de clientes'),
  ('pricing.client.publish', 'Publicar Precificacao de Clientes',   'Publicar atribuicoes e overrides e operar cutover')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. ROLE -> PERMISSION MAPPINGS
-- ============================================================

-- admin: all six permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'admin'
  AND p.code IN (
    'pricing.client.view', 'pricing.client.create', 'pricing.client.edit',
    'pricing.client.review', 'pricing.client.approve', 'pricing.client.publish'
  )
ON CONFLICT DO NOTHING;

-- manager: all except publish
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'manager'
  AND p.code IN (
    'pricing.client.view', 'pricing.client.create', 'pricing.client.edit',
    'pricing.client.review', 'pricing.client.approve'
  )
ON CONFLICT DO NOTHING;

-- operator: view only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'operator'
  AND p.code = 'pricing.client.view'
ON CONFLICT DO NOTHING;

-- viewer: view only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'viewer'
  AND p.code = 'pricing.client.view'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_commercial_table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_price_overrides ENABLE ROW LEVEL SECURITY;

-- client_profiles
CREATE POLICY client_profiles_select
  ON public.client_profiles
  FOR SELECT
  USING (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.view', organization_id)
  );

CREATE POLICY client_profiles_insert
  ON public.client_profiles
  FOR INSERT
  WITH CHECK (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.create', organization_id)
  );

CREATE POLICY client_profiles_update
  ON public.client_profiles
  FOR UPDATE
  USING (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.edit', organization_id)
  )
  WITH CHECK (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.edit', organization_id)
  );

CREATE POLICY client_profiles_delete
  ON public.client_profiles
  FOR DELETE
  USING (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.edit', organization_id)
  );

-- client_commercial_table_assignments
CREATE POLICY client_table_assignments_select
  ON public.client_commercial_table_assignments
  FOR SELECT
  USING (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.view', organization_id)
  );

CREATE POLICY client_table_assignments_insert
  ON public.client_commercial_table_assignments
  FOR INSERT
  WITH CHECK (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.create', organization_id)
  );

CREATE POLICY client_table_assignments_update
  ON public.client_commercial_table_assignments
  FOR UPDATE
  USING (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.edit', organization_id)
  )
  WITH CHECK (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.edit', organization_id)
  );

CREATE POLICY client_table_assignments_delete
  ON public.client_commercial_table_assignments
  FOR DELETE
  USING (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.edit', organization_id)
  );

-- client_price_overrides
CREATE POLICY client_price_overrides_select
  ON public.client_price_overrides
  FOR SELECT
  USING (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.view', organization_id)
  );

CREATE POLICY client_price_overrides_insert
  ON public.client_price_overrides
  FOR INSERT
  WITH CHECK (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.create', organization_id)
  );

CREATE POLICY client_price_overrides_update
  ON public.client_price_overrides
  FOR UPDATE
  USING (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.edit', organization_id)
  )
  WITH CHECK (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.edit', organization_id)
  );

CREATE POLICY client_price_overrides_delete
  ON public.client_price_overrides
  FOR DELETE
  USING (
    public.is_member_of(organization_id)
    AND public.has_permission('pricing.client.edit', organization_id)
  );

-- Existing audit access is organization-wide. Client-pricing payloads contain
-- negotiated prices and reasons, so they additionally require client view.
CREATE POLICY audit_logs_client_pricing_restrict
  ON public.audit_logs AS RESTRICTIVE
  FOR SELECT
  USING (
    entity_type NOT IN (
      'client_profile',
      'client_commercial_table_assignment',
      'client_price_override'
    )
    OR (
      public.is_member_of(organization_id)
      AND public.has_permission('pricing.client.view', organization_id)
    )
  );

-- ============================================================
-- 4. AUDIT INTEGRATION
-- ============================================================
-- log_audit() derives actor_user_id exclusively from auth.uid(). Each branch
-- emits exactly one event, so a status transition is not also logged as a
-- generic update.

CREATE OR REPLACE FUNCTION public.fn_audit_client_profiles()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit(
      NEW.organization_id,
      'pricing.client.profile.created',
      'client_profile',
      NEW.company_id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'active' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.profile.activated', 'client_profile', NEW.company_id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF NEW.status = 'inactive' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.profile.inactivated', 'client_profile', NEW.company_id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF NEW.status = 'blocked' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.profile.blocked', 'client_profile', NEW.company_id, to_jsonb(OLD), to_jsonb(NEW));
      ELSE
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.profile.status_changed', 'client_profile', NEW.company_id, to_jsonb(OLD), to_jsonb(NEW));
      END IF;
    ELSE
      PERFORM public.log_audit(NEW.organization_id, 'pricing.client.profile.updated', 'client_profile', NEW.company_id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit(
      OLD.organization_id,
      'pricing.client.profile.deleted',
      'client_profile',
      OLD.company_id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_client_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_client_profiles();

CREATE OR REPLACE FUNCTION public.fn_audit_client_table_assignments()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit(NEW.organization_id, 'pricing.client.assignment.created', 'client_commercial_table_assignment', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status = 'draft' AND NEW.status = 'under_review' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.assignment.submitted', 'client_commercial_table_assignment', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF OLD.status = 'under_review' AND NEW.status = 'draft' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.assignment.returned_to_draft', 'client_commercial_table_assignment', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF OLD.status = 'under_review' AND NEW.status = 'approved' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.assignment.approved', 'client_commercial_table_assignment', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF OLD.status = 'approved' AND NEW.status IN ('active', 'scheduled') THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.assignment.published', 'client_commercial_table_assignment', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF OLD.status = 'scheduled' AND NEW.status = 'active' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.assignment.activated', 'client_commercial_table_assignment', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF NEW.status = 'superseded' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.assignment.superseded', 'client_commercial_table_assignment', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF NEW.status = 'cancelled' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.assignment.cancelled', 'client_commercial_table_assignment', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSE
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.assignment.status_changed', 'client_commercial_table_assignment', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      END IF;
    ELSE
      PERFORM public.log_audit(NEW.organization_id, 'pricing.client.assignment.updated', 'client_commercial_table_assignment', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit(OLD.organization_id, 'pricing.client.assignment.deleted', 'client_commercial_table_assignment', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_client_table_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.client_commercial_table_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_client_table_assignments();

CREATE OR REPLACE FUNCTION public.fn_audit_client_price_overrides()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit(NEW.organization_id, 'pricing.client.override.created', 'client_price_override', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status = 'draft' AND NEW.status = 'under_review' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.override.submitted', 'client_price_override', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF OLD.status = 'under_review' AND NEW.status = 'draft' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.override.returned_to_draft', 'client_price_override', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF OLD.status = 'under_review' AND NEW.status = 'approved' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.override.approved', 'client_price_override', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF OLD.status = 'approved' AND NEW.status IN ('active', 'scheduled') THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.override.published', 'client_price_override', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF OLD.status = 'scheduled' AND NEW.status = 'active' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.override.activated', 'client_price_override', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF NEW.status = 'superseded' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.override.superseded', 'client_price_override', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSIF NEW.status = 'cancelled' THEN
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.override.cancelled', 'client_price_override', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      ELSE
        PERFORM public.log_audit(NEW.organization_id, 'pricing.client.override.status_changed', 'client_price_override', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
      END IF;
    ELSE
      PERFORM public.log_audit(NEW.organization_id, 'pricing.client.override.updated', 'client_price_override', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit(OLD.organization_id, 'pricing.client.override.deleted', 'client_price_override', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_client_price_overrides
  AFTER INSERT OR UPDATE OR DELETE ON public.client_price_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_client_price_overrides();

-- ============================================================
-- 5. PRIVILEGE HARDENING
-- ============================================================
-- RLS is the row-level authority. Keep anonymous callers out and expose only
-- ordinary DML to authenticated callers; owner/service roles retain their
-- existing privileges.
REVOKE ALL ON TABLE public.client_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.client_commercial_table_assignments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.client_price_overrides FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_commercial_table_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_price_overrides TO authenticated;

-- UUID keys do not normally create sequences. Harden any sequence owned by
-- these tables defensively without changing privileges elsewhere.
DO $$
DECLARE
  v_sequence record;
BEGIN
  FOR v_sequence IN
    SELECT sequence_ns.nspname AS schema_name, sequence_class.relname AS sequence_name
    FROM pg_catalog.pg_class sequence_class
    JOIN pg_catalog.pg_namespace sequence_ns
      ON sequence_ns.oid = sequence_class.relnamespace
    JOIN pg_catalog.pg_depend dependency
      ON dependency.objid = sequence_class.oid
     AND dependency.deptype IN ('a', 'i')
    JOIN pg_catalog.pg_class owner_table
      ON owner_table.oid = dependency.refobjid
    JOIN pg_catalog.pg_namespace owner_ns
      ON owner_ns.oid = owner_table.relnamespace
    WHERE sequence_class.relkind = 'S'
      AND owner_ns.nspname = 'public'
      AND owner_table.relname IN (
        'client_profiles',
        'client_commercial_table_assignments',
        'client_price_overrides'
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL ON SEQUENCE %I.%I FROM PUBLIC, anon, authenticated',
      v_sequence.schema_name,
      v_sequence.sequence_name
    );
    EXECUTE format(
      'GRANT USAGE ON SEQUENCE %I.%I TO authenticated',
      v_sequence.schema_name,
      v_sequence.sequence_name
    );
  END LOOP;
END $$;

-- Trigger functions remain executable by authenticated so row triggers can
-- run under the repository convention, but are unavailable to PUBLIC/anon.
REVOKE ALL ON FUNCTION public.fn_audit_client_profiles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_audit_client_table_assignments() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_audit_client_price_overrides() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_audit_client_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_audit_client_table_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_audit_client_price_overrides() TO authenticated;

-- Reinforce the existing audit contract: callers cannot spoof audit entries;
-- SECURITY DEFINER audit triggers invoke it as their owner and it derives the
-- actor from auth.uid().
REVOKE EXECUTE ON FUNCTION public.log_audit(uuid, text, text, uuid, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
