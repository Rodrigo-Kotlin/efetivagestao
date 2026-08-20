-- PRC-05B: Commercial Price Schema — commercial_price_tables,
-- commercial_price_table_versions, commercial_price_items, commercial_price_exceptions
-- Baseline: e9e3e4d61a190a4aef4e6cabee4d2ac0cc4b04e6 (PRC-05A spec locked)
-- Spec: docs/COMMERCIAL_PRICE_TABLES.md (sections 4-55). Migrations 001-031 are IMMUTABLE.
-- This migration creates the trustworthy data model consumed by PRC-05C workflow RPCs.
-- It does NOT implement workflow RPCs, cloning, bulk ops, publish RPCs or the table
-- resolver (deferred to PRC-05C), nor client assignments (PRC-06) or global
-- precedence (PRC-07).
--
-- DEC-051: commercial_price_exceptions is a DEDICATED exception record table
-- (optionality raised in PRC-05A section 35 resolved in favor of the dedicated table).

-- ============================================================
-- 0. DEPENDENCIES
-- ============================================================
-- btree_gist is required for the temporal EXCLUDE constraint (already enabled in 023).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- 1. CODE NORMALIZATION HELPER (DEC-017 semantics, DB-side)
-- ============================================================
-- Deterministic, IMMUTABLE normalizer mirroring src/lib/normalize.ts normalizeText()
-- for uniqueness comparison: lowercase, accent folding (Portuguese), whitespace
-- collapse + trim. Used exclusively inside triggers — not exposed to clients.
-- NOTE: accent source is built with chr() so the definition is encoding-safe
-- (avoids UTF-8/Latin-1 mojibake when the migration is transferred).
CREATE OR REPLACE FUNCTION public.fn_normalize_commercial_code(p_code text)
RETURNS text AS $$
DECLARE
  v_result text;
  v_from   text;
  v_to     text := 'aaaaaaeeeeiiiiooooouuuucnyy';
BEGIN
  IF p_code IS NULL THEN
    RETURN NULL;
  END IF;
  v_from := chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(229) -- á à â ã ä å
         || chr(233)||chr(232)||chr(234)||chr(235)                      -- é è ê ë
         || chr(237)||chr(236)||chr(238)||chr(239)                      -- í ì î ï
         || chr(243)||chr(242)||chr(244)||chr(245)||chr(246)            -- ó ò ô õ ö
         || chr(250)||chr(249)||chr(251)||chr(252)                      -- ú ù û ü
         || chr(231)||chr(241)||chr(253)||chr(255);                     -- ç ñ ý ÿ
  v_result := lower(p_code);
  v_result := translate(v_result, v_from, v_to);
  v_result := regexp_replace(v_result, '\s+', ' ', 'g');
  v_result := btrim(v_result);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- ============================================================
-- 2. commercial_price_tables — stable commercial table identity
-- ============================================================
CREATE TABLE IF NOT EXISTS commercial_price_tables (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),

  code            text NOT NULL,
  code_normalized text NOT NULL,
  name            text NOT NULL,
  description     text,

  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive')),

  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid NOT NULL REFERENCES auth.users(id),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE commercial_price_tables IS
  'Identidade estável de uma tabela comercial. Não armazena preços (ficam nas versões/itens).';

-- Unique code per organization + case/space-normalized uniqueness
ALTER TABLE commercial_price_tables
  ADD CONSTRAINT uq_cpt_code UNIQUE (organization_id, code);

CREATE UNIQUE INDEX idx_cpt_unique_code_normalized
  ON commercial_price_tables(organization_id, code_normalized);

-- Code normalization, empty-code rejection and code stability (section 5):
-- the code may be edited only while the table has no version history.
CREATE OR REPLACE FUNCTION public.fn_cpt_normalize_code()
RETURNS trigger AS $$
DECLARE
  v_has_history boolean;
BEGIN
  IF NEW.code IS NULL OR btrim(NEW.code) = '' THEN
    RAISE EXCEPTION 'code cannot be empty or whitespace only';
  END IF;

  NEW.code_normalized := public.fn_normalize_commercial_code(NEW.code);
  IF NEW.code_normalized IS NULL OR NEW.code_normalized = '' THEN
    RAISE EXCEPTION 'code cannot be empty or whitespace only';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.code IS DISTINCT FROM OLD.code THEN
    SELECT EXISTS (
      SELECT 1 FROM commercial_price_table_versions
      WHERE commercial_price_table_id = OLD.id
    ) INTO v_has_history;
    IF v_has_history THEN
      RAISE EXCEPTION 'Cannot change code of a commercial price table with version history';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpt_normalize_code
  BEFORE INSERT OR UPDATE ON commercial_price_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpt_normalize_code();

-- Server-derived actor: created_by/updated_by always from auth.uid()
CREATE OR REPLACE FUNCTION public.fn_cpt_actor()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := v_user_id;
    NEW.updated_by := v_user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := v_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpt_actor
  BEFORE INSERT OR UPDATE ON commercial_price_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpt_actor();

-- Hard-delete guard (section 53): no hard delete once version history exists
CREATE OR REPLACE FUNCTION public.fn_cpt_delete_guard()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM commercial_price_table_versions
    WHERE commercial_price_table_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot hard delete a commercial price table with version history; use status inactive instead';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpt_delete_guard
  BEFORE DELETE ON commercial_price_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpt_delete_guard();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cpt_org ON commercial_price_tables(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpt_status ON commercial_price_tables(organization_id, status);

CREATE TRIGGER trg_commercial_price_tables_updated_at
  BEFORE UPDATE ON commercial_price_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 3. commercial_price_table_versions — versioned, temporally valid price tables
-- ============================================================
CREATE TABLE IF NOT EXISTS commercial_price_table_versions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid NOT NULL REFERENCES organizations(id),
  commercial_price_table_id uuid NOT NULL REFERENCES commercial_price_tables(id),

  version_number            integer NOT NULL,
  version_label             text,

  valid_from                date NOT NULL,
  valid_to                  date,

  status                    text NOT NULL DEFAULT 'draft'
                            CHECK (status IN (
                              'draft','under_review','approved',
                              'scheduled','active','superseded','cancelled'
                            )),

  notes                     text,

  created_by                uuid NOT NULL REFERENCES auth.users(id),
  created_at                timestamptz NOT NULL DEFAULT now(),

  approved_by               uuid REFERENCES auth.users(id),
  approved_at               timestamptz,

  published_by              uuid REFERENCES auth.users(id),
  published_at              timestamptz,

  superseded_by             uuid REFERENCES auth.users(id),
  superseded_at             timestamptz
);

COMMENT ON TABLE commercial_price_table_versions IS
  'Versão de tabela comercial com vigência [valid_from, valid_to) e lifecycle próprio. Preços explícitos vivem em commercial_price_items.';

-- Version number integrity + uniqueness (section 8); allocation is PRC-05C (FOR UPDATE)
ALTER TABLE commercial_price_table_versions
  ADD CONSTRAINT chk_cptv_version_number CHECK (version_number > 0);

CREATE UNIQUE INDEX idx_cptv_unique_version
  ON commercial_price_table_versions(commercial_price_table_id, version_number);

-- Temporal range [valid_from, valid_to) (section 9)
ALTER TABLE commercial_price_table_versions
  ADD CONSTRAINT chk_cptv_validity
  CHECK (valid_to IS NULL OR valid_to > valid_from);

-- Cross-org integrity: version must belong to the SAME org as its table
CREATE OR REPLACE FUNCTION public.fn_cptv_table_same_org()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM commercial_price_tables
    WHERE id = NEW.commercial_price_table_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'commercial_price_table_id does not belong to organization_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cptv_table_same_org
  BEFORE INSERT OR UPDATE ON commercial_price_table_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cptv_table_same_org();

-- Temporal non-overlap (section 9): active/scheduled versions of the same table
-- must not overlap. daterange '[)' + GiST EXCLUDE, DEFERRABLE to allow the future
-- PRC-05C publish RPC to supersede predecessors within one transaction.
ALTER TABLE commercial_price_table_versions
  DROP CONSTRAINT IF EXISTS chk_cptv_no_overlap;

ALTER TABLE commercial_price_table_versions
  ADD CONSTRAINT chk_cptv_no_overlap EXCLUDE USING gist (
    commercial_price_table_id WITH =,
    daterange(valid_from, valid_to, '[)') WITH &&
  )
  WHERE (status IN ('active','scheduled'))
  DEFERRABLE INITIALLY DEFERRED;

-- Server-derived actor on creation
CREATE OR REPLACE FUNCTION public.fn_cptv_actor()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    NEW.created_by := v_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cptv_actor
  BEFORE INSERT ON commercial_price_table_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cptv_actor();

-- ============================================================
-- 4. VERSION WORKFLOW INTEGRITY — CONTROLLED RPC GATE
-- ============================================================
-- Status transitions are only valid inside a controlled RPC that sets
-- app.commercial_price_rpc_active = 'true' (dedicated gate — NOT
-- app.cost_rpc_active nor app.pricing_rpc_active).
-- Direct status changes are rejected (PRC-05B has no workflow RPCs yet).

CREATE OR REPLACE FUNCTION public.fn_cptv_validate_status_transition()
RETURNS trigger AS $$
DECLARE
  v_user_id    uuid;
  v_is_rpc     boolean;
  v_item_count integer;
BEGIN
  v_user_id := auth.uid();
  v_is_rpc  := COALESCE((current_setting('app.commercial_price_rpc_active', true) = 'true'), false);

  -- No status change → nothing to validate (draft edits flow through)
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- active/superseded: no direct status changes (active → superseded only via RPC)
  IF OLD.status IN ('active','superseded') THEN
    IF OLD.status = 'active' AND NEW.status = 'superseded' AND v_is_rpc THEN
      NEW.superseded_by := v_user_id;
      NEW.superseded_at := now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cannot change status of % version directly', OLD.status;
  END IF;

  -- scheduled → superseded via RPC (continuous timeline)
  IF OLD.status = 'scheduled' AND NEW.status = 'superseded' AND v_is_rpc THEN
    NEW.superseded_by := v_user_id;
    NEW.superseded_at := now();
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
    IF NOT has_permission('pricing.commercial.review', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for submit (requires pricing.commercial.review)';
    END IF;
  ELSIF OLD.status = 'under_review' AND NEW.status = 'approved' THEN
    IF NOT has_permission('pricing.commercial.approve', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for approve (requires pricing.commercial.approve)';
    END IF;
    NEW.approved_by := v_user_id;
    NEW.approved_at := now();
  ELSIF OLD.status = 'approved' AND NEW.status IN ('active','scheduled') THEN
    IF NOT has_permission('pricing.commercial.publish', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for publish (requires pricing.commercial.publish)';
    END IF;
    NEW.published_by := v_user_id;
    NEW.published_at := now();
  ELSIF OLD.status IN ('draft','under_review','approved') AND NEW.status = 'cancelled' THEN
    IF NOT has_permission('pricing.commercial.approve', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for cancel (requires pricing.commercial.approve)';
    END IF;
  ELSIF OLD.status = 'under_review' AND NEW.status = 'draft' THEN
    IF NOT has_permission('pricing.commercial.edit', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for send back to draft (requires pricing.commercial.edit)';
    END IF;
  ELSIF OLD.status = 'scheduled' AND NEW.status = 'active' THEN
    IF NOT has_permission('pricing.commercial.publish', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for activation (requires pricing.commercial.publish)';
    END IF;
    NEW.published_by := v_user_id;
    NEW.published_at := now();
  ELSE
    RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
  END IF;

  -- Version completeness (section 37): a version leaving draft must contain items.
  -- Empty drafts may still be cancelled.
  IF OLD.status = 'draft' AND NEW.status IN ('under_review','approved','scheduled','active') THEN
    SELECT count(*) INTO v_item_count
    FROM commercial_price_items
    WHERE commercial_price_table_version_id = NEW.id;
    IF v_item_count = 0 THEN
      RAISE EXCEPTION 'Version must contain at least one item before leaving draft';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_cptv_validate_status_transition
  BEFORE UPDATE ON commercial_price_table_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cptv_validate_status_transition();

-- ============================================================
-- 5. VERSION IMMUTABILITY (sections 25-26)
-- ============================================================
-- Draft versions are fully editable. Non-draft versions are immutable outside
-- controlled RPCs; RPCs may only touch workflow/actor/temporal-close fields.

CREATE OR REPLACE FUNCTION public.fn_cptv_protect_published_fields()
RETURNS trigger AS $$
DECLARE
  v_is_rpc boolean;
BEGIN
  v_is_rpc := COALESCE((current_setting('app.commercial_price_rpc_active', true) = 'true'), false);

  -- Draft: fully editable
  IF OLD.status = 'draft' THEN
    RETURN NEW;
  END IF;

  -- Non-draft via controlled RPC: allow only workflow/actor/temporal-close fields
  IF v_is_rpc THEN
    IF NEW.commercial_price_table_id IS DISTINCT FROM OLD.commercial_price_table_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.version_number IS DISTINCT FROM OLD.version_number
       OR NEW.valid_from IS DISTINCT FROM OLD.valid_from
       OR NEW.version_label IS DISTINCT FROM OLD.version_label
       OR NEW.notes IS DISTINCT FROM OLD.notes
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

CREATE TRIGGER trg_cptv_protect_published
  BEFORE UPDATE ON commercial_price_table_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cptv_protect_published_fields();

-- ============================================================
-- 6. HARD DELETE GUARDS (section 53)
-- ============================================================

-- Versions: only draft versions may be hard deleted
CREATE OR REPLACE FUNCTION public.fn_cptv_delete_guard()
RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'Cannot hard delete non-draft version (status %)', OLD.status;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cptv_delete_guard
  BEFORE DELETE ON commercial_price_table_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cptv_delete_guard();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cptv_org ON commercial_price_table_versions(organization_id);
CREATE INDEX IF NOT EXISTS idx_cptv_table ON commercial_price_table_versions(commercial_price_table_id);
CREATE INDEX IF NOT EXISTS idx_cptv_status ON commercial_price_table_versions(commercial_price_table_id, status);
CREATE INDEX IF NOT EXISTS idx_cptv_validity ON commercial_price_table_versions(commercial_price_table_id, valid_from, valid_to);

-- ============================================================
-- 7. commercial_price_items — explicit frozen price per catalog item
-- ============================================================
CREATE TABLE IF NOT EXISTS commercial_price_items (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                 uuid NOT NULL REFERENCES organizations(id),
  commercial_price_table_version_id uuid NOT NULL REFERENCES commercial_price_table_versions(id) ON DELETE CASCADE,

  catalog_item_id                 uuid NOT NULL REFERENCES catalog_items(id),

  price_amount                    numeric(14,4) NOT NULL CHECK (price_amount >= 0),
  currency                        char(3) NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),

  item_code_snapshot              text NOT NULL,
  item_name_snapshot              text NOT NULL,
  item_type_snapshot              text NOT NULL,

  origin_type                     text NOT NULL
                                  CHECK (origin_type IN ('manual','pricing_engine')),

  source_commercial_price_item_id uuid REFERENCES commercial_price_items(id) ON DELETE RESTRICT,

  -- Provenance (section 20): engine-derived items preserve reproducible lineage.
  source_reference_date           date,
  source_supplier_company_id      uuid REFERENCES companies(id) ON DELETE RESTRICT,
  source_cost_table_id            uuid REFERENCES supplier_cost_tables(id) ON DELETE RESTRICT,
  source_cost_version_id          uuid REFERENCES supplier_cost_table_versions(id) ON DELETE RESTRICT,
  source_cost_version_number      integer,
  source_pricing_policy_id        uuid REFERENCES pricing_policies(id) ON DELETE RESTRICT,
  source_pricing_policy_version_id uuid REFERENCES pricing_policy_versions(id) ON DELETE RESTRICT,
  source_policy_version_number    integer,
  source_calculated_price         numeric(14,4),
  source_total_cost               numeric(14,4),
  source_margin_rate              numeric(9,6),
  source_markup_rate              numeric(9,6),
  source_effective_price          numeric(14,4),

  pricing_snapshot                jsonb,

  created_by                      uuid NOT NULL REFERENCES auth.users(id),
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_by                      uuid NOT NULL REFERENCES auth.users(id),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE commercial_price_items IS
  'Preço comercial explícito e congelado de um item de catálogo numa versão de tabela. Snapshot do catálogo e proveniência preservam história.';

-- One catalog item appears at most once per version (section 38)
CREATE UNIQUE INDEX idx_cpi_unique_item
  ON commercial_price_items(commercial_price_table_version_id, catalog_item_id);

-- Engine-derived items must carry minimum provenance (section 34):
-- manual items work without engine provenance (no naive CHECK forcing NULLs).
ALTER TABLE commercial_price_items
  ADD CONSTRAINT chk_cpi_engine_provenance CHECK (
    origin_type <> 'pricing_engine'
    OR (source_reference_date IS NOT NULL
        AND source_supplier_company_id IS NOT NULL
        AND source_cost_version_id IS NOT NULL
        AND source_pricing_policy_version_id IS NOT NULL
        AND source_effective_price IS NOT NULL)
  );

-- Cross-org integrity: version must belong to the SAME org
CREATE OR REPLACE FUNCTION public.fn_cpi_version_same_org()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM commercial_price_table_versions
    WHERE id = NEW.commercial_price_table_version_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'commercial_price_table_version_id does not belong to organization_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpi_version_same_org
  BEFORE INSERT OR UPDATE ON commercial_price_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpi_version_same_org();

-- Cross-org integrity: catalog item must belong to the SAME org
CREATE OR REPLACE FUNCTION public.fn_cpi_catalog_same_org()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM catalog_items
    WHERE id = NEW.catalog_item_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'catalog_item_id does not belong to organization_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpi_catalog_same_org
  BEFORE INSERT OR UPDATE ON commercial_price_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpi_catalog_same_org();

-- New additions require an ACTIVE catalog item (section 40); historical rows
-- referencing later-inactivated items remain valid.
CREATE OR REPLACE FUNCTION public.fn_cpi_active_catalog_item()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.catalog_item_id IS DISTINCT FROM OLD.catalog_item_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM catalog_items
      WHERE id = NEW.catalog_item_id
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'New commercial price items require an active catalog item';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpi_active_catalog_item
  BEFORE INSERT OR UPDATE ON commercial_price_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpi_active_catalog_item();

-- Server-derived catalog snapshot (section 23): item_code/name/type always come
-- from the catalog at insert/update time — never trusted from the client.
CREATE OR REPLACE FUNCTION public.fn_cpi_snapshot_derive()
RETURNS trigger AS $$
DECLARE
  v_catalog record;
BEGIN
  SELECT code, name, item_type INTO v_catalog
  FROM catalog_items
  WHERE id = NEW.catalog_item_id;

  IF v_catalog IS NULL THEN
    RAISE EXCEPTION 'catalog_item_id not found';
  END IF;

  NEW.item_code_snapshot := v_catalog.code;
  NEW.item_name_snapshot := v_catalog.name;
  NEW.item_type_snapshot := v_catalog.item_type;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpi_snapshot_derive
  BEFORE INSERT OR UPDATE ON commercial_price_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpi_snapshot_derive();

-- Items may be inserted/updated/deleted only while the parent version is draft
-- (section 25). Parent being cascade-deleted (v_status NULL) is allowed.
CREATE OR REPLACE FUNCTION public.fn_cpi_parent_draft()
RETURNS trigger AS $$
DECLARE
  v_version_id uuid;
  v_status     text;
BEGIN
  v_version_id := COALESCE(NEW.commercial_price_table_version_id, OLD.commercial_price_table_version_id);

  SELECT status INTO v_status
  FROM commercial_price_table_versions
  WHERE id = v_version_id;

  IF v_status IS NULL THEN
    -- Parent removed by cascade delete → allow
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Cannot modify commercial price items of version with status % (only draft allowed)', v_status;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpi_parent_draft
  BEFORE INSERT OR UPDATE OR DELETE ON commercial_price_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpi_parent_draft();

-- Provenance integrity (sections 20-21, 39, 54): source references must belong
-- to the SAME org and be mutually consistent. FKs already carry ON DELETE RESTRICT.
CREATE OR REPLACE FUNCTION public.fn_cpi_provenance_same_org()
RETURNS trigger AS $$
BEGIN
  IF NEW.source_supplier_company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM companies
      WHERE id = NEW.source_supplier_company_id
        AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'source_supplier_company_id does not belong to organization_id';
    END IF;
  END IF;

  IF NEW.source_cost_table_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM supplier_cost_tables
      WHERE id = NEW.source_cost_table_id
        AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'source_cost_table_id does not belong to organization_id';
    END IF;
    IF NEW.source_supplier_company_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM supplier_cost_tables
         WHERE id = NEW.source_cost_table_id
           AND supplier_company_id = NEW.source_supplier_company_id
       ) THEN
      RAISE EXCEPTION 'source_cost_table_id does not match source_supplier_company_id';
    END IF;
  END IF;

  IF NEW.source_cost_version_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM supplier_cost_table_versions
      WHERE id = NEW.source_cost_version_id
        AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'source_cost_version_id does not belong to organization_id';
    END IF;
    IF NEW.source_cost_table_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM supplier_cost_table_versions
         WHERE id = NEW.source_cost_version_id
           AND cost_table_id = NEW.source_cost_table_id
       ) THEN
      RAISE EXCEPTION 'source_cost_version_id does not match source_cost_table_id';
    END IF;
  END IF;

  IF NEW.source_pricing_policy_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pricing_policies
      WHERE id = NEW.source_pricing_policy_id
        AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'source_pricing_policy_id does not belong to organization_id';
    END IF;
  END IF;

  IF NEW.source_pricing_policy_version_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pricing_policy_versions
      WHERE id = NEW.source_pricing_policy_version_id
        AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'source_pricing_policy_version_id does not belong to organization_id';
    END IF;
    IF NEW.source_pricing_policy_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM pricing_policy_versions
         WHERE id = NEW.source_pricing_policy_version_id
           AND pricing_policy_id = NEW.source_pricing_policy_id
       ) THEN
      RAISE EXCEPTION 'source_pricing_policy_version_id does not match source_pricing_policy_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpi_provenance_same_org
  BEFORE INSERT OR UPDATE ON commercial_price_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpi_provenance_same_org();

-- Lineage (sections 28-29): no self-reference, no cross-org, same commercial table.
CREATE OR REPLACE FUNCTION public.fn_cpi_lineage_integrity()
RETURNS trigger AS $$
DECLARE
  v_src_org     uuid;
  v_src_table   uuid;
  v_new_table   uuid;
BEGIN
  IF NEW.source_commercial_price_item_id IS NOT NULL THEN
    IF NEW.id IS NOT NULL AND NEW.source_commercial_price_item_id = NEW.id THEN
      RAISE EXCEPTION 'Lineage cannot reference the item itself';
    END IF;

    SELECT cpi.organization_id, cptv.commercial_price_table_id
    INTO v_src_org, v_src_table
    FROM commercial_price_items cpi
    JOIN commercial_price_table_versions cptv ON cptv.id = cpi.commercial_price_table_version_id
    WHERE cpi.id = NEW.source_commercial_price_item_id;

    IF v_src_org IS NULL THEN
      RAISE EXCEPTION 'source_commercial_price_item_id not found';
    END IF;
    IF v_src_org <> NEW.organization_id THEN
      RAISE EXCEPTION 'Lineage must reference an item of the same organization';
    END IF;

    SELECT commercial_price_table_id INTO v_new_table
    FROM commercial_price_table_versions
    WHERE id = NEW.commercial_price_table_version_id;

    IF v_src_table IS DISTINCT FROM v_new_table THEN
      RAISE EXCEPTION 'Lineage must reference an item of the same commercial price table';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpi_lineage_integrity
  BEFORE INSERT OR UPDATE ON commercial_price_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpi_lineage_integrity();

-- Server-derived actor: created_by/updated_by always from auth.uid()
CREATE OR REPLACE FUNCTION public.fn_cpi_actor()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := v_user_id;
    NEW.updated_by := v_user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := v_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpi_actor
  BEFORE INSERT OR UPDATE ON commercial_price_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpi_actor();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cpi_org ON commercial_price_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpi_version ON commercial_price_items(commercial_price_table_version_id);
CREATE INDEX IF NOT EXISTS idx_cpi_catalog_item ON commercial_price_items(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_cpi_origin ON commercial_price_items(commercial_price_table_version_id, origin_type);
CREATE INDEX IF NOT EXISTS idx_cpi_source_cost_version ON commercial_price_items(source_cost_version_id)
  WHERE source_cost_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpi_source_policy_version ON commercial_price_items(source_pricing_policy_version_id)
  WHERE source_pricing_policy_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpi_source_lineage ON commercial_price_items(source_commercial_price_item_id)
  WHERE source_commercial_price_item_id IS NOT NULL;

CREATE TRIGGER trg_commercial_price_items_updated_at
  BEFORE UPDATE ON commercial_price_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 8. commercial_price_exceptions — dedicated exception records (DEC-051)
-- ============================================================
CREATE TABLE IF NOT EXISTS commercial_price_exceptions (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                 uuid NOT NULL REFERENCES organizations(id),
  commercial_price_table_version_id uuid NOT NULL REFERENCES commercial_price_table_versions(id) ON DELETE RESTRICT,
  commercial_price_item_id        uuid NOT NULL REFERENCES commercial_price_items(id) ON DELETE RESTRICT,

  violation_code                  text NOT NULL
                                  CHECK (violation_code IN (
                                    'BELOW_COST','BELOW_MINIMUM_MARGIN','COMMERCIAL_DEVIATION'
                                  )),
  status                          text NOT NULL DEFAULT 'requested'
                                  CHECK (status IN ('requested','approved','denied')),
  reason                          text NOT NULL,

  requested_by                    uuid NOT NULL REFERENCES auth.users(id),
  requested_at                    timestamptz NOT NULL DEFAULT now(),

  decided_by                      uuid REFERENCES auth.users(id),
  decided_at                      timestamptz
);

COMMENT ON TABLE commercial_price_exceptions IS
  'Registro de exceção comercial auditável (DEC-051): item + código de violação + status do pedido. Append-only.';

-- One exception request per item per violation code
CREATE UNIQUE INDEX idx_cpe_unique_item_code
  ON commercial_price_exceptions(commercial_price_item_id, violation_code);

-- Integrity: same-org version/item and item↔version consistency
CREATE OR REPLACE FUNCTION public.fn_cpe_integrity()
RETURNS trigger AS $$
DECLARE
  v_item_org     uuid;
  v_item_version uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM commercial_price_table_versions
    WHERE id = NEW.commercial_price_table_version_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'commercial_price_table_version_id does not belong to organization_id';
  END IF;

  SELECT organization_id, commercial_price_table_version_id
  INTO v_item_org, v_item_version
  FROM commercial_price_items
  WHERE id = NEW.commercial_price_item_id;

  IF v_item_org IS NULL THEN
    RAISE EXCEPTION 'commercial_price_item_id not found';
  END IF;
  IF v_item_org <> NEW.organization_id THEN
    RAISE EXCEPTION 'commercial_price_item_id does not belong to organization_id';
  END IF;
  IF v_item_version IS DISTINCT FROM NEW.commercial_price_table_version_id THEN
    RAISE EXCEPTION 'commercial_price_item_id does not belong to commercial_price_table_version_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpe_integrity
  BEFORE INSERT OR UPDATE ON commercial_price_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpe_integrity();

-- Status workflow: created as 'requested' with server-derived requester;
-- direct requested → approved/denied UPDATE is blocked unless a controlled RPC
-- sets app.commercial_price_rpc_active. Decided states are terminal.
CREATE OR REPLACE FUNCTION public.fn_cpe_status_transition()
RETURNS trigger AS $$
DECLARE
  v_is_rpc  boolean;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'requested' THEN
      RAISE EXCEPTION 'Exceptions must be created with status requested';
    END IF;
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    NEW.requested_by := v_user_id;
    NEW.requested_at := COALESCE(NEW.requested_at, now());
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    -- non-decision updates (e.g. reason) flow through RLS
    RETURN NEW;
  END IF;

  IF OLD.status IN ('approved','denied') THEN
    RAISE EXCEPTION 'Cannot change status of a decided exception';
  END IF;

  v_is_rpc := COALESCE((current_setting('app.commercial_price_rpc_active', true) = 'true'), false);

  IF OLD.status = 'requested' AND NEW.status IN ('approved','denied') THEN
    IF NOT v_is_rpc THEN
      RAISE EXCEPTION 'Exception decisions must go through the corresponding RPC function';
    END IF;
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT has_permission('pricing.commercial.exception_approve', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for exception decision (requires pricing.commercial.exception_approve)';
    END IF;
    NEW.decided_by := v_user_id;
    NEW.decided_at := now();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid exception status transition: % → %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_cpe_status_transition
  BEFORE INSERT OR UPDATE ON commercial_price_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpe_status_transition();

-- Append-only: exceptions can never be hard deleted (audit preservation)
CREATE OR REPLACE FUNCTION public.fn_cpe_delete_guard()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Commercial price exceptions are append-only records and cannot be deleted';
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cpe_delete_guard
  BEFORE DELETE ON commercial_price_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cpe_delete_guard();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cpe_org ON commercial_price_exceptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpe_version ON commercial_price_exceptions(commercial_price_table_version_id);
CREATE INDEX IF NOT EXISTS idx_cpe_item ON commercial_price_exceptions(commercial_price_item_id);
CREATE INDEX IF NOT EXISTS idx_cpe_status ON commercial_price_exceptions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_cpe_violation ON commercial_price_exceptions(commercial_price_table_version_id, violation_code);

-- ============================================================
-- 9. INTERNAL HELPER REVOKES (section 59)
-- ============================================================
-- Integrity/helper functions are internal — never exposed to anonymous
-- clients. NOTE: EXECUTE stays with `authenticated` (Supabase default
-- privileges grant it at creation); revoking it would break the triggers,
-- which run with the privileges of the performing role. This mirrors the
-- established convention in 022/023/027 (revoke PUBLIC + anon only).
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
        'fn_normalize_commercial_code',
        'fn_cpt_normalize_code','fn_cpt_actor','fn_cpt_delete_guard',
        'fn_cptv_table_same_org','fn_cptv_actor',
        'fn_cptv_validate_status_transition','fn_cptv_protect_published_fields',
        'fn_cptv_delete_guard',
        'fn_cpi_version_same_org','fn_cpi_catalog_same_org',
        'fn_cpi_active_catalog_item','fn_cpi_snapshot_derive',
        'fn_cpi_parent_draft','fn_cpi_provenance_same_org',
        'fn_cpi_lineage_integrity','fn_cpi_actor',
        'fn_cpe_integrity','fn_cpe_status_transition','fn_cpe_delete_guard'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      v_rec.proname, v_rec.args
    );
  END LOOP;
END $$;