-- PRC-05C: Commercial Price Table Resolver
-- Baseline: b2235b659e48b654b64df42e31c6bc68d32a2689 (COMMERCIAL_PRICE_SCHEMA_VERIFIED)
-- Migrations 001-034 are IMMUTABLE.
--
-- This migration creates the authoritative TABLE-SPECIFIC commercial price
-- resolver for PRC-05C:
--   fn_resolve_commercial_table_price(
--     p_organization_id,
--     p_commercial_price_table_id,
--     p_catalog_item_id,
--     p_reference_date DEFAULT current_date
--   )
--
-- Scope boundary (DEC-050): this resolver answers ONLY "what price does
-- catalog item X have inside commercial table Y on reference date D?". It
-- does NOT resolve client assignments (PRC-06) or global precedence
-- (PRC-07). The caller passes an explicit commercial_price_table_id; this
-- RPC never decides between tables.
--
-- Determinism (section 55): tie-break order is
--   valid_from DESC, version_number DESC, created_at DESC, id DESC
-- so the same input always produces the same output.
--
-- Zero vs missing (DEC-047): a missing catalog item row is PRICE_NOT_FOUND;
-- an explicit row with price_amount = 0 is RESOLVED with zero.
--
-- Inactive table (section 56): historical resolution remains possible from
-- an inactive stable table — only new version creation is blocked. The
-- table_status is returned in the result for the caller.

-- ============================================================
-- 1. fn_resolve_commercial_table_price
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_resolve_commercial_table_price(
  p_organization_id           uuid,
  p_commercial_price_table_id uuid,
  p_catalog_item_id           uuid,
  p_reference_date            date DEFAULT current_date
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_table_status text;
  v_table_code   text;
  v_table_name   text;
  v_version_id   uuid;
  v_version_number integer;
  v_version_status text;
  v_valid_from   date;
  v_valid_to     date;
  v_item_id      uuid;
  v_price_amount numeric;
  v_currency     char(3);
  v_origin_type  text;
  v_item_code_snap text;
  v_item_name_snap text;
  v_item_type_snap text;
  v_source_item_id uuid;
  v_src_ref_date   date;
  v_src_supplier   uuid;
  v_src_cost_table uuid;
  v_src_cost_ver   uuid;
  v_src_cost_ver_n integer;
  v_src_policy     uuid;
  v_src_policy_ver uuid;
  v_src_policy_ver_n integer;
  v_src_calc_price numeric;
  v_src_total_cost numeric;
  v_src_margin     numeric;
  v_src_markup     numeric;
  v_src_effective  numeric;
  v_pricing_snap   jsonb;
  v_approved_excs  jsonb;
  v_status         text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT is_member_of(p_organization_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF NOT has_permission('pricing.commercial.view', p_organization_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.commercial.view)';
  END IF;

  -- Table must belong to the requested organization. Cross-tenant
  -- requests are rejected before revealing existence.
  SELECT cpt.status, cpt.code, cpt.name
  INTO v_table_status, v_table_code, v_table_name
  FROM commercial_price_tables cpt
  WHERE cpt.id = p_commercial_price_table_id
    AND cpt.organization_id = p_organization_id;

  IF v_table_status IS NULL THEN
    -- TABLE_NOT_FOUND only for accessible organization (no cross-tenant leak).
    RETURN jsonb_build_object(
      'status', 'TABLE_NOT_FOUND',
      'organization_id', p_organization_id,
      'reference_date', p_reference_date,
      'commercial_price_table_id', p_commercial_price_table_id,
      'catalog_item_id', p_catalog_item_id
    );
  END IF;

  -- Find the deterministically-tied applicable version.
  SELECT v.id, v.version_number, v.status, v.valid_from, v.valid_to
  INTO v_version_id, v_version_number, v_version_status, v_valid_from, v_valid_to
  FROM commercial_price_table_versions v
  WHERE v.commercial_price_table_id = p_commercial_price_table_id
    AND v.organization_id = p_organization_id
    AND v.status IN ('active','scheduled','superseded')
    AND v.valid_from <= p_reference_date
    AND (v.valid_to IS NULL OR v_valid_to > p_reference_date)
  ORDER BY v.valid_from DESC, v.version_number DESC, v.created_at DESC, v.id DESC
  LIMIT 1;

  IF v_version_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'VERSION_NOT_FOUND',
      'organization_id', p_organization_id,
      'reference_date', p_reference_date,
      'commercial_price_table_id', p_commercial_price_table_id,
      'catalog_item_id', p_catalog_item_id,
      'table', jsonb_build_object(
        'id', p_commercial_price_table_id,
        'code', v_table_code,
        'name', v_table_name,
        'status', v_table_status
      )
    );
  END IF;

  -- Find the catalog item row inside the resolved version.
  SELECT id, price_amount, currency, origin_type,
         item_code_snapshot, item_name_snapshot, item_type_snapshot,
         source_commercial_price_item_id,
         source_reference_date, source_supplier_company_id,
         source_cost_table_id, source_cost_version_id, source_cost_version_number,
         source_pricing_policy_id, source_pricing_policy_version_id, source_policy_version_number,
         source_calculated_price, source_total_cost,
         source_margin_rate, source_markup_rate, source_effective_price,
         pricing_snapshot
  INTO v_item_id, v_price_amount, v_currency, v_origin_type,
       v_item_code_snap, v_item_name_snap, v_item_type_snap,
       v_source_item_id,
       v_src_ref_date, v_src_supplier,
       v_src_cost_table, v_src_cost_ver, v_src_cost_ver_n,
       v_src_policy, v_src_policy_ver, v_src_policy_ver_n,
       v_src_calc_price, v_src_total_cost,
       v_src_margin, v_src_markup, v_src_effective,
       v_pricing_snap
  FROM commercial_price_items
  WHERE commercial_price_table_version_id = v_version_id
    AND catalog_item_id = p_catalog_item_id;

  IF v_item_id IS NULL THEN
    -- Price missing for this item — distinct from zero.
    RETURN jsonb_build_object(
      'status', 'PRICE_NOT_FOUND',
      'organization_id', p_organization_id,
      'reference_date', p_reference_date,
      'commercial_price_table_id', p_commercial_price_table_id,
      'catalog_item_id', p_catalog_item_id,
      'table', jsonb_build_object(
        'id', p_commercial_price_table_id,
        'code', v_table_code,
        'name', v_table_name,
        'status', v_table_status
      ),
      'version', jsonb_build_object(
        'id', v_version_id,
        'version_number', v_version_number,
        'status', v_version_status,
        'valid_from', v_valid_from,
        'valid_to', v_valid_to
      )
    );
  END IF;

  -- Approved exceptions relevant to the resolved item.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', cpe.id,
    'violation_code', cpe.violation_code,
    'status', cpe.status,
    'reason', cpe.reason,
    'requested_by', cpe.requested_by,
    'requested_at', cpe.requested_at,
    'decided_by', cpe.decided_by,
    'decided_at', cpe.decided_at
  ) ORDER BY cpe.requested_at), '[]'::jsonb)
  INTO v_approved_excs
  FROM commercial_price_exceptions cpe
  WHERE cpe.commercial_price_item_id = v_item_id
    AND cpe.status = 'approved';

  v_status := 'RESOLVED';

  RETURN jsonb_build_object(
    'status', v_status,
    'organization_id', p_organization_id,
    'reference_date', p_reference_date,
    'commercial_price_table_id', p_commercial_price_table_id,
    'catalog_item_id', p_catalog_item_id,
    'table', jsonb_build_object(
      'id', p_commercial_price_table_id,
      'code', v_table_code,
      'name', v_table_name,
      'status', v_table_status
    ),
    'version', jsonb_build_object(
      'id', v_version_id,
      'version_number', v_version_number,
      'status', v_version_status,
      'valid_from', v_valid_from,
      'valid_to', v_valid_to
    ),
    'item', jsonb_build_object(
      'commercial_price_item_id', v_item_id,
      'catalog_item_id', p_catalog_item_id,
      'item_code_snapshot', v_item_code_snap,
      'item_name_snapshot', v_item_name_snap,
      'item_type_snapshot', v_item_type_snap
    ),
    'price_amount', v_price_amount,
    'currency', v_currency,
    'origin_type', v_origin_type,
    'lineage', jsonb_build_object(
      'source_commercial_price_item_id', v_source_item_id
    ),
    'provenance', jsonb_build_object(
      'source_reference_date', v_src_ref_date,
      'source_supplier_company_id', v_src_supplier,
      'source_cost_table_id', v_src_cost_table,
      'source_cost_version_id', v_src_cost_ver,
      'source_cost_version_number', v_src_cost_ver_n,
      'source_pricing_policy_id', v_src_policy,
      'source_pricing_policy_version_id', v_src_policy_ver,
      'source_policy_version_number', v_src_policy_ver_n,
      'source_calculated_price', v_src_calc_price,
      'source_total_cost', v_src_total_cost,
      'source_margin_rate', v_src_margin,
      'source_markup_rate', v_src_markup,
      'source_effective_price', v_src_effective,
      'pricing_snapshot', v_pricing_snap
    ),
    'approved_exceptions', v_approved_excs
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.fn_resolve_commercial_table_price(uuid, uuid, uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_resolve_commercial_table_price(uuid, uuid, uuid, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_resolve_commercial_table_price(uuid, uuid, uuid, date) TO authenticated;
