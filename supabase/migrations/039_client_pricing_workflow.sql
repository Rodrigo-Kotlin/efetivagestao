-- PRC-06C: Client pricing application workflow RPCs.
-- Migrations 001-038 are immutable. Audit is emitted only by the 038 triggers.

-- ============================================================
-- 1. CLIENT PROFILE STATUS
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_set_client_profile_status(
  p_client_company_id uuid,
  p_status text,
  p_reason text
)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_current_status text;
  v_company_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('active', 'inactive', 'blocked') THEN
    RAISE EXCEPTION 'Invalid client profile status (allowed: active, inactive, blocked)';
  END IF;

  SELECT cp.organization_id
  INTO v_org_id
  FROM public.client_profiles cp
  WHERE cp.company_id = p_client_company_id;

  IF v_org_id IS NULL OR NOT public.is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Client profile not found';
  END IF;
  IF NOT public.has_permission('pricing.client.edit', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.edit)';
  END IF;

  SELECT cp.status, c.status
  INTO v_current_status, v_company_status
  FROM public.companies c
  JOIN public.client_profiles cp ON cp.company_id = c.id
  WHERE cp.company_id = p_client_company_id
    AND cp.organization_id = v_org_id
  FOR UPDATE OF c, cp;

  IF v_current_status = p_status THEN
    RAISE EXCEPTION 'Client profile is already in requested status';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Client profile status changes require a non-empty status reason';
  END IF;
  IF p_status = 'active' AND v_company_status <> 'active' THEN
    RAISE EXCEPTION 'An active client profile requires an active company';
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE public.client_profiles
  SET status = p_status,
      status_reason = btrim(p_reason)
  WHERE company_id = p_client_company_id;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. ASSIGNMENT WORKFLOW
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_submit_client_assignment(p_assignment_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_status text;
  v_client_id uuid;
  v_table_id uuid;
  v_company_status text;
  v_profile_status text;
  v_table_status text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT organization_id, status, client_company_id, commercial_price_table_id
  INTO v_org_id, v_status, v_client_id, v_table_id
  FROM public.client_commercial_table_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;

  IF v_org_id IS NULL OR NOT public.is_member_of(v_org_id) THEN RAISE EXCEPTION 'Client assignment not found'; END IF;
  IF NOT public.has_permission('pricing.client.review', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.review)';
  END IF;
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft client assignments can be submitted (current status=%)', v_status;
  END IF;

  SELECT c.status, cp.status
  INTO v_company_status, v_profile_status
  FROM public.companies c
  JOIN public.client_profiles cp ON cp.company_id = c.id
  WHERE cp.company_id = v_client_id AND cp.organization_id = v_org_id
  FOR UPDATE OF c, cp;

  SELECT status INTO v_table_status
  FROM public.commercial_price_tables
  WHERE id = v_table_id AND organization_id = v_org_id
  FOR UPDATE;

  IF v_company_status <> 'active' OR v_profile_status <> 'active' OR v_table_status <> 'active' THEN
    RAISE EXCEPTION 'Submitting an assignment requires an active company, client profile and commercial price table';
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE public.client_commercial_table_assignments SET status = 'under_review' WHERE id = p_assignment_id;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_return_client_assignment_to_draft(p_assignment_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_status text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT organization_id, status INTO v_org_id, v_status
  FROM public.client_commercial_table_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;

  IF v_org_id IS NULL OR NOT public.is_member_of(v_org_id) THEN RAISE EXCEPTION 'Client assignment not found'; END IF;
  IF NOT public.has_permission('pricing.client.review', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.review)';
  END IF;
  IF v_status <> 'under_review' THEN
    RAISE EXCEPTION 'Only under_review client assignments can be returned to draft (current status=%)', v_status;
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE public.client_commercial_table_assignments SET status = 'draft' WHERE id = p_assignment_id;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_approve_client_assignment(p_assignment_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_status text;
  v_client_id uuid;
  v_table_id uuid;
  v_company_status text;
  v_profile_status text;
  v_table_status text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT organization_id, status, client_company_id, commercial_price_table_id
  INTO v_org_id, v_status, v_client_id, v_table_id
  FROM public.client_commercial_table_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;

  IF v_org_id IS NULL OR NOT public.is_member_of(v_org_id) THEN RAISE EXCEPTION 'Client assignment not found'; END IF;
  IF NOT public.has_permission('pricing.client.approve', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.approve)';
  END IF;
  IF v_status <> 'under_review' THEN
    RAISE EXCEPTION 'Only under_review client assignments can be approved (current status=%)', v_status;
  END IF;

  SELECT c.status, cp.status
  INTO v_company_status, v_profile_status
  FROM public.companies c
  JOIN public.client_profiles cp ON cp.company_id = c.id
  WHERE cp.company_id = v_client_id AND cp.organization_id = v_org_id
  FOR UPDATE OF c, cp;

  SELECT status INTO v_table_status
  FROM public.commercial_price_tables
  WHERE id = v_table_id AND organization_id = v_org_id
  FOR UPDATE;

  IF v_company_status <> 'active' OR v_profile_status <> 'active' OR v_table_status <> 'active' THEN
    RAISE EXCEPTION 'Approving an assignment requires an active company, client profile and commercial price table';
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE public.client_commercial_table_assignments SET status = 'approved' WHERE id = p_assignment_id;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_cancel_client_assignment(p_assignment_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_status text;
  v_permission text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT organization_id, status INTO v_org_id, v_status
  FROM public.client_commercial_table_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;

  IF v_org_id IS NULL OR NOT public.is_member_of(v_org_id) THEN RAISE EXCEPTION 'Client assignment not found'; END IF;
  IF v_status NOT IN ('draft', 'under_review', 'approved') THEN
    RAISE EXCEPTION 'Cannot cancel client assignment with status %', v_status;
  END IF;

  v_permission := CASE v_status
    WHEN 'draft' THEN 'pricing.client.edit'
    WHEN 'under_review' THEN 'pricing.client.review'
    WHEN 'approved' THEN 'pricing.client.approve'
  END;
  IF NOT public.has_permission(v_permission, v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires %)', v_permission;
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE public.client_commercial_table_assignments SET status = 'cancelled' WHERE id = p_assignment_id;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_publish_client_assignment(p_assignment_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_initial_status text;
  v_status text;
  v_client_id uuid;
  v_table_id uuid;
  v_valid_from date;
  v_valid_to date;
  v_effective_to date;
  v_company_status text;
  v_profile_status text;
  v_table_status text;
  v_predecessor_id uuid;
  v_predecessor_status text;
  v_successor_start date;
  v_new_status text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT organization_id, client_company_id, status
  INTO v_org_id, v_client_id, v_initial_status
  FROM public.client_commercial_table_assignments
  WHERE id = p_assignment_id;

  IF v_org_id IS NULL OR NOT public.is_member_of(v_org_id) THEN RAISE EXCEPTION 'Client assignment not found'; END IF;
  IF NOT public.has_permission('pricing.client.publish', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.publish)';
  END IF;
  IF v_initial_status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved client assignments can be published (current status=%)', v_initial_status;
  END IF;

  -- The client profile is the serialization point for its assignment timeline.
  SELECT c.status, cp.status
  INTO v_company_status, v_profile_status
  FROM public.companies c
  JOIN public.client_profiles cp ON cp.company_id = c.id
  WHERE cp.company_id = v_client_id AND cp.organization_id = v_org_id
  FOR UPDATE OF c, cp;

  SELECT status, commercial_price_table_id, valid_from, valid_to, client_company_id
  INTO v_status, v_table_id, v_valid_from, v_valid_to, v_client_id
  FROM public.client_commercial_table_assignments
  WHERE id = p_assignment_id AND organization_id = v_org_id
  FOR UPDATE;

  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved client assignments can be published (current status=%)', v_status;
  END IF;

  SELECT status INTO v_table_status
  FROM public.commercial_price_tables
  WHERE id = v_table_id AND organization_id = v_org_id
  FOR UPDATE;

  IF v_company_status <> 'active' OR v_profile_status <> 'active' OR v_table_status <> 'active' THEN
    RAISE EXCEPTION 'Publishing an assignment requires an active company, client profile and commercial price table';
  END IF;
  IF v_valid_from < current_date THEN
    RAISE EXCEPTION 'Retroactive client assignment publication is not allowed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.client_commercial_table_assignments a
    WHERE a.organization_id = v_org_id
      AND a.client_company_id = v_client_id
      AND a.status = 'scheduled'
      AND a.valid_from <= current_date
  ) THEN
    RAISE EXCEPTION 'A scheduled client assignment is due; run assignment status sync before publishing';
  END IF;

  SELECT a.id, a.status
  INTO v_predecessor_id, v_predecessor_status
  FROM public.client_commercial_table_assignments a
  WHERE a.organization_id = v_org_id
    AND a.client_company_id = v_client_id
    AND a.id <> p_assignment_id
    AND a.status IN ('active', 'scheduled')
    AND a.valid_from < v_valid_from
    AND (a.valid_to IS NULL OR a.valid_to > v_valid_from)
  ORDER BY a.valid_from DESC, a.created_at DESC, a.id DESC
  LIMIT 1;

  SELECT min(a.valid_from)
  INTO v_successor_start
  FROM public.client_commercial_table_assignments a
  WHERE a.organization_id = v_org_id
    AND a.client_company_id = v_client_id
    AND a.id <> p_assignment_id
    AND a.status IN ('active', 'scheduled')
    AND a.valid_from > v_valid_from;

  v_effective_to := v_valid_to;
  IF v_successor_start IS NOT NULL
     AND (v_effective_to IS NULL OR v_effective_to > v_successor_start) THEN
    v_effective_to := v_successor_start;
  END IF;

  -- Report overlap before the deferred GiST exclusion does so at commit.
  IF EXISTS (
    SELECT 1 FROM public.client_commercial_table_assignments a
    WHERE a.organization_id = v_org_id
      AND a.client_company_id = v_client_id
      AND a.id <> p_assignment_id
      AND a.id IS DISTINCT FROM v_predecessor_id
      AND a.status IN ('active', 'scheduled')
      AND daterange(a.valid_from, a.valid_to, '[)') && daterange(v_valid_from, v_effective_to, '[)')
  ) THEN
    RAISE EXCEPTION 'Client assignment publication overlaps an existing active or scheduled assignment';
  END IF;

  v_new_status := CASE WHEN v_valid_from = current_date THEN 'active' ELSE 'scheduled' END;
  IF v_new_status = 'active' AND v_predecessor_id IS NOT NULL AND v_predecessor_status <> 'active' THEN
    RAISE EXCEPTION 'Immediate publication requires status sync before replacing a due scheduled assignment';
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);

  IF v_predecessor_id IS NOT NULL THEN
    IF v_new_status = 'active' THEN
      UPDATE public.client_commercial_table_assignments
      SET valid_to = v_valid_from,
          status = 'superseded'
      WHERE id = v_predecessor_id;
    ELSE
      UPDATE public.client_commercial_table_assignments
      SET valid_to = v_valid_from
      WHERE id = v_predecessor_id;
    END IF;
  END IF;

  UPDATE public.client_commercial_table_assignments
  SET valid_to = v_effective_to,
      status = v_new_status
  WHERE id = p_assignment_id;

  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_sync_client_assignment_status(
  p_reference_date date DEFAULT current_date
)
RETURNS integer AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_candidate record;
  v_status text;
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_reference_date IS NULL THEN RAISE EXCEPTION 'Reference date is required'; END IF;
  IF p_reference_date > current_date THEN RAISE EXCEPTION 'Future reference dates are not allowed for assignment status sync'; END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_memberships m
    WHERE m.user_id = v_user_id
      AND m.status = 'active'
      AND public.has_permission('pricing.client.publish', m.organization_id)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.publish)';
  END IF;

  FOR v_candidate IN
    SELECT a.id, a.organization_id, a.client_company_id,
           a.commercial_price_table_id, a.valid_from, a.valid_to
    FROM public.client_commercial_table_assignments a
    WHERE a.status = 'scheduled'
      AND a.valid_from <= p_reference_date
      AND public.is_member_of(a.organization_id)
      AND public.has_permission('pricing.client.publish', a.organization_id)
    ORDER BY a.organization_id, a.client_company_id, a.valid_from, a.created_at, a.id
  LOOP
    -- Lock eligibility dependencies for serialization only; cutover does not revalidate them.
    PERFORM 1
    FROM public.companies c
    JOIN public.client_profiles cp ON cp.company_id = c.id
    WHERE cp.company_id = v_candidate.client_company_id
      AND cp.organization_id = v_candidate.organization_id
    FOR UPDATE OF c, cp;

    PERFORM 1
    FROM public.commercial_price_tables t
    WHERE t.id = v_candidate.commercial_price_table_id
      AND t.organization_id = v_candidate.organization_id
    FOR UPDATE;

    SELECT status INTO v_status
    FROM public.client_commercial_table_assignments
    WHERE id = v_candidate.id
      AND status = 'scheduled'
      AND valid_from <= p_reference_date
    FOR UPDATE;

    IF v_status IS DISTINCT FROM 'scheduled' THEN CONTINUE; END IF;

    PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
    UPDATE public.client_commercial_table_assignments
    SET status = 'superseded'
    WHERE organization_id = v_candidate.organization_id
      AND client_company_id = v_candidate.client_company_id
      AND status = 'active'
      AND valid_from < v_candidate.valid_from
      AND valid_to IS NOT NULL
      AND valid_to <= v_candidate.valid_from;

    UPDATE public.client_commercial_table_assignments
    SET status = 'active'
    WHERE id = v_candidate.id;

    IF v_candidate.valid_to IS NOT NULL
       AND v_candidate.valid_to <= p_reference_date THEN
      UPDATE public.client_commercial_table_assignments
      SET status = 'superseded'
      WHERE id = v_candidate.id;
    END IF;
    PERFORM set_config('app.client_pricing_rpc_active', 'false', true);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. OVERRIDE WORKFLOW
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_submit_client_price_override(p_override_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_status text;
  v_client_id uuid;
  v_item_id uuid;
  v_reason text;
  v_company_status text;
  v_profile_status text;
  v_item_status text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT organization_id, status, client_company_id, catalog_item_id, reason
  INTO v_org_id, v_status, v_client_id, v_item_id, v_reason
  FROM public.client_price_overrides
  WHERE id = p_override_id
  FOR UPDATE;

  IF v_org_id IS NULL OR NOT public.is_member_of(v_org_id) THEN RAISE EXCEPTION 'Client price override not found'; END IF;
  IF NOT public.has_permission('pricing.client.review', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.review)';
  END IF;
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft client price overrides can be submitted (current status=%)', v_status;
  END IF;
  IF v_reason IS NULL OR btrim(v_reason) = '' THEN
    RAISE EXCEPTION 'Client price override reason is required before submission';
  END IF;

  SELECT c.status, cp.status
  INTO v_company_status, v_profile_status
  FROM public.companies c
  JOIN public.client_profiles cp ON cp.company_id = c.id
  WHERE cp.company_id = v_client_id AND cp.organization_id = v_org_id
  FOR UPDATE OF c, cp;

  SELECT status INTO v_item_status
  FROM public.catalog_items
  WHERE id = v_item_id AND organization_id = v_org_id
  FOR UPDATE;

  IF v_company_status <> 'active' OR v_profile_status <> 'active' OR v_item_status <> 'active' THEN
    RAISE EXCEPTION 'Submitting an override requires an active company, client profile and catalog item';
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE public.client_price_overrides SET status = 'under_review' WHERE id = p_override_id;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_return_client_price_override_to_draft(p_override_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_status text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT organization_id, status INTO v_org_id, v_status
  FROM public.client_price_overrides
  WHERE id = p_override_id
  FOR UPDATE;

  IF v_org_id IS NULL OR NOT public.is_member_of(v_org_id) THEN RAISE EXCEPTION 'Client price override not found'; END IF;
  IF NOT public.has_permission('pricing.client.review', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.review)';
  END IF;
  IF v_status <> 'under_review' THEN
    RAISE EXCEPTION 'Only under_review client price overrides can be returned to draft (current status=%)', v_status;
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE public.client_price_overrides SET status = 'draft' WHERE id = p_override_id;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_approve_client_price_override(p_override_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_status text;
  v_client_id uuid;
  v_item_id uuid;
  v_reason text;
  v_company_status text;
  v_profile_status text;
  v_item_status text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT organization_id, status, client_company_id, catalog_item_id, reason
  INTO v_org_id, v_status, v_client_id, v_item_id, v_reason
  FROM public.client_price_overrides
  WHERE id = p_override_id
  FOR UPDATE;

  IF v_org_id IS NULL OR NOT public.is_member_of(v_org_id) THEN RAISE EXCEPTION 'Client price override not found'; END IF;
  IF NOT public.has_permission('pricing.client.approve', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.approve)';
  END IF;
  IF v_status <> 'under_review' THEN
    RAISE EXCEPTION 'Only under_review client price overrides can be approved (current status=%)', v_status;
  END IF;
  IF v_reason IS NULL OR btrim(v_reason) = '' THEN
    RAISE EXCEPTION 'Client price override reason is required before approval';
  END IF;

  SELECT c.status, cp.status
  INTO v_company_status, v_profile_status
  FROM public.companies c
  JOIN public.client_profiles cp ON cp.company_id = c.id
  WHERE cp.company_id = v_client_id AND cp.organization_id = v_org_id
  FOR UPDATE OF c, cp;

  SELECT status INTO v_item_status
  FROM public.catalog_items
  WHERE id = v_item_id AND organization_id = v_org_id
  FOR UPDATE;

  IF v_company_status <> 'active' OR v_profile_status <> 'active' OR v_item_status <> 'active' THEN
    RAISE EXCEPTION 'Approving an override requires an active company, client profile and catalog item';
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE public.client_price_overrides SET status = 'approved' WHERE id = p_override_id;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_cancel_client_price_override(p_override_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_status text;
  v_permission text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT organization_id, status INTO v_org_id, v_status
  FROM public.client_price_overrides
  WHERE id = p_override_id
  FOR UPDATE;

  IF v_org_id IS NULL OR NOT public.is_member_of(v_org_id) THEN RAISE EXCEPTION 'Client price override not found'; END IF;
  IF v_status NOT IN ('draft', 'under_review', 'approved') THEN
    RAISE EXCEPTION 'Cannot cancel client price override with status %', v_status;
  END IF;

  v_permission := CASE v_status
    WHEN 'draft' THEN 'pricing.client.edit'
    WHEN 'under_review' THEN 'pricing.client.review'
    WHEN 'approved' THEN 'pricing.client.approve'
  END;
  IF NOT public.has_permission(v_permission, v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires %)', v_permission;
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE public.client_price_overrides SET status = 'cancelled' WHERE id = p_override_id;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_publish_client_price_override(p_override_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_initial_status text;
  v_status text;
  v_client_id uuid;
  v_item_id uuid;
  v_reason text;
  v_valid_from date;
  v_valid_to date;
  v_effective_to date;
  v_company_status text;
  v_profile_status text;
  v_item_status text;
  v_predecessor_id uuid;
  v_predecessor_status text;
  v_successor_start date;
  v_new_status text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT organization_id, client_company_id, status
  INTO v_org_id, v_client_id, v_initial_status
  FROM public.client_price_overrides
  WHERE id = p_override_id;

  IF v_org_id IS NULL OR NOT public.is_member_of(v_org_id) THEN RAISE EXCEPTION 'Client price override not found'; END IF;
  IF NOT public.has_permission('pricing.client.publish', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.publish)';
  END IF;
  IF v_initial_status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved client price overrides can be published (current status=%)', v_initial_status;
  END IF;

  -- The client profile serializes timeline edits; the item locks eligibility.
  SELECT c.status, cp.status
  INTO v_company_status, v_profile_status
  FROM public.companies c
  JOIN public.client_profiles cp ON cp.company_id = c.id
  WHERE cp.company_id = v_client_id AND cp.organization_id = v_org_id
  FOR UPDATE OF c, cp;

  SELECT status, catalog_item_id, reason, valid_from, valid_to, client_company_id
  INTO v_status, v_item_id, v_reason, v_valid_from, v_valid_to, v_client_id
  FROM public.client_price_overrides
  WHERE id = p_override_id AND organization_id = v_org_id
  FOR UPDATE;

  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved client price overrides can be published (current status=%)', v_status;
  END IF;
  IF v_reason IS NULL OR btrim(v_reason) = '' THEN
    RAISE EXCEPTION 'Client price override reason is required before publication';
  END IF;

  SELECT status INTO v_item_status
  FROM public.catalog_items
  WHERE id = v_item_id AND organization_id = v_org_id
  FOR UPDATE;

  IF v_company_status <> 'active' OR v_profile_status <> 'active' OR v_item_status <> 'active' THEN
    RAISE EXCEPTION 'Publishing an override requires an active company, client profile and catalog item';
  END IF;
  IF v_valid_from < current_date THEN
    RAISE EXCEPTION 'Retroactive client price override publication is not allowed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.client_price_overrides o
    WHERE o.organization_id = v_org_id
      AND o.client_company_id = v_client_id
      AND o.catalog_item_id = v_item_id
      AND o.status = 'scheduled'
      AND o.valid_from <= current_date
  ) THEN
    RAISE EXCEPTION 'A scheduled client price override is due; run override status sync before publishing';
  END IF;

  SELECT o.id, o.status
  INTO v_predecessor_id, v_predecessor_status
  FROM public.client_price_overrides o
  WHERE o.organization_id = v_org_id
    AND o.client_company_id = v_client_id
    AND o.catalog_item_id = v_item_id
    AND o.id <> p_override_id
    AND o.status IN ('active', 'scheduled')
    AND o.valid_from < v_valid_from
    AND (o.valid_to IS NULL OR o.valid_to > v_valid_from)
  ORDER BY o.valid_from DESC, o.created_at DESC, o.id DESC
  LIMIT 1;

  SELECT min(o.valid_from)
  INTO v_successor_start
  FROM public.client_price_overrides o
  WHERE o.organization_id = v_org_id
    AND o.client_company_id = v_client_id
    AND o.catalog_item_id = v_item_id
    AND o.id <> p_override_id
    AND o.status IN ('active', 'scheduled')
    AND o.valid_from > v_valid_from;

  v_effective_to := v_valid_to;
  IF v_successor_start IS NOT NULL
     AND (v_effective_to IS NULL OR v_effective_to > v_successor_start) THEN
    v_effective_to := v_successor_start;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.client_price_overrides o
    WHERE o.organization_id = v_org_id
      AND o.client_company_id = v_client_id
      AND o.catalog_item_id = v_item_id
      AND o.id <> p_override_id
      AND o.id IS DISTINCT FROM v_predecessor_id
      AND o.status IN ('active', 'scheduled')
      AND daterange(o.valid_from, o.valid_to, '[)') && daterange(v_valid_from, v_effective_to, '[)')
  ) THEN
    RAISE EXCEPTION 'Client price override publication overlaps an existing active or scheduled override';
  END IF;

  v_new_status := CASE WHEN v_valid_from = current_date THEN 'active' ELSE 'scheduled' END;
  IF v_new_status = 'active' AND v_predecessor_id IS NOT NULL AND v_predecessor_status <> 'active' THEN
    RAISE EXCEPTION 'Immediate publication requires status sync before replacing a due scheduled override';
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);

  IF v_predecessor_id IS NOT NULL THEN
    IF v_new_status = 'active' THEN
      UPDATE public.client_price_overrides
      SET valid_to = v_valid_from,
          status = 'superseded'
      WHERE id = v_predecessor_id;
    ELSE
      UPDATE public.client_price_overrides
      SET valid_to = v_valid_from
      WHERE id = v_predecessor_id;
    END IF;
  END IF;

  UPDATE public.client_price_overrides
  SET valid_to = v_effective_to,
      status = v_new_status
  WHERE id = p_override_id;

  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_sync_client_price_override_status(
  p_reference_date date DEFAULT current_date
)
RETURNS integer AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_candidate record;
  v_status text;
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_reference_date IS NULL THEN RAISE EXCEPTION 'Reference date is required'; END IF;
  IF p_reference_date > current_date THEN RAISE EXCEPTION 'Future reference dates are not allowed for override status sync'; END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_memberships m
    WHERE m.user_id = v_user_id
      AND m.status = 'active'
      AND public.has_permission('pricing.client.publish', m.organization_id)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.publish)';
  END IF;

  FOR v_candidate IN
    SELECT o.id, o.organization_id, o.client_company_id,
           o.catalog_item_id, o.valid_from, o.valid_to
    FROM public.client_price_overrides o
    WHERE o.status = 'scheduled'
      AND o.valid_from <= p_reference_date
      AND public.is_member_of(o.organization_id)
      AND public.has_permission('pricing.client.publish', o.organization_id)
    ORDER BY o.organization_id, o.client_company_id, o.catalog_item_id,
             o.valid_from, o.created_at, o.id
  LOOP
    PERFORM 1
    FROM public.companies c
    JOIN public.client_profiles cp ON cp.company_id = c.id
    WHERE cp.company_id = v_candidate.client_company_id
      AND cp.organization_id = v_candidate.organization_id
    FOR UPDATE OF c, cp;

    PERFORM 1
    FROM public.catalog_items i
    WHERE i.id = v_candidate.catalog_item_id
      AND i.organization_id = v_candidate.organization_id
    FOR UPDATE;

    SELECT status INTO v_status
    FROM public.client_price_overrides
    WHERE id = v_candidate.id
      AND status = 'scheduled'
      AND valid_from <= p_reference_date
    FOR UPDATE;

    IF v_status IS DISTINCT FROM 'scheduled' THEN CONTINUE; END IF;

    PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
    UPDATE public.client_price_overrides
    SET status = 'superseded'
    WHERE organization_id = v_candidate.organization_id
      AND client_company_id = v_candidate.client_company_id
      AND catalog_item_id = v_candidate.catalog_item_id
      AND status = 'active'
      AND valid_from < v_candidate.valid_from
      AND valid_to IS NOT NULL
      AND valid_to <= v_candidate.valid_from;

    UPDATE public.client_price_overrides
    SET status = 'active'
    WHERE id = v_candidate.id;

    IF v_candidate.valid_to IS NOT NULL
       AND v_candidate.valid_to <= p_reference_date THEN
      UPDATE public.client_price_overrides
      SET status = 'superseded'
      WHERE id = v_candidate.id;
    END IF;
    PERFORM set_config('app.client_pricing_rpc_active', 'false', true);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. OPTIONAL TABLE-BASELINE PROVENANCE
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_capture_client_override_table_provenance(
  p_override_id uuid,
  p_reference_date date DEFAULT current_date
)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_status text;
  v_client_id uuid;
  v_item_id uuid;
  v_assignment jsonb;
  v_table_price jsonb;
  v_table_id uuid;
  v_version_id uuid;
  v_price_item_id uuid;
  v_table_price_amount numeric(14,4);
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_reference_date IS NULL THEN RAISE EXCEPTION 'Reference date is required'; END IF;

  SELECT organization_id, status, client_company_id, catalog_item_id
  INTO v_org_id, v_status, v_client_id, v_item_id
  FROM public.client_price_overrides
  WHERE id = p_override_id
  FOR UPDATE;

  IF v_org_id IS NULL OR NOT public.is_member_of(v_org_id) THEN RAISE EXCEPTION 'Client price override not found'; END IF;
  IF NOT public.has_permission('pricing.client.edit', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.edit)';
  END IF;
  IF NOT public.has_permission('pricing.client.view', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.view)';
  END IF;
  IF NOT public.has_permission('pricing.commercial.view', v_org_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.commercial.view)';
  END IF;
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Table provenance can be captured only for a draft client price override';
  END IF;

  -- Migration 040 supplies this resolver, so defer name resolution until call time.
  EXECUTE
    'SELECT public.fn_resolve_client_table_assignment($1, $2, $3)'
  INTO v_assignment
  USING v_org_id, v_client_id, p_reference_date;
  IF v_assignment->>'status' <> 'RESOLVED' THEN
    RAISE EXCEPTION 'No client table assignment resolves on % (status=%)',
      p_reference_date, v_assignment->>'status';
  END IF;

  v_table_id := (v_assignment #>> '{assignment,commercial_price_table_id}')::uuid;
  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'Resolved assignment did not return a commercial price table';
  END IF;

  v_table_price := public.fn_resolve_commercial_table_price(
    v_org_id, v_table_id, v_item_id, p_reference_date
  );
  IF v_table_price->>'status' <> 'RESOLVED' THEN
    RAISE EXCEPTION 'Assigned table price did not resolve on % (status=%)',
      p_reference_date, v_table_price->>'status';
  END IF;

  v_version_id := (v_table_price #>> '{version,id}')::uuid;
  v_price_item_id := (v_table_price #>> '{item,commercial_price_item_id}')::uuid;
  v_table_price_amount := (v_table_price->>'price_amount')::numeric(14,4);

  IF v_version_id IS NULL OR v_price_item_id IS NULL OR v_table_price_amount IS NULL THEN
    RAISE EXCEPTION 'Commercial table resolver returned incomplete provenance';
  END IF;

  PERFORM set_config('app.client_pricing_rpc_active', 'true', true);
  UPDATE public.client_price_overrides
  SET source_reference_date = p_reference_date,
      source_commercial_price_table_id = v_table_id,
      source_commercial_price_table_version_id = v_version_id,
      source_commercial_price_item_id = v_price_item_id,
      source_table_price_amount = v_table_price_amount
  WHERE id = p_override_id;
  PERFORM set_config('app.client_pricing_rpc_active', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. EXACT APPLICATION EXPOSURE
-- ============================================================

REVOKE ALL ON FUNCTION public.fn_set_client_profile_status(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_submit_client_assignment(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_return_client_assignment_to_draft(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_approve_client_assignment(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cancel_client_assignment(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_publish_client_assignment(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_sync_client_assignment_status(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_submit_client_price_override(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_return_client_price_override_to_draft(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_approve_client_price_override(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cancel_client_price_override(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_publish_client_price_override(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_sync_client_price_override_status(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_capture_client_override_table_provenance(uuid, date) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_set_client_profile_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_submit_client_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_return_client_assignment_to_draft(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_approve_client_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cancel_client_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_publish_client_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sync_client_assignment_status(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_submit_client_price_override(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_return_client_price_override_to_draft(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_approve_client_price_override(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cancel_client_price_override(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_publish_client_price_override(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sync_client_price_override_status(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_capture_client_override_table_provenance(uuid, date) TO authenticated;
