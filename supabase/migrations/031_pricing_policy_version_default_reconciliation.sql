-- 031_pricing_policy_version_default_reconciliation.sql
--
-- Reconcile fn_create_pricing_policy_version parameter default.
--
-- Migration 028 was applied remotely WITHOUT the DEFAULT on p_pricing_method.
-- A remote hotfix added: p_pricing_method text DEFAULT 'target_margin'.
-- This migration makes the canonical local history match the remote definition
-- so that a clean 001→031 rebuild produces the identical function.
--
-- Business semantics: UNCHANGED. All callers already pass p_pricing_method
-- explicitly; the default is a convenience for direct SQL callers only.

CREATE OR REPLACE FUNCTION public.fn_create_pricing_policy_version(
  p_policy_id            uuid,
  p_valid_from           date,
  p_valid_to             date        DEFAULT NULL,
  p_pricing_method       text        DEFAULT 'target_margin',
  p_target_margin_rate   numeric     DEFAULT NULL,
  p_markup_rate          numeric     DEFAULT NULL,
  p_fixed_price          numeric     DEFAULT NULL,
  p_minimum_margin_rate  numeric     DEFAULT NULL,
  p_maximum_discount_rate numeric   DEFAULT NULL,
  p_rounding_mode        text        DEFAULT 'none',
  p_rounding_step        numeric     DEFAULT NULL,
  p_notes                text        DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id     uuid;
  v_org_id      uuid;
  v_version_num integer;
  v_version_id  uuid;
  v_policy      record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- FOR UPDATE lock on the policy row (concurrency-safe)
  SELECT pp.id, pp.organization_id
  INTO v_policy
  FROM pricing_policies pp
  WHERE pp.id = p_policy_id
  FOR UPDATE;

  IF v_policy IS NULL THEN
    RAISE EXCEPTION 'Pricing policy not found';
  END IF;

  v_org_id := v_policy.organization_id;

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  IF NOT has_permission('pricing.policy.create', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.policy.create)';
  END IF;

  -- Atomic version number (under FOR UPDATE lock)
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_num
  FROM pricing_policy_versions
  WHERE pricing_policy_id = p_policy_id;

  INSERT INTO pricing_policy_versions (
    organization_id, pricing_policy_id, version_number,
    valid_from, valid_to, status,
    pricing_method, target_margin_rate, markup_rate, fixed_price,
    minimum_margin_rate, maximum_discount_rate,
    rounding_mode, rounding_step, notes,
    created_by
  ) VALUES (
    v_org_id, p_policy_id, v_version_num,
    p_valid_from, p_valid_to, 'draft',
    p_pricing_method, p_target_margin_rate, p_markup_rate, p_fixed_price,
    p_minimum_margin_rate, p_maximum_discount_rate,
    p_rounding_mode, p_rounding_step, p_notes,
    v_user_id
  ) RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$function$;

-- Ensure only the authenticated role can call this via the API
REVOKE ALL ON FUNCTION public.fn_create_pricing_policy_version(
  uuid, date, date, text, numeric, numeric, numeric, numeric, numeric, text, numeric, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_pricing_policy_version(
  uuid, date, date, text, numeric, numeric, numeric, numeric, numeric, text, numeric, text
) TO authenticated;
