-- PRC-03B: Temporal Cutover & Migration Reproducibility
-- Finalizes temporal semantics for cost table versions:
--   1. Future scheduled publish keeps the predecessor ACTIVE (closed valid_to)
--      instead of superseding it — the EXCLUDE constraint passes because the
--      predecessor range [A.from, B.from) and the scheduled range [B.from, ∞)
--      are adjacent, not overlapping.
--   2. Date-driven temporal resolution: the resolver now includes 'scheduled'
--      versions, so fn_resolve_supplier_cost(B.valid_from) returns B even
--      though B is not yet 'active'.
--   3. Status cutover: fn_sync_cost_version_status is an idempotent RPC that
--      activates scheduled versions when p_reference_date >= valid_from and
--      supersedes the previous active version.
--
-- This migration is idempotent: it can be applied to any DB that has 023
-- (final hardened state) or 024 (no-op). Migrations 001-024 are IMMUTABLE.

-- ============================================================
-- 1. fn_publish_cost_version — v8: continuous timeline for both cases
--    Active publish  (valid_from <= today): supersede ALL others, publish active.
--    Scheduled publish (valid_from > today): predecessor stays active with
--      valid_to closed to the new version's valid_from; overlapping scheduled
--      versions are superseded; new version published as scheduled.
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

  -- Date-driven status: future start date => scheduled, otherwise active
  IF v_valid_from > current_date THEN
    v_new_status := 'scheduled';
  ELSE
    v_new_status := 'active';
  END IF;

  -- Signal RPC context before any status/field changes
  PERFORM set_config('app.cost_rpc_active', 'true', true);

  IF v_new_status = 'active' THEN
    -- Active publish: supersede ALL other active/scheduled versions.
    -- They leave the EXCLUDE WHERE clause; the new version is the only
    -- active/scheduled row remaining, so the EXCLUDE check passes.
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
  ELSE
    -- Scheduled publish: keep the predecessor ACTIVE and close its valid_to.
    -- The two ranges [A.from, B.from) and [B.from, ∞) are adjacent and do not
    -- overlap, satisfying the EXCLUDE constraint without superseding A.
    UPDATE supplier_cost_table_versions
    SET valid_to = v_valid_from
    WHERE cost_table_id = v_table_id
      AND id != p_version_id
      AND status = 'active'
      AND valid_from < v_valid_from
      AND (valid_to IS NULL OR valid_to > v_valid_from);

    -- Supersede any OTHER scheduled versions whose range overlaps the new
    -- version. They leave the EXCLUDE WHERE clause (status = 'superseded').
    UPDATE supplier_cost_table_versions
    SET status = 'superseded',
        superseded_at = now()
    WHERE cost_table_id = v_table_id
      AND id != p_version_id
      AND status = 'scheduled'
      AND daterange(valid_from, valid_to, '[)') && daterange(v_valid_from, v_valid_to, '[)');
  END IF;

  -- Publish the new version (active or scheduled)
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
-- 2. fn_resolve_supplier_cost — v2: date-driven resolution
--    Includes 'scheduled' versions. A scheduled version is applicable for any
--    reference date >= valid_from (independent of its workflow status), so
--    fn_resolve_supplier_cost(B.valid_from) returns B before cutover.
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
      AND v.status IN ('active', 'scheduled', 'superseded')
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
         AND v2.status IN ('active', 'scheduled', 'superseded')
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
         AND v2.status IN ('active', 'scheduled', 'superseded')
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
-- 3. fn_sync_cost_version_status — idempotent scheduled→active cutover
--    Activates every scheduled version whose range covers p_reference_date
--    and supersedes the active predecessor that preceded it. Safe to run
--    repeatedly (after a run, no eligible scheduled versions remain).
--    Returns the number of versions activated.
-- ============================================================

DROP FUNCTION IF EXISTS fn_sync_cost_version_status(date);

CREATE OR REPLACE FUNCTION fn_sync_cost_version_status(
  p_reference_date date DEFAULT current_date
)
RETURNS integer AS $$
DECLARE
  v_user_id uuid;
  v_count   integer := 0;
  v_sched   record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_reference_date IS NULL THEN
    RAISE EXCEPTION 'Reference date is required';
  END IF;

  -- Signal RPC context for trigger validation
  PERFORM set_config('app.cost_rpc_active', 'true', true);

  FOR v_sched IN
    SELECT s.id, s.cost_table_id, s.valid_from, s.valid_to, ct.organization_id
    FROM supplier_cost_table_versions s
    JOIN supplier_cost_tables ct ON ct.id = s.cost_table_id
    WHERE s.status = 'scheduled'
      AND s.valid_from <= p_reference_date
      AND (s.valid_to IS NULL OR s.valid_to > p_reference_date)
    ORDER BY s.cost_table_id, s.valid_from ASC, s.version_number ASC
  LOOP
    IF NOT has_permission('pricing.cost.publish', v_sched.organization_id) THEN
      RAISE EXCEPTION 'Insufficient permissions for cost activation';
    END IF;

    -- Supersede the active predecessor whose range ends exactly where this
    -- scheduled version begins (valid_to >= valid_from catches the adjacent
    -- [A.from, B.from) predecessor). Versions being activated in THIS run are
    -- excluded so a later scheduled version does not supersede an earlier one
    -- that was just activated (e.g. S1 [2027,2029) and S2 [2029,∞) cut over
    -- together: S1 stays active).
    UPDATE supplier_cost_table_versions
    SET status = 'superseded',
        superseded_at = now()
    WHERE cost_table_id = v_sched.cost_table_id
      AND status = 'active'
      AND id NOT IN (
        SELECT s2.id
        FROM supplier_cost_table_versions s2
        WHERE s2.cost_table_id = v_sched.cost_table_id
          AND s2.status = 'scheduled'
          AND s2.valid_from <= p_reference_date
          AND (s2.valid_to IS NULL OR s2.valid_to > p_reference_date)
      )
      AND valid_from <= v_sched.valid_from
      AND (valid_to IS NULL OR valid_to >= v_sched.valid_from);

    -- Activate the scheduled version
    UPDATE supplier_cost_table_versions
    SET status = 'active',
        published_by = v_user_id,
        published_at = now()
    WHERE id = v_sched.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_sync_cost_version_status(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_sync_cost_version_status(date) FROM anon;
GRANT EXECUTE ON FUNCTION fn_sync_cost_version_status(date) TO authenticated;
