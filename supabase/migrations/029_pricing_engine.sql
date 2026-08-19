-- PRC-04C: Authoritative Pricing Engine
-- Migrations 001-027 are IMMUTABLE.
-- This migration creates:
--   1. fn_resolve_pricing_policy — date-driven policy resolution with scope precedence
--   2. fn_calculate_price — authoritative numeric calculation (internal)
--   3. fn_simulate_price — public orchestration RPC (application-facing)
--
-- All calculations use PostgreSQL numeric. No float/double precision.
-- Pricing simulation does NOT persist commercial prices (PRC-05 boundary).
-- fn_resolve_supplier_cost remains sole cost authority (DEC-033).

-- ============================================================
-- 1. fn_resolve_pricing_policy — date-driven, scope-precedence resolution
-- ============================================================
-- Returns the applicable active policy version for a given organization,
-- catalog item (or category/default), and reference date.
--
-- Scope precedence: CATALOG_ITEM > CATEGORY > DEFAULT
-- Only stable policies with status = 'active' are eligible.
-- Version must satisfy: valid_from <= ref AND (valid_to IS NULL OR valid_to > ref)
-- Scheduled versions participate in resolution (same as cost module).

CREATE OR REPLACE FUNCTION fn_resolve_pricing_policy(
  p_organization_id    uuid,
  p_catalog_item_id    uuid,
  p_reference_date     date DEFAULT current_date
)
RETURNS TABLE (
  pricing_policy_id        uuid,
  pricing_policy_code      text,
  pricing_policy_name      text,
  scope_type               text,
  pricing_policy_version_id uuid,
  version_number           integer,
  valid_from               date,
  valid_to                 date,
  pricing_method           text,
  target_margin_rate       numeric(9,6),
  markup_rate              numeric(9,6),
  fixed_price              numeric(14,4),
  minimum_margin_rate      numeric(9,6),
  maximum_discount_rate    numeric(9,6),
  rounding_mode            text,
  rounding_step            numeric(12,4),
  resolution_status        text,
  reason                   text
) AS $$
DECLARE
  v_category_id uuid;
BEGIN
  -- Resolve the category of the catalog item
  SELECT ci.category_id INTO v_category_id
  FROM catalog_items ci
  WHERE ci.id = p_catalog_item_id
    AND ci.organization_id = p_organization_id;

  -- Try CATALOG_ITEM scope first (highest precedence)
  RETURN QUERY
  SELECT
    pp.id, pp.code, pp.name, pp.scope_type,
    pv.id, pv.version_number, pv.valid_from, pv.valid_to,
    pv.pricing_method,
    pv.target_margin_rate, pv.markup_rate, pv.fixed_price,
    pv.minimum_margin_rate, pv.maximum_discount_rate,
    pv.rounding_mode, pv.rounding_step,
    'RESOLVED'::text,
    'catalog_item'::text
  FROM pricing_policies pp
  JOIN pricing_policy_versions pv ON pv.pricing_policy_id = pp.id
  WHERE pp.organization_id = p_organization_id
    AND pp.scope_type = 'catalog_item'
    AND pp.catalog_item_id = p_catalog_item_id
    AND pp.status = 'active'
    AND pv.status IN ('active', 'scheduled', 'superseded')
    AND pv.valid_from <= p_reference_date
    AND (pv.valid_to IS NULL OR pv.valid_to > p_reference_date)
  ORDER BY pv.version_number DESC
  LIMIT 1;

  -- If found, return
  IF FOUND THEN
    RETURN;
  END IF;

  -- Try CATEGORY scope (if the item has a category)
  IF v_category_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      pp.id, pp.code, pp.name, pp.scope_type,
      pv.id, pv.version_number, pv.valid_from, pv.valid_to,
      pv.pricing_method,
      pv.target_margin_rate, pv.markup_rate, pv.fixed_price,
      pv.minimum_margin_rate, pv.maximum_discount_rate,
      pv.rounding_mode, pv.rounding_step,
      'RESOLVED'::text,
      'category'::text
    FROM pricing_policies pp
    JOIN pricing_policy_versions pv ON pv.pricing_policy_id = pp.id
    WHERE pp.organization_id = p_organization_id
      AND pp.scope_type = 'category'
      AND pp.catalog_category_id = v_category_id
      AND pp.status = 'active'
      AND pv.status IN ('active', 'scheduled', 'superseded')
      AND pv.valid_from <= p_reference_date
      AND (pv.valid_to IS NULL OR pv.valid_to > p_reference_date)
    ORDER BY pv.version_number DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  -- Try DEFAULT scope (lowest precedence)
  RETURN QUERY
  SELECT
    pp.id, pp.code, pp.name, pp.scope_type,
    pv.id, pv.version_number, pv.valid_from, pv.valid_to,
    pv.pricing_method,
    pv.target_margin_rate, pv.markup_rate, pv.fixed_price,
    pv.minimum_margin_rate, pv.maximum_discount_rate,
    pv.rounding_mode, pv.rounding_step,
    'RESOLVED'::text,
    'default'::text
  FROM pricing_policies pp
  JOIN pricing_policy_versions pv ON pv.pricing_policy_id = pp.id
  WHERE pp.organization_id = p_organization_id
    AND pp.scope_type = 'default'
    AND pp.status = 'active'
    AND pv.status IN ('active', 'scheduled', 'superseded')
    AND pv.valid_from <= p_reference_date
    AND (pv.valid_to IS NULL OR pv.valid_to > p_reference_date)
  ORDER BY pv.version_number DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- No policy found
  RETURN QUERY
  SELECT
    NULL::uuid, NULL::text, NULL::text, NULL::text,
    NULL::uuid, NULL::integer, NULL::date, NULL::date,
    NULL::text,
    NULL::numeric(9,6), NULL::numeric(9,6), NULL::numeric(14,4),
    NULL::numeric(9,6), NULL::numeric(9,6),
    NULL::text, NULL::numeric(12,4),
    'POLICY_NOT_FOUND'::text,
    'No active pricing policy for this organization and item'::text;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_resolve_pricing_policy(uuid, uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_resolve_pricing_policy(uuid, uuid, date) FROM anon;

-- ============================================================
-- 2. fn_calculate_price — authoritative numeric calculation (internal)
-- ============================================================
-- Pure math layer. Does NOT resolve cost or policy.
-- Operates entirely with PostgreSQL numeric.
-- Returns a JSONB result with all financial metrics and provenance.

CREATE OR REPLACE FUNCTION fn_calculate_price(
  -- Cost inputs (from fn_resolve_supplier_cost)
  p_base_cost             numeric(14,4),
  p_cost_status           text,
  p_cost_version_id       uuid,
  p_cost_version_number   integer,
  p_cost_valid_from       date,
  p_cost_valid_to         date,
  p_cost_table_id         uuid,

  -- Policy inputs (from fn_resolve_pricing_policy)
  p_pricing_method        text,
  p_target_margin_rate    numeric(9,6),
  p_markup_rate           numeric(9,6),
  p_fixed_price           numeric(14,4),
  p_minimum_margin_rate   numeric(9,6),
  p_maximum_discount_rate numeric(9,6),
  p_rounding_mode         text,
  p_rounding_step         numeric(12,4),

  -- Discount simulation
  p_discount_rate         numeric(9,6) DEFAULT 0,

  -- Provenance context
  p_organization_id       uuid DEFAULT NULL,
  p_supplier_company_id   uuid DEFAULT NULL,
  p_catalog_item_id       uuid DEFAULT NULL,
  p_reference_date        date DEFAULT NULL,
  p_pricing_policy_id     uuid DEFAULT NULL,
  p_policy_version_id     uuid DEFAULT NULL,
  p_policy_version_number integer DEFAULT NULL,
  p_policy_valid_from     date DEFAULT NULL,
  p_policy_valid_to       date DEFAULT NULL,
  p_scope_type            text DEFAULT NULL,
  p_pricing_policy_code   text DEFAULT NULL,
  p_pricing_policy_name   text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result          jsonb;
  v_base_cost       numeric(14,4);
  v_total_cost      numeric(14,4);
  v_calculated_price numeric(14,4);
  v_rounded_price   numeric(14,4);
  v_effective_price  numeric(14,4);
  v_discount_amount numeric(14,4);
  v_gross_profit    numeric(14,4);
  v_margin_rate     numeric(9,6);
  v_markup_rate     numeric(9,6);
  v_add_fixed       numeric(14,4) := 0;
  v_add_pct         numeric(14,4) := 0;
  v_add_total       numeric(14,4) := 0;
  v_floor_price     numeric(14,4);
  v_components      jsonb := '[]'::jsonb;
  v_warnings        text[] := ARRAY[]::text[];
  v_violations      text[] := ARRAY[]::text[];
  v_status          text := 'OK';

  -- Component cursor variables
  v_comp           record;
  v_comp_amount    numeric(14,4);
BEGIN
  v_base_cost := p_base_cost;

  -- ── COST NOT CONFIRMED → PRICE_NOT_CALCULABLE ──
  IF p_cost_status IS NULL OR p_cost_status != 'CONFIRMED' THEN
    RETURN jsonb_build_object(
      'status', 'PRICE_NOT_CALCULABLE',
      'reason', 'COST_NOT_CONFIRMED',
      'base_cost', NULL,
      'total_cost', NULL,
      'calculated_price', NULL,
      'rounded_price', NULL,
      'effective_price', NULL,
      'warnings', to_jsonb(v_warnings),
      'violations', to_jsonb(v_violations || 'COST_NOT_CONFIRMED'),
      'provenance', jsonb_build_object(
        'organization_id', p_organization_id,
        'supplier_company_id', p_supplier_company_id,
        'catalog_item_id', p_catalog_item_id,
        'reference_date', p_reference_date,
        'cost_status', p_cost_status,
        'cost_version_id', p_cost_version_id,
        'cost_version_number', p_cost_version_number,
        'pricing_policy_id', p_pricing_policy_id,
        'scope_type', p_scope_type,
        'pricing_policy_version_id', p_policy_version_id,
        'policy_version_number', p_policy_version_number
      )
    );
  END IF;

  -- ── COMPONENT BREAKDOWN ──
  FOR v_comp IN
    SELECT pc.id, pc.name, pc.component_type, pc.fixed_amount, pc.rate
    FROM pricing_policy_components pc
    WHERE pc.pricing_policy_version_id = p_policy_version_id
    ORDER BY pc.sort_order, pc.created_at
  LOOP
    IF v_comp.component_type = 'fixed' THEN
      v_comp_amount := COALESCE(v_comp.fixed_amount, 0);
      v_add_fixed := v_add_fixed + v_comp_amount;
    ELSIF v_comp.component_type = 'percentage_of_base_cost' THEN
      v_comp_amount := v_base_cost * COALESCE(v_comp.rate, 0);
      v_add_pct := v_add_pct + v_comp_amount;
    END IF;

    v_components := v_components || jsonb_build_object(
      'id', v_comp.id,
      'name', v_comp.name,
      'component_type', v_comp.component_type,
      'fixed_amount', v_comp.fixed_amount,
      'rate', v_comp.rate,
      'component_amount', v_comp_amount
    );
  END LOOP;

  v_add_total := v_add_fixed + v_add_pct;
  v_total_cost := v_base_cost + v_add_total;

  -- ── PRICING METHOD ──
  IF p_pricing_method = 'fixed_price' THEN
    v_calculated_price := p_fixed_price;

  ELSIF p_pricing_method = 'target_margin' THEN
    -- price = total_cost / (1 - margin_rate)
    IF p_target_margin_rate >= 1 OR p_target_margin_rate < 0 THEN
      RETURN jsonb_build_object(
        'status', 'PRICE_NOT_CALCULABLE',
        'reason', 'INVALID_MARGIN',
        'base_cost', v_base_cost,
        'total_cost', v_total_cost,
        'violations', to_jsonb(v_violations || 'INVALID_MARGIN'),
        'provenance', jsonb_build_object(
          'organization_id', p_organization_id,
          'pricing_policy_id', p_pricing_policy_id,
          'pricing_method', p_pricing_method
        )
      );
    END IF;
    v_calculated_price := v_total_cost / (1 - p_target_margin_rate);

  ELSIF p_pricing_method = 'markup' THEN
    -- price = total_cost * (1 + markup_rate)
    v_calculated_price := v_total_cost * (1 + p_markup_rate);

  ELSE
    RETURN jsonb_build_object(
      'status', 'PRICE_NOT_CALCULABLE',
      'reason', 'INVALID_METHOD',
      'violations', to_jsonb(v_violations || 'INVALID_METHOD')
    );
  END IF;

  -- ── ROUNDING ──
  IF p_rounding_mode IS NULL OR p_rounding_mode = 'none' OR p_rounding_step IS NULL OR p_rounding_step <= 0 THEN
    v_rounded_price := v_calculated_price;
  ELSIF p_rounding_mode = 'nearest' THEN
    v_rounded_price := round(v_calculated_price / p_rounding_step) * p_rounding_step;
  ELSIF p_rounding_mode = 'up' THEN
    v_rounded_price := ceil(v_calculated_price / p_rounding_step) * p_rounding_step;
  ELSIF p_rounding_mode = 'down' THEN
    v_rounded_price := floor(v_calculated_price / p_rounding_step) * p_rounding_step;
  ELSE
    v_rounded_price := v_calculated_price;
  END IF;

  -- ── DISCOUNT SIMULATION ──
  IF p_discount_rate IS NULL OR p_discount_rate = 0 THEN
    v_effective_price := v_rounded_price;
    v_discount_amount := 0;
  ELSE
    IF p_discount_rate < 0 OR p_discount_rate > 1 THEN
      RETURN jsonb_build_object(
        'status', 'PRICE_NOT_CALCULABLE',
        'reason', 'INVALID_DISCOUNT',
        'violations', to_jsonb(v_violations || 'INVALID_DISCOUNT')
      );
    END IF;

    v_discount_amount := v_rounded_price * p_discount_rate;
    v_effective_price := v_rounded_price - v_discount_amount;

    -- Check discount exceeds limit
    IF p_maximum_discount_rate IS NOT NULL AND p_discount_rate > p_maximum_discount_rate THEN
      v_violations := v_violations || 'DISCOUNT_EXCEEDS_LIMIT';
    END IF;
  END IF;

  -- ── FINAL METRICS ──
  v_gross_profit := v_effective_price - v_total_cost;

  -- Margin: margin_rate = (price - total_cost) / price (division by price, safe when price > 0)
  IF v_effective_price > 0 THEN
    v_margin_rate := v_gross_profit / v_effective_price;
  ELSE
    v_margin_rate := NULL;
    IF v_total_cost > 0 THEN
      v_warnings := v_warnings || 'ZERO_COST_DENOMINATOR';
    END IF;
  END IF;

  -- Markup: markup_rate = (price - total_cost) / total_cost (division by total_cost)
  IF v_total_cost > 0 THEN
    v_markup_rate := v_gross_profit / v_total_cost;
  ELSE
    v_markup_rate := NULL;
    v_warnings := v_warnings || 'ZERO_COST_DENOMINATOR';
  END IF;

  -- ── VIOLATIONS ──
  -- BELOW_COST
  IF v_effective_price < v_total_cost THEN
    v_violations := v_violations || 'BELOW_COST';
  END IF;

  -- BELOW_MINIMUM_MARGIN
  IF p_minimum_margin_rate IS NOT NULL AND v_effective_price > 0 THEN
    v_floor_price := v_total_cost / (1 - p_minimum_margin_rate);
    IF v_effective_price < v_floor_price THEN
      v_violations := v_violations || 'BELOW_MINIMUM_MARGIN';
    END IF;
  END IF;

  -- ── BUILD RESULT ──
  v_result := jsonb_build_object(
    'status', CASE WHEN array_length(v_violations, 1) > 0 THEN 'VIOLATIONS' ELSE 'OK' END,
    'base_cost', v_base_cost,
    'additional_fixed_total', v_add_fixed,
    'additional_percentage_total', v_add_pct,
    'additional_cost_total', v_add_total,
    'total_cost', v_total_cost,
    'pricing_method', p_pricing_method,
    'calculated_price', v_calculated_price,
    'rounded_price', v_rounded_price,
    'discount_rate', COALESCE(p_discount_rate, 0),
    'discount_amount', v_discount_amount,
    'effective_price', v_effective_price,
    'gross_profit', v_gross_profit,
    'margin_rate', v_margin_rate,
    'markup_rate', v_markup_rate,
    'margin_pct', CASE WHEN v_margin_rate IS NOT NULL THEN round(v_margin_rate * 100, 2) ELSE NULL END,
    'markup_pct', CASE WHEN v_markup_rate IS NOT NULL THEN round(v_markup_rate * 100, 2) ELSE NULL END,
    'components', v_components,
    'rounding', jsonb_build_object(
      'mode', p_rounding_mode,
      'step', p_rounding_step,
      'applied', v_rounded_price IS DISTINCT FROM v_calculated_price
    ),
    'warnings', to_jsonb(v_warnings),
    'violations', to_jsonb(v_violations),
    'provenance', jsonb_build_object(
      'organization_id', p_organization_id,
      'supplier_company_id', p_supplier_company_id,
      'catalog_item_id', p_catalog_item_id,
      'reference_date', p_reference_date,
      'cost', jsonb_build_object(
        'cost_status', p_cost_status,
        'cost_table_id', p_cost_table_id,
        'cost_version_id', p_cost_version_id,
        'cost_version_number', p_cost_version_number,
        'cost_valid_from', p_cost_valid_from,
        'cost_valid_to', p_cost_valid_to
      ),
      'policy', jsonb_build_object(
        'pricing_policy_id', p_pricing_policy_id,
        'pricing_policy_code', p_pricing_policy_code,
        'pricing_policy_name', p_pricing_policy_name,
        'scope_type', p_scope_type,
        'pricing_policy_version_id', p_policy_version_id,
        'policy_version_number', p_policy_version_number,
        'policy_valid_from', p_policy_valid_from,
        'policy_valid_to', p_policy_valid_to,
        'pricing_method', p_pricing_method
      )
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- fn_calculate_price is INTERNAL — not granted to application users directly
REVOKE EXECUTE ON FUNCTION fn_calculate_price(
  numeric, text, uuid, integer, date, date, uuid,
  text, numeric, numeric, numeric, numeric, numeric, text, numeric,
  numeric,
  uuid, uuid, uuid, date, uuid, uuid, integer, date, date, text, text, text
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_calculate_price(
  numeric, text, uuid, integer, date, date, uuid,
  text, numeric, numeric, numeric, numeric, numeric, text, numeric,
  numeric,
  uuid, uuid, uuid, date, uuid, uuid, integer, date, date, text, text, text
) FROM anon;
REVOKE EXECUTE ON FUNCTION fn_calculate_price(
  numeric, text, uuid, integer, date, date, uuid,
  text, numeric, numeric, numeric, numeric, numeric, text, numeric,
  numeric,
  uuid, uuid, uuid, date, uuid, uuid, integer, date, date, text, text, text
) FROM authenticated;

-- ============================================================
-- 3. fn_simulate_price — public orchestration RPC
-- ============================================================
-- Application-facing function that orchestrates:
-- authentication → pricing.calculate → tenant → catalog validation →
-- policy resolution → cost resolution → calculation → result
--
-- Does NOT persist any commercial price (PRC-05 boundary).

CREATE OR REPLACE FUNCTION fn_simulate_price(
  p_organization_id     uuid,
  p_supplier_company_id uuid,
  p_catalog_item_id     uuid,
  p_reference_date      date DEFAULT current_date,
  p_discount_rate       numeric(9,6) DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
  v_user_id          uuid;
  v_cost_result      record;
  v_policy_result    record;
  v_calc_result      jsonb;
  v_cost_status      text;
  v_cost_version_id  uuid;
  v_cost_version_num integer;
  v_cost_valid_from  date;
  v_cost_valid_to    date;
  v_cost_table_id    uuid;
BEGIN
  -- ── AUTHENTICATION ──
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'VALIDATION_FAILED',
      'reason', 'Authentication required'
    );
  END IF;

  -- ── MEMBERSHIP ──
  IF NOT is_member_of(p_organization_id) THEN
    RETURN jsonb_build_object(
      'status', 'VALIDATION_FAILED',
      'reason', 'Not a member of this organization'
    );
  END IF;

  -- ── PERMISSION ──
  IF NOT has_permission('pricing.calculate', p_organization_id) THEN
    RETURN jsonb_build_object(
      'status', 'VALIDATION_FAILED',
      'reason', 'Insufficient permissions (requires pricing.calculate)'
    );
  END IF;

  -- ── CATALOG ITEM VALIDATION ──
  IF NOT EXISTS (
    SELECT 1 FROM catalog_items ci
    WHERE ci.id = p_catalog_item_id
      AND ci.organization_id = p_organization_id
  ) THEN
    RETURN jsonb_build_object(
      'status', 'VALIDATION_FAILED',
      'reason', 'Catalog item not found in this organization'
    );
  END IF;

  -- ── POLICY RESOLUTION ──
  SELECT * INTO v_policy_result
  FROM fn_resolve_pricing_policy(p_organization_id, p_catalog_item_id, p_reference_date)
  LIMIT 1;

  IF v_policy_result IS NULL OR v_policy_result.resolution_status IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'POLICY_NOT_FOUND',
      'reason', 'No pricing policy resolved'
    );
  END IF;

  IF v_policy_result.resolution_status = 'POLICY_NOT_FOUND' THEN
    RETURN jsonb_build_object(
      'status', 'POLICY_NOT_FOUND',
      'reason', v_policy_result.reason,
      'provenance', jsonb_build_object(
        'organization_id', p_organization_id,
        'catalog_item_id', p_catalog_item_id,
        'reference_date', p_reference_date
      )
    );
  END IF;

  -- ── COST RESOLUTION ──
  SELECT
    scr.amount, scr.cost_status, scr.cost_table_id, scr.version_id,
    scr.version_number, scr.valid_from, scr.valid_to
  INTO
    v_cost_result.amount, v_cost_status, v_cost_table_id, v_cost_version_id,
    v_cost_version_num, v_cost_valid_from, v_cost_valid_to
  FROM fn_resolve_supplier_cost(
    p_organization_id, p_supplier_company_id, p_catalog_item_id, p_reference_date
  ) scr;

  -- ── CALCULATION ──
  v_calc_result := fn_calculate_price(
    p_base_cost             => COALESCE(v_cost_result.amount, 0),
    p_cost_status           => COALESCE(v_cost_status, 'COST_NOT_CONFIRMED'),
    p_cost_version_id       => v_cost_version_id,
    p_cost_version_number   => v_cost_version_num,
    p_cost_valid_from       => v_cost_valid_from,
    p_cost_valid_to         => v_cost_valid_to,
    p_cost_table_id         => v_cost_table_id,
    p_pricing_method        => v_policy_result.pricing_method,
    p_target_margin_rate    => v_policy_result.target_margin_rate,
    p_markup_rate           => v_policy_result.markup_rate,
    p_fixed_price           => v_policy_result.fixed_price,
    p_minimum_margin_rate   => v_policy_result.minimum_margin_rate,
    p_maximum_discount_rate => v_policy_result.maximum_discount_rate,
    p_rounding_mode         => v_policy_result.rounding_mode,
    p_rounding_step         => v_policy_result.rounding_step,
    p_discount_rate         => p_discount_rate,
    p_organization_id       => p_organization_id,
    p_supplier_company_id   => p_supplier_company_id,
    p_catalog_item_id       => p_catalog_item_id,
    p_reference_date        => p_reference_date,
    p_pricing_policy_id     => v_policy_result.pricing_policy_id,
    p_policy_version_id     => v_policy_result.pricing_policy_version_id,
    p_policy_version_number => v_policy_result.version_number,
    p_policy_valid_from     => v_policy_result.valid_from,
    p_policy_valid_to       => v_policy_result.valid_to,
    p_scope_type            => v_policy_result.scope_type,
    p_pricing_policy_code   => v_policy_result.pricing_policy_code,
    p_pricing_policy_name   => v_policy_result.pricing_policy_name
  );

  -- Override provenance with full context
  v_calc_result := jsonb_set(v_calc_result, '{provenance,organization_id}', to_jsonb(p_organization_id));
  v_calc_result := jsonb_set(v_calc_result, '{provenance,supplier_company_id}', to_jsonb(p_supplier_company_id));
  v_calc_result := jsonb_set(v_calc_result, '{provenance,catalog_item_id}', to_jsonb(p_catalog_item_id));
  v_calc_result := jsonb_set(v_calc_result, '{provenance,reference_date}', to_jsonb(p_reference_date));

  RETURN v_calc_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION fn_simulate_price(uuid, uuid, uuid, date, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_simulate_price(uuid, uuid, uuid, date, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION fn_simulate_price(uuid, uuid, uuid, date, numeric) TO authenticated;
