-- PRC-04B: Pricing Policy Schema — pricing_policies, pricing_policy_versions, pricing_policy_components
-- Baseline: 9dc702ea6c85fd230cc4b5743f2989935a3abb9f (PRC-04A spec locked)
-- Spec: docs/PRICING_ENGINE.md (sections 14-19). Migrations 001-025 are IMMUTABLE.
-- This migration creates the trustworthy data model the PRC-04C calculation engine will consume.
-- It does NOT implement the calculation engine (fn_calculate_price / fn_resolve_pricing_policy).

-- ============================================================
-- 0. DEPENDENCIES
-- ============================================================
-- btree_gist is required for the temporal EXCLUDE constraint (enabled in 023).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- 1. pricing_policies — stable identity of a pricing rule
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_policies (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id),
  code                text NOT NULL,
  name                text NOT NULL,
  description         text,

  scope_type          text NOT NULL CHECK (scope_type IN ('default','category','catalog_item')),

  catalog_category_id uuid REFERENCES catalog_categories(id),
  catalog_item_id     uuid REFERENCES catalog_items(id),

  status              text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','inactive')),

  created_by          uuid NOT NULL REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid NOT NULL REFERENCES auth.users(id),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE pricing_policies IS
  'Identidade estável de uma política de preço. Não armazena valores de cálculo (ficam nas versões).';

-- Scope consistency: each scope_type requires exactly its own target column
ALTER TABLE pricing_policies
  ADD CONSTRAINT chk_pp_scope_consistency CHECK (
    (scope_type = 'default'     AND catalog_category_id IS NULL AND catalog_item_id IS NULL)
    OR (scope_type = 'category' AND catalog_category_id IS NOT NULL AND catalog_item_id IS NULL)
    OR (scope_type = 'catalog_item' AND catalog_item_id IS NOT NULL AND catalog_category_id IS NULL)
  );

-- Unique code per organization
ALTER TABLE pricing_policies
  ADD CONSTRAINT uq_pp_code UNIQUE (organization_id, code);

-- Scope ambiguity prevention (section 6): at most ONE active policy per scope target.
-- To replace a policy, deactivate the previous one first (it remains for history).
CREATE UNIQUE INDEX idx_pp_unique_default
  ON pricing_policies(organization_id)
  WHERE scope_type = 'default' AND status = 'active';

CREATE UNIQUE INDEX idx_pp_unique_category
  ON pricing_policies(organization_id, catalog_category_id)
  WHERE scope_type = 'category' AND status = 'active';

CREATE UNIQUE INDEX idx_pp_unique_item
  ON pricing_policies(organization_id, catalog_item_id)
  WHERE scope_type = 'catalog_item' AND status = 'active';

-- Cross-org integrity: referenced category/item must belong to the SAME organization
CREATE OR REPLACE FUNCTION fn_pp_scope_same_org()
RETURNS trigger AS $$
BEGIN
  IF NEW.scope_type IN ('category') THEN
    IF NOT EXISTS (
      SELECT 1 FROM catalog_categories
      WHERE id = NEW.catalog_category_id
        AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'catalog_category_id does not belong to organization_id';
    END IF;
  ELSIF NEW.scope_type IN ('catalog_item') THEN
    IF NOT EXISTS (
      SELECT 1 FROM catalog_items
      WHERE id = NEW.catalog_item_id
        AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'catalog_item_id does not belong to organization_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_pp_scope_same_org
  BEFORE INSERT OR UPDATE ON pricing_policies
  FOR EACH ROW
  EXECUTE FUNCTION fn_pp_scope_same_org();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pp_org ON pricing_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_pp_scope ON pricing_policies(organization_id, scope_type, status);
CREATE INDEX IF NOT EXISTS idx_pp_category ON pricing_policies(catalog_category_id);
CREATE INDEX IF NOT EXISTS idx_pp_item ON pricing_policies(catalog_item_id);

CREATE TRIGGER trg_pricing_policies_updated_at
  BEFORE UPDATE ON pricing_policies
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- 2. pricing_policy_versions — versioned, temporally valid pricing rules
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_policy_versions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id),
  pricing_policy_id     uuid NOT NULL REFERENCES pricing_policies(id),

  version_number        integer NOT NULL,

  valid_from            date NOT NULL,
  valid_to              date,

  status                text NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft','under_review','approved',
                          'scheduled','active','superseded','cancelled'
                        )),

  pricing_method        text NOT NULL
                        CHECK (pricing_method IN ('target_margin','markup','fixed_price')),

  target_margin_rate    numeric(9,6),
  markup_rate           numeric(9,6),
  fixed_price           numeric(14,4),

  minimum_margin_rate   numeric(9,6),
  maximum_discount_rate numeric(9,6),

  rounding_mode         text NOT NULL DEFAULT 'none'
                        CHECK (rounding_mode IN ('none','nearest','up','down')),
  rounding_step         numeric(12,4),

  notes                 text,

  created_by            uuid NOT NULL REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),

  approved_by           uuid REFERENCES auth.users(id),
  approved_at           timestamptz,

  published_by          uuid REFERENCES auth.users(id),
  published_at          timestamptz,

  superseded_at         timestamptz
);

COMMENT ON TABLE pricing_policy_versions IS
  'Regras numéricas versionadas da política. Preços comerciais calculados NÃO são persistidos aqui (PRC-04C/PRC-05).';

-- Version number integrity + uniqueness
ALTER TABLE pricing_policy_versions
  ADD CONSTRAINT chk_ppv_version_number CHECK (version_number > 0);

CREATE UNIQUE INDEX idx_ppv_unique_version
  ON pricing_policy_versions(pricing_policy_id, version_number);

-- Temporal range [valid_from, valid_to)
ALTER TABLE pricing_policy_versions
  ADD CONSTRAINT chk_ppv_validity
  CHECK (valid_to IS NULL OR valid_to > valid_from);

-- Method-specific input integrity (section 8): each method accepts ONLY its own rate
ALTER TABLE pricing_policy_versions
  ADD CONSTRAINT chk_ppv_method_integrity CHECK (
    (pricing_method = 'target_margin' AND target_margin_rate IS NOT NULL
       AND markup_rate IS NULL AND fixed_price IS NULL
       AND target_margin_rate >= 0 AND target_margin_rate < 1)
    OR
    (pricing_method = 'markup' AND markup_rate IS NOT NULL
       AND target_margin_rate IS NULL AND fixed_price IS NULL
       AND markup_rate >= 0)
    OR
    (pricing_method = 'fixed_price' AND fixed_price IS NOT NULL
       AND target_margin_rate IS NULL AND markup_rate IS NULL
       AND fixed_price >= 0)
  );

-- Minimum margin (section 9): NULL or [0, 1)
ALTER TABLE pricing_policy_versions
  ADD CONSTRAINT chk_ppv_min_margin CHECK (
    minimum_margin_rate IS NULL
    OR (minimum_margin_rate >= 0 AND minimum_margin_rate < 1)
  );

-- Maximum discount (section 10): NULL or [0, 1]
ALTER TABLE pricing_policy_versions
  ADD CONSTRAINT chk_ppv_max_discount CHECK (
    maximum_discount_rate IS NULL
    OR (maximum_discount_rate >= 0 AND maximum_discount_rate <= 1)
  );

-- Rounding config (section 11): 'none' ⇒ step NULL; otherwise step > 0
ALTER TABLE pricing_policy_versions
  ADD CONSTRAINT chk_ppv_rounding CHECK (
    (rounding_mode = 'none' AND rounding_step IS NULL)
    OR (rounding_mode <> 'none' AND rounding_step IS NOT NULL AND rounding_step > 0)
  );

-- Cross-org integrity: version must belong to the SAME org as its policy
CREATE OR REPLACE FUNCTION fn_ppv_policy_same_org()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pricing_policies
    WHERE id = NEW.pricing_policy_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'pricing_policy_id does not belong to organization_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ppv_policy_same_org
  BEFORE INSERT OR UPDATE ON pricing_policy_versions
  FOR EACH ROW
  EXECUTE FUNCTION fn_ppv_policy_same_org();

-- Temporal non-overlap (section 14): active/scheduled versions of the same
-- policy must not overlap. daterange '[)' + GiST EXCLUDE, DEFERRABLE to allow
-- the future publish RPC to supersede predecessors within one transaction.
ALTER TABLE pricing_policy_versions
  DROP CONSTRAINT IF EXISTS chk_ppv_no_overlap;

ALTER TABLE pricing_policy_versions
  ADD CONSTRAINT chk_ppv_no_overlap EXCLUDE USING gist (
    pricing_policy_id WITH =,
    daterange(valid_from, valid_to, '[)') WITH &&
  )
  WHERE (status IN ('active','scheduled'))
  DEFERRABLE INITIALLY DEFERRED;

-- ============================================================
-- 3. VERSION WORKFLOW INTEGRITY — CONTROLLED RPC GATE
-- ============================================================
-- Status transitions are only valid inside a controlled RPC that sets
-- app.pricing_rpc_active = 'true' (analogous to app.cost_rpc_active).
-- Direct status changes are rejected.

CREATE OR REPLACE FUNCTION fn_ppv_validate_status_transition()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_is_rpc  boolean;
BEGIN
  v_user_id := auth.uid();
  v_is_rpc  := (current_setting('app.pricing_rpc_active', true) = 'true');

  -- No status change → nothing to validate (draft edits flow through)
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- active/superseded: no direct status changes (active → superseded only via RPC)
  IF OLD.status IN ('active','superseded') THEN
    IF OLD.status = 'active' AND NEW.status = 'superseded' AND v_is_rpc THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cannot change status of % version directly', OLD.status;
  END IF;

  -- scheduled → superseded via RPC (continuous timeline)
  IF OLD.status = 'scheduled' AND NEW.status = 'superseded' AND v_is_rpc THEN
    RETURN NEW;
  END IF;

  -- cancelled is terminal
  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot change status of cancelled version';
  END IF;

  IF NOT v_is_rpc THEN
    RAISE EXCEPTION 'Status changes must go through the corresponding RPC function';
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF OLD.status = 'draft' AND NEW.status = 'under_review' THEN
    IF NOT has_permission('pricing.policy.review', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for submit (requires pricing.policy.review)';
    END IF;
  ELSIF OLD.status = 'under_review' AND NEW.status = 'approved' THEN
    IF NOT has_permission('pricing.policy.approve', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for approve (requires pricing.policy.approve)';
    END IF;
    NEW.approved_by := v_user_id;
    NEW.approved_at := now();
  ELSIF OLD.status = 'approved' AND NEW.status IN ('active','scheduled') THEN
    IF NOT has_permission('pricing.policy.publish', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for publish (requires pricing.policy.publish)';
    END IF;
    NEW.published_by := v_user_id;
    NEW.published_at := now();
  ELSIF OLD.status IN ('draft','under_review','approved') AND NEW.status = 'cancelled' THEN
    IF NOT has_permission('pricing.policy.approve', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for cancel (requires pricing.policy.approve)';
    END IF;
  ELSIF OLD.status = 'under_review' AND NEW.status = 'draft' THEN
    IF NOT has_permission('pricing.policy.edit', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for send back to draft (requires pricing.policy.edit)';
    END IF;
  ELSIF OLD.status = 'scheduled' AND NEW.status = 'active' THEN
    IF NOT has_permission('pricing.policy.publish', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for activation (requires pricing.policy.publish)';
    END IF;
    NEW.published_by := v_user_id;
    NEW.published_at := now();
  ELSE
    RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_ppv_validate_status_transition
  BEFORE UPDATE ON pricing_policy_versions
  FOR EACH ROW
  EXECUTE FUNCTION fn_ppv_validate_status_transition();

-- ============================================================
-- 4. VERSION IMMUTABILITY (section 18)
-- ============================================================
-- Draft versions are fully editable. Non-draft versions are immutable outside
-- controlled RPCs; RPCs may only touch workflow/actor/temporal-close fields.

CREATE OR REPLACE FUNCTION fn_ppv_protect_published_fields()
RETURNS trigger AS $$
DECLARE
  v_is_rpc boolean;
BEGIN
  v_is_rpc := (current_setting('app.pricing_rpc_active', true) = 'true');

  -- Draft: fully editable
  IF OLD.status = 'draft' THEN
    RETURN NEW;
  END IF;

  -- Non-draft via controlled RPC: allow only workflow/actor/supersede fields
  IF v_is_rpc THEN
    IF NEW.pricing_policy_id IS DISTINCT FROM OLD.pricing_policy_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.version_number IS DISTINCT FROM OLD.version_number
       OR NEW.pricing_method IS DISTINCT FROM OLD.pricing_method
       OR NEW.target_margin_rate IS DISTINCT FROM OLD.target_margin_rate
       OR NEW.markup_rate IS DISTINCT FROM OLD.markup_rate
       OR NEW.fixed_price IS DISTINCT FROM OLD.fixed_price
       OR NEW.minimum_margin_rate IS DISTINCT FROM OLD.minimum_margin_rate
       OR NEW.maximum_discount_rate IS DISTINCT FROM OLD.maximum_discount_rate
       OR NEW.rounding_mode IS DISTINCT FROM OLD.rounding_mode
       OR NEW.rounding_step IS DISTINCT FROM OLD.rounding_step
       OR NEW.valid_from IS DISTINCT FROM OLD.valid_from
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Cannot modify immutable pricing fields of non-draft version';
    END IF;
    RETURN NEW;
  END IF;

  -- Non-draft without RPC: block any UPDATE entirely
  RAISE EXCEPTION 'Non-draft versions are immutable outside of controlled RPCs';
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ppv_protect_published
  BEFORE UPDATE ON pricing_policy_versions
  FOR EACH ROW
  EXECUTE FUNCTION fn_ppv_protect_published_fields();

-- ============================================================
-- 5. HARD DELETE GUARDS (section 19)
-- ============================================================

-- Versions: only draft versions may be hard deleted
CREATE OR REPLACE FUNCTION fn_ppv_delete_guard()
RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'Cannot hard delete non-draft version (status %)', OLD.status;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ppv_delete_guard
  BEFORE DELETE ON pricing_policy_versions
  FOR EACH ROW
  EXECUTE FUNCTION fn_ppv_delete_guard();

-- Policies: no hard delete once version history exists (use status inactive)
CREATE OR REPLACE FUNCTION fn_pp_delete_guard()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pricing_policy_versions
    WHERE pricing_policy_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot hard delete policy with version history; use status inactive instead';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_pp_delete_guard
  BEFORE DELETE ON pricing_policies
  FOR EACH ROW
  EXECUTE FUNCTION fn_pp_delete_guard();

-- ============================================================
-- 6. pricing_policy_components — version-owned additional costs
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_policy_components (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid NOT NULL REFERENCES organizations(id),
  pricing_policy_version_id uuid NOT NULL REFERENCES pricing_policy_versions(id) ON DELETE CASCADE,

  name                      text NOT NULL,
  description               text,

  component_type            text NOT NULL
                            CHECK (component_type IN ('fixed','percentage_of_base_cost')),

  fixed_amount              numeric(14,4),
  rate                      numeric(9,6),

  sort_order                integer NOT NULL DEFAULT 0,

  created_by                uuid NOT NULL REFERENCES auth.users(id),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_by                uuid NOT NULL REFERENCES auth.users(id),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE pricing_policy_components IS
  'Componentes adicionais de custo por versão de política. v1: apenas FIXED e PERCENTAGE_OF_BASE_COST (não circulares).';

-- Component integrity (section 16): FIXED uses fixed_amount; PERCENTAGE uses rate
ALTER TABLE pricing_policy_components
  ADD CONSTRAINT chk_ppc_type_integrity CHECK (
    (component_type = 'fixed' AND fixed_amount IS NOT NULL AND rate IS NULL AND fixed_amount >= 0)
    OR
    (component_type = 'percentage_of_base_cost' AND rate IS NOT NULL AND fixed_amount IS NULL AND rate >= 0)
  );

-- Cross-org integrity: component must belong to the SAME org as its version
CREATE OR REPLACE FUNCTION fn_ppc_version_same_org()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pricing_policy_versions
    WHERE id = NEW.pricing_policy_version_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'pricing_policy_version_id does not belong to organization_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ppc_version_same_org
  BEFORE INSERT OR UPDATE ON pricing_policy_components
  FOR EACH ROW
  EXECUTE FUNCTION fn_ppc_version_same_org();

-- Components may be inserted/updated/deleted only while the parent version is
-- draft (section 18). Parent being cascade-deleted (v_status NULL) is allowed.
CREATE OR REPLACE FUNCTION fn_ppc_parent_draft()
RETURNS trigger AS $$
DECLARE
  v_version_id uuid;
  v_status     text;
BEGIN
  v_version_id := COALESCE(NEW.pricing_policy_version_id, OLD.pricing_policy_version_id);

  SELECT status INTO v_status
  FROM pricing_policy_versions
  WHERE id = v_version_id;

  IF v_status IS NULL THEN
    -- Parent removed by cascade delete → allow
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Cannot modify components of version with status % (only draft allowed)', v_status;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ppc_parent_draft
  BEFORE INSERT OR UPDATE OR DELETE ON pricing_policy_components
  FOR EACH ROW
  EXECUTE FUNCTION fn_ppc_parent_draft();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ppc_org ON pricing_policy_components(organization_id);
CREATE INDEX IF NOT EXISTS idx_ppc_version ON pricing_policy_components(pricing_policy_version_id);

CREATE TRIGGER trg_pricing_policy_components_updated_at
  BEFORE UPDATE ON pricing_policy_components
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- 7. VERSION INDEXES (section 25)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ppv_org ON pricing_policy_versions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ppv_policy ON pricing_policy_versions(pricing_policy_id);
CREATE INDEX IF NOT EXISTS idx_ppv_status ON pricing_policy_versions(pricing_policy_id, status);
CREATE INDEX IF NOT EXISTS idx_ppv_validity ON pricing_policy_versions(pricing_policy_id, valid_from, valid_to);