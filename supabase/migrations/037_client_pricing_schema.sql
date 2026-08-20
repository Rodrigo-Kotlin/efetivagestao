-- PRC-06B: Client pricing schema and structural integrity.
-- Spec: docs/CLIENT_PRICING.md. Migrations 001-036 are immutable.
--
-- This migration intentionally contains no permissions, RLS policies, audit
-- triggers, workflow RPCs or resolvers. RLS is enabled without policies so the
-- new relations remain fail-closed until the application security layer lands.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Composite candidate keys make tenant consistency durable even if a parent
-- row is updated after client-pricing history exists.
ALTER TABLE public.companies
  ADD CONSTRAINT uq_companies_id_organization UNIQUE (id, organization_id);
ALTER TABLE public.catalog_items
  ADD CONSTRAINT uq_catalog_items_id_organization UNIQUE (id, organization_id);
ALTER TABLE public.commercial_price_tables
  ADD CONSTRAINT uq_commercial_price_tables_id_organization UNIQUE (id, organization_id);
ALTER TABLE public.commercial_price_table_versions
  ADD CONSTRAINT uq_commercial_price_versions_identity_org
  UNIQUE (id, commercial_price_table_id, organization_id);
ALTER TABLE public.commercial_price_items
  ADD CONSTRAINT uq_commercial_price_items_provenance_identity
  UNIQUE (
    id, commercial_price_table_version_id, catalog_item_id,
    organization_id, price_amount
  );

-- ============================================================
-- 1. CLIENT ROLE PROFILE
-- ============================================================

CREATE TABLE public.client_profiles (
  company_id        uuid PRIMARY KEY
                    REFERENCES public.companies(id) ON DELETE RESTRICT,
  organization_id   uuid NOT NULL
                    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'blocked')),
  commercial_notes  text,
  status_reason     text,
  created_by        uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_client_profiles_company_organization
    UNIQUE (company_id, organization_id),
  CONSTRAINT fk_client_profiles_company_organization
    FOREIGN KEY (company_id, organization_id)
    REFERENCES public.companies(id, organization_id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.client_profiles IS
  'Tenant-scoped client role for a company; corporate identity remains in companies.';

CREATE INDEX idx_client_profiles_org
  ON public.client_profiles (organization_id);
CREATE INDEX idx_client_profiles_status
  ON public.client_profiles (organization_id, status);

-- ============================================================
-- 2. CLIENT COMMERCIAL TABLE ASSIGNMENTS
-- ============================================================

CREATE TABLE public.client_commercial_table_assignments (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            uuid NOT NULL
                             REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_company_id          uuid NOT NULL
                             REFERENCES public.client_profiles(company_id) ON DELETE RESTRICT,
  commercial_price_table_id  uuid NOT NULL
                             REFERENCES public.commercial_price_tables(id) ON DELETE RESTRICT,
  status                     text NOT NULL DEFAULT 'draft'
                             CHECK (status IN (
                               'draft', 'under_review', 'approved', 'scheduled',
                               'active', 'superseded', 'cancelled'
                             )),
  valid_from                 date NOT NULL,
  valid_to                   date,
  contract_reference         text,
  notes                      text,

  created_by                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_by                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  submitted_by               uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  submitted_at               timestamptz,
  approved_by                uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at                timestamptz,
  published_by               uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  published_at               timestamptz,
  superseded_by              uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  superseded_at              timestamptz,
  cancelled_by               uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  cancelled_at               timestamptz,

  CONSTRAINT chk_client_assignment_validity
    CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT chk_client_assignment_actor_pairs CHECK (
    (submitted_by IS NULL) = (submitted_at IS NULL)
    AND (approved_by IS NULL) = (approved_at IS NULL)
    AND (published_by IS NULL) = (published_at IS NULL)
    AND (superseded_by IS NULL) = (superseded_at IS NULL)
    AND (cancelled_by IS NULL) = (cancelled_at IS NULL)
  ),
  CONSTRAINT chk_client_assignment_workflow_metadata CHECK (
    (status NOT IN ('under_review', 'approved', 'scheduled', 'active', 'superseded')
      OR submitted_by IS NOT NULL)
    AND (status NOT IN ('approved', 'scheduled', 'active', 'superseded')
      OR approved_by IS NOT NULL)
    AND (status NOT IN ('scheduled', 'active', 'superseded')
      OR published_by IS NOT NULL)
    AND (status <> 'superseded' OR superseded_by IS NOT NULL)
    AND (status <> 'cancelled' OR cancelled_by IS NOT NULL)
  ),
  CONSTRAINT fk_client_assignment_profile_organization
    FOREIGN KEY (client_company_id, organization_id)
    REFERENCES public.client_profiles(company_id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT fk_client_assignment_table_organization
    FOREIGN KEY (commercial_price_table_id, organization_id)
    REFERENCES public.commercial_price_tables(id, organization_id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.client_commercial_table_assignments IS
  'Temporal [) assignment of one stable commercial price table to a client.';

ALTER TABLE public.client_commercial_table_assignments
  ADD CONSTRAINT ex_client_assignment_active_scheduled_no_overlap
  EXCLUDE USING gist (
    organization_id WITH =,
    client_company_id WITH =,
    daterange(valid_from, valid_to, '[)') WITH &&
  )
  WHERE (status IN ('active', 'scheduled'))
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_client_assignments_org_client
  ON public.client_commercial_table_assignments
    (organization_id, client_company_id);
CREATE INDEX idx_client_assignments_resolve
  ON public.client_commercial_table_assignments
    (organization_id, client_company_id, valid_from DESC, valid_to)
  WHERE status IN ('active', 'scheduled', 'superseded');
CREATE INDEX idx_client_assignments_table
  ON public.client_commercial_table_assignments (commercial_price_table_id);
CREATE INDEX idx_client_assignments_status
  ON public.client_commercial_table_assignments (organization_id, status);

-- ============================================================
-- 3. EXPLICIT CLIENT ITEM PRICE OVERRIDES
-- ============================================================

CREATE TABLE public.client_price_overrides (
  id                                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                            uuid NOT NULL
                                              REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_company_id                          uuid NOT NULL
                                              REFERENCES public.client_profiles(company_id) ON DELETE RESTRICT,
  catalog_item_id                            uuid NOT NULL
                                              REFERENCES public.catalog_items(id) ON DELETE RESTRICT,
  price_amount                               numeric(14,4) NOT NULL
                                              CHECK (price_amount >= 0),
  currency                                   char(3) NOT NULL DEFAULT 'BRL'
                                              CHECK (currency = 'BRL'),
  reason                                     text NOT NULL
                                              CHECK (btrim(reason) <> ''),
  status                                     text NOT NULL DEFAULT 'draft'
                                              CHECK (status IN (
                                                'draft', 'under_review', 'approved', 'scheduled',
                                                'active', 'superseded', 'cancelled'
                                              )),
  valid_from                                 date NOT NULL,
  valid_to                                   date,

  item_code_snapshot                         text NOT NULL,
  item_name_snapshot                         text NOT NULL,
  item_type_snapshot                         text NOT NULL,

  source_reference_date                      date,
  source_commercial_price_table_id           uuid
                                              REFERENCES public.commercial_price_tables(id)
                                              ON DELETE RESTRICT,
  source_commercial_price_table_version_id   uuid
                                              REFERENCES public.commercial_price_table_versions(id)
                                              ON DELETE RESTRICT,
  source_commercial_price_item_id            uuid
                                              REFERENCES public.commercial_price_items(id)
                                              ON DELETE RESTRICT,
  source_table_price_amount                  numeric(14,4),

  created_by                                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at                                 timestamptz NOT NULL DEFAULT now(),
  updated_by                                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at                                 timestamptz NOT NULL DEFAULT now(),
  submitted_by                               uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  submitted_at                               timestamptz,
  approved_by                                uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at                                timestamptz,
  published_by                               uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  published_at                               timestamptz,
  superseded_by                              uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  superseded_at                              timestamptz,
  cancelled_by                               uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  cancelled_at                               timestamptz,

  CONSTRAINT chk_client_override_validity
    CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT chk_client_override_source_amount
    CHECK (source_table_price_amount IS NULL OR source_table_price_amount >= 0),
  CONSTRAINT chk_client_override_provenance_all_or_none CHECK (
    num_nonnulls(
      source_reference_date,
      source_commercial_price_table_id,
      source_commercial_price_table_version_id,
      source_commercial_price_item_id,
      source_table_price_amount
    ) IN (0, 5)
  ),
  CONSTRAINT chk_client_override_actor_pairs CHECK (
    (submitted_by IS NULL) = (submitted_at IS NULL)
    AND (approved_by IS NULL) = (approved_at IS NULL)
    AND (published_by IS NULL) = (published_at IS NULL)
    AND (superseded_by IS NULL) = (superseded_at IS NULL)
    AND (cancelled_by IS NULL) = (cancelled_at IS NULL)
  ),
  CONSTRAINT chk_client_override_workflow_metadata CHECK (
    (status NOT IN ('under_review', 'approved', 'scheduled', 'active', 'superseded')
      OR submitted_by IS NOT NULL)
    AND (status NOT IN ('approved', 'scheduled', 'active', 'superseded')
      OR approved_by IS NOT NULL)
    AND (status NOT IN ('scheduled', 'active', 'superseded')
      OR published_by IS NOT NULL)
    AND (status <> 'superseded' OR superseded_by IS NOT NULL)
    AND (status <> 'cancelled' OR cancelled_by IS NOT NULL)
  ),
  CONSTRAINT fk_client_override_profile_organization
    FOREIGN KEY (client_company_id, organization_id)
    REFERENCES public.client_profiles(company_id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT fk_client_override_item_organization
    FOREIGN KEY (catalog_item_id, organization_id)
    REFERENCES public.catalog_items(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT fk_client_override_source_table_organization
    FOREIGN KEY (source_commercial_price_table_id, organization_id)
    REFERENCES public.commercial_price_tables(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT fk_client_override_source_version_identity
    FOREIGN KEY (
      source_commercial_price_table_version_id,
      source_commercial_price_table_id,
      organization_id
    ) REFERENCES public.commercial_price_table_versions(
      id, commercial_price_table_id, organization_id
    ) ON DELETE RESTRICT,
  CONSTRAINT fk_client_override_source_item_identity
    FOREIGN KEY (
      source_commercial_price_item_id,
      source_commercial_price_table_version_id,
      catalog_item_id,
      organization_id,
      source_table_price_amount
    ) REFERENCES public.commercial_price_items(
      id, commercial_price_table_version_id, catalog_item_id,
      organization_id, price_amount
    ) ON DELETE RESTRICT
);

COMMENT ON TABLE public.client_price_overrides IS
  'Explicit frozen BRL price for one client and catalog item over a [) validity range.';

ALTER TABLE public.client_price_overrides
  ADD CONSTRAINT ex_client_override_active_scheduled_no_overlap
  EXCLUDE USING gist (
    organization_id WITH =,
    client_company_id WITH =,
    catalog_item_id WITH =,
    daterange(valid_from, valid_to, '[)') WITH &&
  )
  WHERE (status IN ('active', 'scheduled'))
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_client_overrides_org_client_item
  ON public.client_price_overrides
    (organization_id, client_company_id, catalog_item_id);
CREATE INDEX idx_client_overrides_resolve
  ON public.client_price_overrides
    (organization_id, client_company_id, catalog_item_id, valid_from DESC, valid_to)
  WHERE status IN ('active', 'scheduled', 'superseded');
CREATE INDEX idx_client_overrides_catalog_item
  ON public.client_price_overrides (catalog_item_id);
CREATE INDEX idx_client_overrides_status
  ON public.client_price_overrides (organization_id, status);
CREATE INDEX idx_client_overrides_source_table_version
  ON public.client_price_overrides (source_commercial_price_table_version_id)
  WHERE source_commercial_price_table_version_id IS NOT NULL;
CREATE INDEX idx_client_overrides_source_item
  ON public.client_price_overrides (source_commercial_price_item_id)
  WHERE source_commercial_price_item_id IS NOT NULL;

-- ============================================================
-- 4. PROFILE INTEGRITY AND SERVER-DERIVED METADATA
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_client_profile_integrity()
RETURNS trigger AS $$
DECLARE
  v_actor          uuid;
  v_is_rpc         boolean;
  v_company_org    uuid;
  v_company_status text;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT organization_id, status INTO v_company_org, v_company_status
  FROM public.companies
  WHERE id = NEW.company_id;

  IF v_company_org IS NULL THEN
    RAISE EXCEPTION 'company_id not found';
  END IF;
  IF v_company_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'client profile company must belong to organization_id';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_company_status <> 'active' THEN
      RAISE EXCEPTION 'New client profiles require an active company';
    END IF;
    NEW.status := 'active';
    NEW.status_reason := NULL;
    NEW.created_by := v_actor;
    NEW.created_at := now();
    NEW.updated_by := v_actor;
    NEW.updated_at := NEW.created_at;
    RETURN NEW;
  END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Client profile identity and creation metadata are immutable';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_is_rpc := COALESCE(
      current_setting('app.client_pricing_rpc_active', true) = 'true', false
    );
    IF NOT v_is_rpc THEN
      RAISE EXCEPTION 'Client profile status changes require a controlled client-pricing RPC';
    END IF;
    IF NEW.status = 'active' AND v_company_status <> 'active' THEN
      RAISE EXCEPTION 'An active client profile requires an active company';
    END IF;
    IF NEW.status_reason IS NULL OR btrim(NEW.status_reason) = '' THEN
      RAISE EXCEPTION 'Client profile status changes require a non-empty status_reason';
    END IF;
    IF NEW.status_reason IS NOT DISTINCT FROM OLD.status_reason THEN
      RAISE EXCEPTION 'Client profile status changes require a new status_reason';
    END IF;
  ELSIF NEW.status_reason IS DISTINCT FROM OLD.status_reason THEN
    RAISE EXCEPTION 'status_reason may change only with client profile status';
  END IF;

  NEW.updated_by := v_actor;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_client_profile_integrity
  BEFORE INSERT OR UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_client_profile_integrity();

-- ============================================================
-- 5. ASSIGNMENT LIFECYCLE, ELIGIBILITY AND IMMUTABILITY
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_client_assignment_integrity()
RETURNS trigger AS $$
DECLARE
  v_actor               uuid;
  v_is_rpc              boolean;
  v_company_org         uuid;
  v_company_status      text;
  v_profile_org         uuid;
  v_profile_status      text;
  v_table_org           uuid;
  v_table_status        text;
  v_require_eligibility boolean := false;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  v_is_rpc := COALESCE(
    current_setting('app.client_pricing_rpc_active', true) = 'true', false
  );

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'New client assignments must start in draft status';
    END IF;
    NEW.created_by := v_actor;
    NEW.created_at := now();
    NEW.updated_by := v_actor;
    NEW.updated_at := NEW.created_at;
    NEW.submitted_by := NULL;
    NEW.submitted_at := NULL;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.published_by := NULL;
    NEW.published_at := NULL;
    NEW.superseded_by := NULL;
    NEW.superseded_at := NULL;
    NEW.cancelled_by := NULL;
    NEW.cancelled_at := NULL;
    v_require_eligibility := true;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Assignment identity and creation metadata are immutable';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT v_is_rpc THEN
        RAISE EXCEPTION 'Assignment status changes require a controlled client-pricing RPC';
      END IF;

      IF NOT (
        (OLD.status = 'draft' AND NEW.status IN ('under_review', 'cancelled'))
        OR (OLD.status = 'under_review' AND NEW.status IN ('draft', 'approved', 'cancelled'))
        OR (OLD.status = 'approved' AND NEW.status IN ('active', 'scheduled', 'cancelled'))
        OR (OLD.status = 'scheduled' AND NEW.status = 'active')
        OR (OLD.status = 'active' AND NEW.status = 'superseded')
      ) THEN
        RAISE EXCEPTION 'Invalid assignment status transition: % -> %', OLD.status, NEW.status;
      END IF;

      -- A transition cannot smuggle edits; only valid_to may be closed by a
      -- trusted publication/cutover transaction.
      IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
         OR NEW.client_company_id IS DISTINCT FROM OLD.client_company_id
         OR NEW.commercial_price_table_id IS DISTINCT FROM OLD.commercial_price_table_id
         OR NEW.valid_from IS DISTINCT FROM OLD.valid_from
         OR NEW.contract_reference IS DISTINCT FROM OLD.contract_reference
         OR NEW.notes IS DISTINCT FROM OLD.notes THEN
        RAISE EXCEPTION 'Assignment business fields cannot change during a status transition';
      END IF;

      IF NEW.valid_to IS DISTINCT FROM OLD.valid_to THEN
        IF NOT (
          (OLD.status = 'active' AND NEW.status = 'superseded')
          OR (OLD.status = 'approved' AND NEW.status IN ('active', 'scheduled'))
        ) THEN
          RAISE EXCEPTION 'Assignment valid_to may change during transition only for monotonic publication or supersession';
        END IF;
        IF NEW.valid_to IS NULL
           OR NEW.valid_to <= NEW.valid_from
           OR (OLD.valid_to IS NOT NULL AND NEW.valid_to >= OLD.valid_to) THEN
          RAISE EXCEPTION 'Assignment valid_to transition must close the range monotonically';
        END IF;
      END IF;

      NEW.updated_by := OLD.updated_by;
      NEW.updated_at := OLD.updated_at;
      NEW.submitted_by := OLD.submitted_by;
      NEW.submitted_at := OLD.submitted_at;
      NEW.approved_by := OLD.approved_by;
      NEW.approved_at := OLD.approved_at;
      NEW.published_by := OLD.published_by;
      NEW.published_at := OLD.published_at;
      NEW.superseded_by := OLD.superseded_by;
      NEW.superseded_at := OLD.superseded_at;
      NEW.cancelled_by := OLD.cancelled_by;
      NEW.cancelled_at := OLD.cancelled_at;

      IF OLD.status = 'draft' AND NEW.status = 'under_review' THEN
        NEW.submitted_by := v_actor;
        NEW.submitted_at := now();
        v_require_eligibility := true;
      ELSIF OLD.status = 'under_review' AND NEW.status = 'approved' THEN
        NEW.approved_by := v_actor;
        NEW.approved_at := now();
        v_require_eligibility := true;
      ELSIF OLD.status = 'approved' AND NEW.status IN ('active', 'scheduled') THEN
        IF NEW.valid_from < current_date THEN
          RAISE EXCEPTION 'Retroactive assignment publication is not allowed';
        END IF;
        IF NEW.status = 'active' AND NEW.valid_from <> current_date THEN
          RAISE EXCEPTION 'An active publication must start on current_date';
        END IF;
        IF NEW.status = 'scheduled' AND NEW.valid_from <= current_date THEN
          RAISE EXCEPTION 'A scheduled publication must start after current_date';
        END IF;
        NEW.published_by := v_actor;
        NEW.published_at := now();
        v_require_eligibility := true;
      ELSIF OLD.status = 'scheduled' AND NEW.status = 'active' THEN
        IF NEW.valid_from > current_date THEN
          RAISE EXCEPTION 'A scheduled assignment cannot activate before valid_from';
        END IF;
      ELSIF OLD.status = 'active' AND NEW.status = 'superseded' THEN
        IF NEW.valid_to IS NULL OR NEW.valid_to > current_date THEN
          RAISE EXCEPTION 'An active assignment can be superseded only after its range closes';
        END IF;
        NEW.superseded_by := v_actor;
        NEW.superseded_at := now();
      ELSIF NEW.status = 'cancelled' THEN
        NEW.cancelled_by := v_actor;
        NEW.cancelled_at := now();
      END IF;
    ELSIF OLD.status = 'draft' THEN
      IF NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
         OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
         OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
         OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
         OR NEW.published_by IS DISTINCT FROM OLD.published_by
         OR NEW.published_at IS DISTINCT FROM OLD.published_at
         OR NEW.superseded_by IS DISTINCT FROM OLD.superseded_by
         OR NEW.superseded_at IS DISTINCT FROM OLD.superseded_at
         OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
         OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
        RAISE EXCEPTION 'Assignment workflow metadata is server-derived';
      END IF;
      NEW.updated_by := v_actor;
      NEW.updated_at := now();
      v_require_eligibility :=
        NEW.organization_id IS DISTINCT FROM OLD.organization_id
        OR NEW.client_company_id IS DISTINCT FROM OLD.client_company_id
        OR NEW.commercial_price_table_id IS DISTINCT FROM OLD.commercial_price_table_id;
    ELSE
      IF NOT v_is_rpc THEN
        RAISE EXCEPTION 'Non-draft assignments are immutable outside controlled client-pricing RPCs';
      END IF;
      IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
         OR NEW.client_company_id IS DISTINCT FROM OLD.client_company_id
         OR NEW.commercial_price_table_id IS DISTINCT FROM OLD.commercial_price_table_id
         OR NEW.valid_from IS DISTINCT FROM OLD.valid_from
         OR NEW.contract_reference IS DISTINCT FROM OLD.contract_reference
         OR NEW.notes IS DISTINCT FROM OLD.notes
         OR NEW.updated_by IS DISTINCT FROM OLD.updated_by
         OR NEW.updated_at IS DISTINCT FROM OLD.updated_at
         OR NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
         OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
         OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
         OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
         OR NEW.published_by IS DISTINCT FROM OLD.published_by
         OR NEW.published_at IS DISTINCT FROM OLD.published_at
         OR NEW.superseded_by IS DISTINCT FROM OLD.superseded_by
         OR NEW.superseded_at IS DISTINCT FROM OLD.superseded_at
         OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
         OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
        RAISE EXCEPTION 'Only controlled valid_to closure is allowed without an assignment transition';
      END IF;
      IF NEW.valid_to IS DISTINCT FROM OLD.valid_to AND (
        OLD.status NOT IN ('active', 'scheduled')
        OR NEW.valid_to IS NULL
        OR NEW.valid_to <= NEW.valid_from
        OR (OLD.valid_to IS NOT NULL AND NEW.valid_to >= OLD.valid_to)
      ) THEN
        RAISE EXCEPTION 'Assignment valid_to can only be shortened monotonically on active or scheduled records';
      END IF;
    END IF;
  END IF;

  SELECT c.organization_id, c.status, cp.organization_id, cp.status
  INTO v_company_org, v_company_status, v_profile_org, v_profile_status
  FROM public.client_profiles cp
  JOIN public.companies c ON c.id = cp.company_id
  WHERE cp.company_id = NEW.client_company_id;

  IF v_profile_org IS NULL THEN
    RAISE EXCEPTION 'client_company_id does not identify a client profile';
  END IF;
  IF v_company_org IS DISTINCT FROM NEW.organization_id
     OR v_profile_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Client and assignment must belong to the same organization';
  END IF;

  SELECT organization_id, status INTO v_table_org, v_table_status
  FROM public.commercial_price_tables
  WHERE id = NEW.commercial_price_table_id;

  IF v_table_org IS NULL THEN
    RAISE EXCEPTION 'commercial_price_table_id not found';
  END IF;
  IF v_table_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Commercial price table and assignment must belong to the same organization';
  END IF;

  IF v_require_eligibility AND (
    v_company_status <> 'active'
    OR v_profile_status <> 'active'
    OR v_table_status <> 'active'
  ) THEN
    RAISE EXCEPTION 'New or advancing assignments require an active company, client profile and commercial price table';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_client_assignment_integrity
  BEFORE INSERT OR UPDATE ON public.client_commercial_table_assignments
  FOR EACH ROW EXECUTE FUNCTION public.fn_client_assignment_integrity();

-- ============================================================
-- 6. OVERRIDE LIFECYCLE, SNAPSHOTS, ELIGIBILITY AND PROVENANCE
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_client_override_integrity()
RETURNS trigger AS $$
DECLARE
  v_actor               uuid;
  v_is_rpc              boolean;
  v_company_org         uuid;
  v_company_status      text;
  v_profile_org         uuid;
  v_profile_status      text;
  v_item_org            uuid;
  v_item_status         text;
  v_item_code           text;
  v_item_name           text;
  v_item_type           text;
  v_require_eligibility boolean := false;
  v_provenance_changed  boolean := false;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  v_is_rpc := COALESCE(
    current_setting('app.client_pricing_rpc_active', true) = 'true', false
  );

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'New client price overrides must start in draft status';
    END IF;
    NEW.created_by := v_actor;
    NEW.created_at := now();
    NEW.updated_by := v_actor;
    NEW.updated_at := NEW.created_at;
    NEW.submitted_by := NULL;
    NEW.submitted_at := NULL;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.published_by := NULL;
    NEW.published_at := NULL;
    NEW.superseded_by := NULL;
    NEW.superseded_at := NULL;
    NEW.cancelled_by := NULL;
    NEW.cancelled_at := NULL;
    v_require_eligibility := true;
    v_provenance_changed := num_nonnulls(
      NEW.source_reference_date,
      NEW.source_commercial_price_table_id,
      NEW.source_commercial_price_table_version_id,
      NEW.source_commercial_price_item_id,
      NEW.source_table_price_amount
    ) > 0;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Override identity and creation metadata are immutable';
    END IF;

    v_provenance_changed := ROW(
      NEW.source_reference_date,
      NEW.source_commercial_price_table_id,
      NEW.source_commercial_price_table_version_id,
      NEW.source_commercial_price_item_id,
      NEW.source_table_price_amount
    ) IS DISTINCT FROM ROW(
      OLD.source_reference_date,
      OLD.source_commercial_price_table_id,
      OLD.source_commercial_price_table_version_id,
      OLD.source_commercial_price_item_id,
      OLD.source_table_price_amount
    );

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT v_is_rpc THEN
        RAISE EXCEPTION 'Override status changes require a controlled client-pricing RPC';
      END IF;
      IF NOT (
        (OLD.status = 'draft' AND NEW.status IN ('under_review', 'cancelled'))
        OR (OLD.status = 'under_review' AND NEW.status IN ('draft', 'approved', 'cancelled'))
        OR (OLD.status = 'approved' AND NEW.status IN ('active', 'scheduled', 'cancelled'))
        OR (OLD.status = 'scheduled' AND NEW.status = 'active')
        OR (OLD.status = 'active' AND NEW.status = 'superseded')
      ) THEN
        RAISE EXCEPTION 'Invalid override status transition: % -> %', OLD.status, NEW.status;
      END IF;

      IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
         OR NEW.client_company_id IS DISTINCT FROM OLD.client_company_id
         OR NEW.catalog_item_id IS DISTINCT FROM OLD.catalog_item_id
         OR NEW.price_amount IS DISTINCT FROM OLD.price_amount
         OR NEW.currency IS DISTINCT FROM OLD.currency
         OR NEW.reason IS DISTINCT FROM OLD.reason
         OR NEW.valid_from IS DISTINCT FROM OLD.valid_from
         OR NEW.item_code_snapshot IS DISTINCT FROM OLD.item_code_snapshot
         OR NEW.item_name_snapshot IS DISTINCT FROM OLD.item_name_snapshot
         OR NEW.item_type_snapshot IS DISTINCT FROM OLD.item_type_snapshot
         OR v_provenance_changed THEN
        RAISE EXCEPTION 'Override business fields cannot change during a status transition';
      END IF;

      IF NEW.valid_to IS DISTINCT FROM OLD.valid_to THEN
        IF NOT (
          (OLD.status = 'active' AND NEW.status = 'superseded')
          OR (OLD.status = 'approved' AND NEW.status IN ('active', 'scheduled'))
        ) THEN
          RAISE EXCEPTION 'Override valid_to may change during transition only for monotonic publication or supersession';
        END IF;
        IF NEW.valid_to IS NULL
           OR NEW.valid_to <= NEW.valid_from
           OR (OLD.valid_to IS NOT NULL AND NEW.valid_to >= OLD.valid_to) THEN
          RAISE EXCEPTION 'Override valid_to transition must close the range monotonically';
        END IF;
      END IF;

      NEW.updated_by := OLD.updated_by;
      NEW.updated_at := OLD.updated_at;
      NEW.submitted_by := OLD.submitted_by;
      NEW.submitted_at := OLD.submitted_at;
      NEW.approved_by := OLD.approved_by;
      NEW.approved_at := OLD.approved_at;
      NEW.published_by := OLD.published_by;
      NEW.published_at := OLD.published_at;
      NEW.superseded_by := OLD.superseded_by;
      NEW.superseded_at := OLD.superseded_at;
      NEW.cancelled_by := OLD.cancelled_by;
      NEW.cancelled_at := OLD.cancelled_at;

      IF OLD.status = 'draft' AND NEW.status = 'under_review' THEN
        NEW.submitted_by := v_actor;
        NEW.submitted_at := now();
        v_require_eligibility := true;
      ELSIF OLD.status = 'under_review' AND NEW.status = 'approved' THEN
        NEW.approved_by := v_actor;
        NEW.approved_at := now();
        v_require_eligibility := true;
      ELSIF OLD.status = 'approved' AND NEW.status IN ('active', 'scheduled') THEN
        IF NEW.valid_from < current_date THEN
          RAISE EXCEPTION 'Retroactive override publication is not allowed';
        END IF;
        IF NEW.status = 'active' AND NEW.valid_from <> current_date THEN
          RAISE EXCEPTION 'An active override publication must start on current_date';
        END IF;
        IF NEW.status = 'scheduled' AND NEW.valid_from <= current_date THEN
          RAISE EXCEPTION 'A scheduled override publication must start after current_date';
        END IF;
        NEW.published_by := v_actor;
        NEW.published_at := now();
        v_require_eligibility := true;
      ELSIF OLD.status = 'scheduled' AND NEW.status = 'active' THEN
        IF NEW.valid_from > current_date THEN
          RAISE EXCEPTION 'A scheduled override cannot activate before valid_from';
        END IF;
      ELSIF OLD.status = 'active' AND NEW.status = 'superseded' THEN
        IF NEW.valid_to IS NULL OR NEW.valid_to > current_date THEN
          RAISE EXCEPTION 'An active override can be superseded only after its range closes';
        END IF;
        NEW.superseded_by := v_actor;
        NEW.superseded_at := now();
      ELSIF NEW.status = 'cancelled' THEN
        NEW.cancelled_by := v_actor;
        NEW.cancelled_at := now();
      END IF;
    ELSIF OLD.status = 'draft' THEN
      IF NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
         OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
         OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
         OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
         OR NEW.published_by IS DISTINCT FROM OLD.published_by
         OR NEW.published_at IS DISTINCT FROM OLD.published_at
         OR NEW.superseded_by IS DISTINCT FROM OLD.superseded_by
         OR NEW.superseded_at IS DISTINCT FROM OLD.superseded_at
         OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
         OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
        RAISE EXCEPTION 'Override workflow metadata is server-derived';
      END IF;
      NEW.updated_by := v_actor;
      NEW.updated_at := now();
      v_require_eligibility :=
        NEW.organization_id IS DISTINCT FROM OLD.organization_id
        OR NEW.client_company_id IS DISTINCT FROM OLD.client_company_id
        OR NEW.catalog_item_id IS DISTINCT FROM OLD.catalog_item_id;
    ELSE
      IF NOT v_is_rpc THEN
        RAISE EXCEPTION 'Non-draft overrides are immutable outside controlled client-pricing RPCs';
      END IF;
      IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
         OR NEW.client_company_id IS DISTINCT FROM OLD.client_company_id
         OR NEW.catalog_item_id IS DISTINCT FROM OLD.catalog_item_id
         OR NEW.price_amount IS DISTINCT FROM OLD.price_amount
         OR NEW.currency IS DISTINCT FROM OLD.currency
         OR NEW.reason IS DISTINCT FROM OLD.reason
         OR NEW.valid_from IS DISTINCT FROM OLD.valid_from
         OR NEW.item_code_snapshot IS DISTINCT FROM OLD.item_code_snapshot
         OR NEW.item_name_snapshot IS DISTINCT FROM OLD.item_name_snapshot
         OR NEW.item_type_snapshot IS DISTINCT FROM OLD.item_type_snapshot
         OR v_provenance_changed
         OR NEW.updated_by IS DISTINCT FROM OLD.updated_by
         OR NEW.updated_at IS DISTINCT FROM OLD.updated_at
         OR NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
         OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
         OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
         OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
         OR NEW.published_by IS DISTINCT FROM OLD.published_by
         OR NEW.published_at IS DISTINCT FROM OLD.published_at
         OR NEW.superseded_by IS DISTINCT FROM OLD.superseded_by
         OR NEW.superseded_at IS DISTINCT FROM OLD.superseded_at
         OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
         OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
        RAISE EXCEPTION 'Only controlled valid_to closure is allowed without an override transition';
      END IF;
      IF NEW.valid_to IS DISTINCT FROM OLD.valid_to AND (
        OLD.status NOT IN ('active', 'scheduled')
        OR NEW.valid_to IS NULL
        OR NEW.valid_to <= NEW.valid_from
        OR (OLD.valid_to IS NOT NULL AND NEW.valid_to >= OLD.valid_to)
      ) THEN
        RAISE EXCEPTION 'Override valid_to can only be shortened monotonically on active or scheduled records';
      END IF;
    END IF;
  END IF;

  IF v_provenance_changed AND NOT v_is_rpc THEN
    RAISE EXCEPTION 'Override table provenance must be created or changed by a trusted client-pricing RPC';
  END IF;

  IF num_nonnulls(
    NEW.source_reference_date,
    NEW.source_commercial_price_table_id,
    NEW.source_commercial_price_table_version_id,
    NEW.source_commercial_price_item_id,
    NEW.source_table_price_amount
  ) NOT IN (0, 5) THEN
    RAISE EXCEPTION 'Override provenance must be entirely null or fully populated';
  END IF;

  SELECT c.organization_id, c.status, cp.organization_id, cp.status
  INTO v_company_org, v_company_status, v_profile_org, v_profile_status
  FROM public.client_profiles cp
  JOIN public.companies c ON c.id = cp.company_id
  WHERE cp.company_id = NEW.client_company_id;

  IF v_profile_org IS NULL THEN
    RAISE EXCEPTION 'client_company_id does not identify a client profile';
  END IF;
  IF v_company_org IS DISTINCT FROM NEW.organization_id
     OR v_profile_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Client and override must belong to the same organization';
  END IF;

  SELECT organization_id, status, code, name, item_type
  INTO v_item_org, v_item_status, v_item_code, v_item_name, v_item_type
  FROM public.catalog_items
  WHERE id = NEW.catalog_item_id;

  IF v_item_org IS NULL THEN
    RAISE EXCEPTION 'catalog_item_id not found';
  END IF;
  IF v_item_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Catalog item and override must belong to the same organization';
  END IF;

  IF TG_OP = 'INSERT' OR NEW.catalog_item_id IS DISTINCT FROM OLD.catalog_item_id THEN
    NEW.item_code_snapshot := v_item_code;
    NEW.item_name_snapshot := v_item_name;
    NEW.item_type_snapshot := v_item_type;
  ELSIF OLD.status = 'draft' THEN
    -- Ignore untrusted snapshot input while preserving the creation snapshot.
    NEW.item_code_snapshot := OLD.item_code_snapshot;
    NEW.item_name_snapshot := OLD.item_name_snapshot;
    NEW.item_type_snapshot := OLD.item_type_snapshot;
  END IF;

  IF v_require_eligibility AND (
    v_company_status <> 'active'
    OR v_profile_status <> 'active'
    OR v_item_status <> 'active'
  ) THEN
    RAISE EXCEPTION 'New or advancing overrides require an active company, client profile and catalog item';
  END IF;

  IF NEW.source_reference_date IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.client_commercial_table_assignments a
    JOIN public.commercial_price_tables t
      ON t.id = a.commercial_price_table_id
    JOIN public.commercial_price_table_versions v
      ON v.id = NEW.source_commercial_price_table_version_id
    JOIN public.commercial_price_items i
      ON i.id = NEW.source_commercial_price_item_id
    WHERE a.organization_id = NEW.organization_id
      AND a.client_company_id = NEW.client_company_id
      AND a.commercial_price_table_id = NEW.source_commercial_price_table_id
      AND a.status IN ('active', 'scheduled', 'superseded')
      AND a.valid_from <= NEW.source_reference_date
      AND (a.valid_to IS NULL OR a.valid_to > NEW.source_reference_date)
      AND t.organization_id = NEW.organization_id
      AND v.organization_id = NEW.organization_id
      AND v.commercial_price_table_id = NEW.source_commercial_price_table_id
      AND v.status IN ('active', 'scheduled', 'superseded')
      AND v.valid_from <= NEW.source_reference_date
      AND (v.valid_to IS NULL OR v.valid_to > NEW.source_reference_date)
      AND i.organization_id = NEW.organization_id
      AND i.commercial_price_table_version_id = v.id
      AND i.catalog_item_id = NEW.catalog_item_id
      AND i.price_amount = NEW.source_table_price_amount
  ) THEN
    RAISE EXCEPTION 'Override table provenance is not structurally or temporally consistent';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_client_override_integrity
  BEFORE INSERT OR UPDATE ON public.client_price_overrides
  FOR EACH ROW EXECUTE FUNCTION public.fn_client_override_integrity();

-- ============================================================
-- 7. HARD-DELETE GUARDS
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_client_profile_delete_guard()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.client_commercial_table_assignments
    WHERE client_company_id = OLD.company_id
  ) OR EXISTS (
    SELECT 1 FROM public.client_price_overrides
    WHERE client_company_id = OLD.company_id
  ) THEN
    RAISE EXCEPTION 'Cannot hard delete a client profile with pricing history; use inactive or blocked status';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_client_profile_delete_guard
  BEFORE DELETE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_client_profile_delete_guard();

CREATE OR REPLACE FUNCTION public.fn_client_pricing_draft_delete_guard()
RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft client-pricing records may be hard deleted (status=%)', OLD.status;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_client_assignment_delete_guard
  BEFORE DELETE ON public.client_commercial_table_assignments
  FOR EACH ROW EXECUTE FUNCTION public.fn_client_pricing_draft_delete_guard();

CREATE TRIGGER trg_client_override_delete_guard
  BEFORE DELETE ON public.client_price_overrides
  FOR EACH ROW EXECUTE FUNCTION public.fn_client_pricing_draft_delete_guard();

-- ============================================================
-- 8. FAIL-CLOSED RLS AND INTERNAL HELPER REVOKES
-- ============================================================

ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_commercial_table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_price_overrides ENABLE ROW LEVEL SECURITY;

-- Trigger helpers remain callable by the trigger execution role, but are not
-- application endpoints and are never exposed to PUBLIC or anon.
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
        'fn_client_profile_integrity',
        'fn_client_assignment_integrity',
        'fn_client_override_integrity',
        'fn_client_profile_delete_guard',
        'fn_client_pricing_draft_delete_guard'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      v_rec.proname,
      v_rec.args
    );
  END LOOP;
END $$;
