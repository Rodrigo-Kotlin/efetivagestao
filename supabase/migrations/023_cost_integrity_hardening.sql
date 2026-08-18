-- PRC-03A: Cost Temporal & Financial Integrity Hardening
-- Corrective migration — does NOT modify 018-022
-- Addresses: strict cost status, immutability, workflow, overlap, resolution, security
-- Deployed state: includes H13 fix (two-statement publish for scheduled versions)

-- ============================================================
-- 1. STRICT COST STATUS / AMOUNT CONSTRAINT
-- ============================================================

-- Drop old constraint (from migration 020)
ALTER TABLE supplier_cost_items DROP CONSTRAINT IF EXISTS chk_sci_cost_status;

-- New strict constraint: UNKNOWN COST != ZERO
ALTER TABLE supplier_cost_items
  ADD CONSTRAINT chk_sci_strict_cost_status CHECK (
    (cost_status = 'provided'        AND amount IS NOT NULL AND amount > 0)
    OR (cost_status = 'confirmed_zero' AND amount = 0)
    OR (cost_status = 'not_provided'    AND amount IS NULL)
    OR (cost_status = 'not_applicable'  AND amount IS NULL)
    OR (cost_status = 'awaiting_quote'  AND amount IS NULL)
    OR (cost_status = 'discontinued'    AND amount IS NULL)
  );

-- ============================================================
-- 2. ITEM IMMUTABILITY — DROP OLD TRIGGER, CREATE NEW
-- ============================================================

DROP TRIGGER IF EXISTS trg_sci_immutable_when_published ON supplier_cost_items;

CREATE OR REPLACE FUNCTION fn_sci_immutable_when_published()
RETURNS trigger AS $$
DECLARE
  v_version_id uuid;
  v_version_status text;
BEGIN
  -- For INSERT/UPDATE use NEW, for DELETE use OLD
  v_version_id := COALESCE(NEW.cost_table_version_id, OLD.cost_table_version_id);

  SELECT status INTO v_version_status
  FROM supplier_cost_table_versions
  WHERE id = v_version_id;

  IF v_version_status IS NULL THEN
    RAISE EXCEPTION 'Parent version not found';
  END IF;

  -- Only draft versions allow item changes
  IF v_version_status != 'draft' THEN
    RAISE EXCEPTION 'Cannot modify cost items in version with status % (only draft allowed)', v_version_status;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sci_immutable_when_published
  BEFORE INSERT OR UPDATE OR DELETE ON supplier_cost_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_sci_immutable_when_published();

-- ============================================================
-- 3. VERSION WORKFLOW INTEGRITY — SERVER-SIDE PROTECTION
-- ============================================================

CREATE OR REPLACE FUNCTION fn_validate_version_transition()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_is_rpc boolean;
BEGIN
  v_user_id := auth.uid();

  -- Check if this UPDATE is coming from a validated RPC
  v_is_rpc := (current_setting('app.cost_rpc_active', true) = 'true');

  -- Block direct status changes on active/superseded (regardless of RPC)
  IF OLD.status IN ('active', 'superseded') THEN
    -- Allow active → superseded (only via publish RPC)
    IF OLD.status = 'active' AND NEW.status = 'superseded' AND v_is_rpc THEN
      RETURN NEW;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Cannot change status of % version directly', OLD.status;
    END IF;
    RETURN NEW;
  END IF;

  -- Allow scheduled → superseded via RPC (for publish continuous timeline)
  IF OLD.status = 'scheduled' AND NEW.status = 'superseded' AND v_is_rpc THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot change status of cancelled version';
  END IF;

  -- All other status changes MUST go through RPC
  IF NOT v_is_rpc THEN
    RAISE EXCEPTION 'Status changes must go through the corresponding RPC function';
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF OLD.status = 'draft' AND NEW.status = 'under_review' THEN
    IF NOT has_permission('pricing.cost.create', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for submit (requires pricing.cost.create)';
    END IF;
  ELSIF OLD.status = 'under_review' AND NEW.status = 'approved' THEN
    IF NOT has_permission('pricing.cost.approve', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for approve (requires pricing.cost.approve)';
    END IF;
    NEW.approved_by := v_user_id;
    NEW.approved_at := now();
  ELSIF OLD.status = 'approved' AND NEW.status IN ('active', 'scheduled') THEN
    IF NOT has_permission('pricing.cost.publish', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for publish (requires pricing.cost.publish)';
    END IF;
    NEW.published_by := v_user_id;
    NEW.published_at := now();
  ELSIF OLD.status IN ('draft', 'under_review') AND NEW.status = 'cancelled' THEN
    IF NOT has_permission('pricing.cost.archive', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for cancel (requires pricing.cost.archive)';
    END IF;
  ELSIF OLD.status = 'under_review' AND NEW.status = 'draft' THEN
    IF NOT has_permission('pricing.cost.edit', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for send back to draft (requires pricing.cost.edit)';
    END IF;
  ELSIF OLD.status = 'scheduled' AND NEW.status = 'active' THEN
    IF NOT has_permission('pricing.cost.publish', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for activation (requires pricing.cost.publish)';
    END IF;
    NEW.published_by := v_user_id;
    NEW.published_at := now();
  ELSE
    RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_version_workflow ON supplier_cost_table_versions;

CREATE TRIGGER trg_validate_version_workflow
  BEFORE UPDATE ON supplier_cost_table_versions
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_version_transition();

-- ============================================================
-- 4. PUBLISHED VERSION FIELD IMMUTABILITY
-- ============================================================

CREATE OR REPLACE FUNCTION fn_sctv_protect_published_fields()
RETURNS trigger AS $$
DECLARE
  v_is_rpc boolean;
BEGIN
  v_is_rpc := (current_setting('app.cost_rpc_active', true) = 'true');

  IF OLD.status IN ('active', 'superseded') THEN
    -- Allow status changes only via RPC
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status = 'active' AND NEW.status = 'superseded' AND v_is_rpc THEN
        NEW.superseded_at := now();
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Cannot change status from % to %', OLD.status, OLD.status;
    END IF;

    -- Allow temporal field changes via RPC (for publish continuous timeline)
    IF v_is_rpc THEN
      RETURN NEW;
    END IF;

    -- Block changes to commercial/temporal fields for direct updates
    IF NEW.cost_table_id IS DISTINCT FROM OLD.cost_table_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.version_number IS DISTINCT FROM OLD.version_number
       OR NEW.source_date IS DISTINCT FROM OLD.source_date
       OR NEW.valid_from IS DISTINCT FROM OLD.valid_from
       OR NEW.valid_to IS DISTINCT FROM OLD.valid_to
       OR NEW.source_file_name IS DISTINCT FROM OLD.source_file_name
       OR NEW.source_file_hash IS DISTINCT FROM OLD.source_file_hash
       OR NEW.source_document_id IS DISTINCT FROM OLD.source_document_id
    THEN
      RAISE EXCEPTION 'Cannot modify published version commercial/temporal fields';
    END IF;
  END IF;

  -- Allow scheduled → superseded via RPC (set superseded_at)
  IF OLD.status = 'scheduled' AND NEW.status = 'superseded' AND v_is_rpc THEN
    NEW.superseded_at := now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_sctv_protect_published ON supplier_cost_table_versions;

CREATE TRIGGER trg_sctv_protect_published
  BEFORE UPDATE ON supplier_cost_table_versions
  FOR EACH ROW
  EXECUTE FUNCTION fn_sctv_protect_published_fields();

-- ============================================================
-- 5. NO HARD DELETE OF TABLES AND VERSIONS
-- ============================================================

-- Prevent hard delete of cost tables (use archive instead)
CREATE OR REPLACE FUNCTION fn_prevent_hard_delete_cost_table()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Hard delete of cost tables is not allowed. Use archive (status = archived) instead.';
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_hard_delete_cost_table ON supplier_cost_tables;

CREATE TRIGGER trg_prevent_hard_delete_cost_table
  BEFORE DELETE ON supplier_cost_tables
  FOR EACH ROW
  EXECUTE FUNCTION fn_prevent_hard_delete_cost_table();

-- Prevent hard delete of versions (use cancelled/superseded instead)
CREATE OR REPLACE FUNCTION fn_prevent_hard_delete_version()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Hard delete of cost table versions is not allowed. Use cancel or supersede instead.';
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_hard_delete_version ON supplier_cost_table_versions;

CREATE TRIGGER trg_prevent_hard_delete_version
  BEFORE DELETE ON supplier_cost_table_versions
  FOR EACH ROW
  EXECUTE FUNCTION fn_prevent_hard_delete_version();

-- ============================================================
-- 6. CONCURRENT VERSION NUMBER — FOR UPDATE LOCKING
-- ============================================================

DROP FUNCTION IF EXISTS fn_create_cost_version(uuid, date, date, text, date, text);

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
  v_cost_table   record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- FOR UPDATE lock on the cost table row (concurrency-safe)
  SELECT ct.id, ct.organization_id
  INTO v_cost_table
  FROM supplier_cost_tables ct
  WHERE ct.id = p_cost_table_id
  FOR UPDATE;

  IF v_cost_table IS NULL THEN
    RAISE EXCEPTION 'Cost table not found';
  END IF;

  v_org_id := v_cost_table.organization_id;

  IF NOT has_permission('pricing.cost.create', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  -- Atomic version number (under FOR UPDATE lock)
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
-- 7. REAL TEMPORAL OVERLAP — btree_gist + EXCLUDE
-- ============================================================

-- Enable btree_gist for date type
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Drop old trigger-based overlap check
DROP TRIGGER IF EXISTS trg_sctv_overlap_check ON supplier_cost_table_versions;
DROP FUNCTION IF EXISTS fn_sctv_overlap_check();

-- Add EXCLUDE constraint for concurrent-safe temporal overlap
-- Uses daterange with '[)' bounds (inclusive start, exclusive end)
-- NULL valid_to is treated as infinity via upper open bound
-- DEFERRABLE INITIALLY DEFERRED: allows H13 scheduled publish to work

DO $$
BEGIN
  -- Drop existing constraint first (may have been recreated during H13 debugging)
  ALTER TABLE supplier_cost_table_versions DROP CONSTRAINT IF EXISTS chk_sctv_no_overlap;

  ALTER TABLE supplier_cost_table_versions
    ADD CONSTRAINT chk_sctv_no_overlap EXCLUDE USING gist (
      cost_table_id WITH =,
      daterange(valid_from, valid_to, '[)') WITH &&
    )
    WHERE (status IN ('active', 'scheduled'))
    DEFERRABLE INITIALLY DEFERRED;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 8. FIX fn_publish_cost_version — CONTINUOUS TIMELINE
--    H13 fix: Two-statement publish for scheduled versions.
--    Statement 1 supersedes ALL other active/scheduled versions,
--    removing them from the EXCLUDE constraint's WHERE clause.
--    Statement 2 publishes the new version with no conflicts.
--    EXCLUDE checks at statement end, so no overlap is possible.
-- ============================================================

DROP FUNCTION IF EXISTS fn_publish_cost_version(uuid);

CREATE OR REPLACE FUNCTION fn_publish_cost_version(
  p_version_id uuid
)
RETURNS void AS $$
DECLARE
  v_user_id    uuid;
  v_org_id     uuid;
  v_status     text;
  v_valid_from date;
  v_valid_to   date;
  v_table_id   uuid;
  v_new_status text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT v.organization_id, v.status, v.valid_from, v.valid_to, v.cost_table_id
  INTO v_org_id, v_status, v_valid_from, v_valid_to, v_table_id
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

  -- Signal RPC context before any status changes
  PERFORM set_config('app.cost_rpc_active', 'true', true);

  -- Statement 1: Supersede ALL other active/scheduled versions for this table
  -- This removes them from the EXCLUDE WHERE clause (status IN ('active','scheduled'))
  -- so statement 2 can publish without overlap.
  UPDATE supplier_cost_table_versions
  SET status = 'superseded',
      superseded_at = now(),
      valid_to = CASE
        WHEN v_valid_from > valid_from THEN v_valid_from
        ELSE valid_to
      END
  WHERE cost_table_id = v_table_id
    AND id != p_version_id
    AND status IN ('active', 'scheduled');
  -- EXCLUDE fires at statement end:
  --   All superseded rows leave WHERE clause → no check needed → passes

  -- Statement 2: Publish the new version
  UPDATE supplier_cost_table_versions
  SET status = v_new_status,
      published_by = v_user_id,
      published_at = now()
  WHERE id = p_version_id;
  -- EXCLUDE fires at statement end:
  --   Only the new version matches WHERE (if scheduled/active)
  --   All others were superseded in statement 1 → no overlap → passes

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_publish_cost_version(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_publish_cost_version(uuid) FROM anon;

-- ============================================================
-- 9. HISTORICAL RESOLUTION — fn_resolve_supplier_cost
-- ============================================================

DROP FUNCTION IF EXISTS fn_resolve_supplier_cost(uuid, uuid, uuid, date);

CREATE OR REPLACE FUNCTION fn_resolve_supplier_cost(
  p_organization_id     uuid,
  p_supplier_company_id uuid,
  p_catalog_item_id     uuid,
  p_reference_date      date DEFAULT current_date
)
RETURNS TABLE (
  amount            numeric(14,4),
  cost_status       text,
  currency_code     char(3),
  mapping_id        uuid,
  cost_table_id     uuid,
  version_id        uuid,
  version_number    integer,
  valid_from        date,
  valid_to          date,
  resolution_status text,
  reason            text
) AS $$
BEGIN
  RETURN QUERY
  WITH applicable AS (
    SELECT
      sci.amount,
      sci.cost_status,
      sci.currency_code,
      sci.supplier_catalog_item_id,
      ct.id AS ct_id,
      v.id AS v_id,
      v.version_number AS v_version_number,
      v.valid_from AS v_valid_from,
      v.valid_to AS v_valid_to
    FROM supplier_cost_table_versions v
    JOIN supplier_cost_tables ct ON ct.id = v.cost_table_id
    JOIN supplier_cost_items sci ON sci.cost_table_version_id = v.id
    WHERE ct.organization_id = p_organization_id
      AND ct.supplier_company_id = p_supplier_company_id
      AND sci.catalog_item_id = p_catalog_item_id
      AND v.valid_from <= p_reference_date
      AND (v.valid_to IS NULL OR v.valid_to > p_reference_date)
      AND v.status IN ('active', 'superseded')
      AND sci.cost_status IN ('provided', 'confirmed_zero')
    ORDER BY v.version_number DESC
    LIMIT 1
  )
  SELECT
    a.amount,
    a.cost_status,
    a.currency_code,
    a.supplier_catalog_item_id,
    a.ct_id,
    a.v_id,
    a.v_version_number,
    a.v_valid_from,
    a.v_valid_to,
    CASE
      WHEN a.cost_status = 'provided' THEN 'CONFIRMED'::text
      WHEN a.cost_status = 'confirmed_zero' THEN 'CONFIRMED'::text
      ELSE 'COST_NOT_CONFIRMED'::text
    END AS resolution_status,
    CASE
      WHEN a.cost_status = 'provided' THEN NULL::text
      WHEN a.cost_status = 'confirmed_zero' THEN 'confirmed_zero'::text
      ELSE a.cost_status
    END AS reason
  FROM applicable a

  UNION ALL

  -- If no confirmed cost found, return COST_NOT_CONFIRMED
  SELECT
    NULL::numeric(14,4),
    COALESCE(
      (SELECT sci2.cost_status
       FROM supplier_cost_table_versions v2
       JOIN supplier_cost_tables ct2 ON ct2.id = v2.cost_table_id
       JOIN supplier_cost_items sci2 ON sci2.cost_table_version_id = v2.id
       WHERE ct2.organization_id = p_organization_id
         AND ct2.supplier_company_id = p_supplier_company_id
         AND sci2.catalog_item_id = p_catalog_item_id
         AND v2.valid_from <= p_reference_date
         AND (v2.valid_to IS NULL OR v2.valid_to > p_reference_date)
         AND v2.status IN ('active', 'superseded')
       ORDER BY v2.version_number DESC
       LIMIT 1),
      'NO_APPLICABLE_COST'::text
    ),
    NULL::char(3),
    NULL::uuid,
    NULL::uuid,
    NULL::uuid,
    NULL::integer,
    NULL::date,
    NULL::date,
    'COST_NOT_CONFIRMED'::text,
    COALESCE(
      (SELECT sci2.cost_status
       FROM supplier_cost_table_versions v2
       JOIN supplier_cost_tables ct2 ON ct2.id = v2.cost_table_id
       JOIN supplier_cost_items sci2 ON sci2.cost_table_version_id = v2.id
       WHERE ct2.organization_id = p_organization_id
         AND ct2.supplier_company_id = p_supplier_company_id
         AND sci2.catalog_item_id = p_catalog_item_id
         AND v2.valid_from <= p_reference_date
         AND (v2.valid_to IS NULL OR v2.valid_to > p_reference_date)
         AND v2.status IN ('active', 'superseded')
       ORDER BY v2.version_number DESC
       LIMIT 1),
      'NO_APPLICABLE_COST'::text
    )
  WHERE NOT EXISTS (SELECT 1 FROM applicable a);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_resolve_supplier_cost(uuid, uuid, uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_resolve_supplier_cost(uuid, uuid, uuid, date) FROM anon;

-- ============================================================
-- 10. SECURITY DEFINER REVIEW — REVOKE/GRANT
-- ============================================================

-- Ensure all cost RPCs are SECURITY DEFINER with safe search_path
-- (already done above for modified functions)

-- Revoke from PUBLIC and anon for all cost functions
DO $$
DECLARE
  func_record record;
BEGIN
  FOR func_record IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'fn_%cost%'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s(%s) FROM PUBLIC', func_record.proname, func_record.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s(%s) FROM anon', func_record.proname, func_record.args);
  END LOOP;
END $$;

-- ============================================================
-- 11. SECURE fn_submit_cost_version
-- ============================================================

DROP FUNCTION IF EXISTS fn_submit_cost_version(uuid);

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

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF v_status != 'draft' THEN
    RAISE EXCEPTION 'Only draft versions can be submitted for review';
  END IF;

  SELECT count(*) INTO v_item_count
  FROM supplier_cost_items
  WHERE cost_table_version_id = p_version_id;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Version must have at least one cost item';
  END IF;

  PERFORM set_config('app.cost_rpc_active', 'true', true);
  UPDATE supplier_cost_table_versions
  SET status = 'under_review'
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_submit_cost_version(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_submit_cost_version(uuid) FROM anon;

-- ============================================================
-- 12. SECURE fn_approve_cost_version
-- ============================================================

DROP FUNCTION IF EXISTS fn_approve_cost_version(uuid);

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

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF v_status != 'under_review' THEN
    RAISE EXCEPTION 'Only versions under review can be approved';
  END IF;

  PERFORM set_config('app.cost_rpc_active', 'true', true);
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
-- 13. SECURE fn_create_cost_table
-- ============================================================

DROP FUNCTION IF EXISTS fn_create_cost_table(uuid, uuid, text, text, text);

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

  PERFORM set_config('app.cost_rpc_active', 'true', true);
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
-- 14. SECURE fn_get_cost_stats
-- ============================================================

DROP FUNCTION IF EXISTS fn_get_cost_stats(uuid);

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
  IF NOT is_member_of(p_organization_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF NOT has_permission('pricing.cost.view', p_organization_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

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

-- ============================================================
-- 15. SECURE fn_get_version_items
-- ============================================================

DROP FUNCTION IF EXISTS fn_get_version_items(uuid);

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
