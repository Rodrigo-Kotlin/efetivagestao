-- PRC-06C: Isolated client-pricing component resolvers.

CREATE OR REPLACE FUNCTION public.fn_resolve_client_table_assignment(
  p_organization_id  uuid,
  p_client_company_id uuid,
  p_reference_date   date DEFAULT current_date
)
RETURNS jsonb AS $$
DECLARE
  v_company_status text;
  v_client_status text;
  v_assignment public.client_commercial_table_assignments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;
  IF p_client_company_id IS NULL THEN
    RAISE EXCEPTION 'client_company_id is required';
  END IF;
  IF p_reference_date IS NULL THEN
    RAISE EXCEPTION 'Reference date is required';
  END IF;

  IF NOT public.is_member_of(p_organization_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;
  IF NOT public.has_permission('pricing.client.view', p_organization_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.view)';
  END IF;

  SELECT c.status, cp.status
  INTO v_company_status, v_client_status
  FROM public.client_profiles cp
  JOIN public.companies c
    ON c.id = cp.company_id
   AND c.organization_id = cp.organization_id
  WHERE cp.company_id = p_client_company_id
    AND cp.organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'CLIENT_NOT_FOUND',
      'organization_id', p_organization_id,
      'client_company_id', p_client_company_id,
      'reference_date', p_reference_date
    );
  END IF;

  SELECT a.*
  INTO v_assignment
  FROM public.client_commercial_table_assignments a
  WHERE a.organization_id = p_organization_id
    AND a.client_company_id = p_client_company_id
    AND a.status IN ('active', 'scheduled', 'superseded')
    AND a.valid_from <= p_reference_date
    AND (a.valid_to IS NULL OR a.valid_to > p_reference_date)
  ORDER BY
    a.valid_from DESC,
    a.published_at DESC NULLS LAST,
    a.created_at DESC,
    a.id DESC
  LIMIT 1;

  IF v_assignment.id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'ASSIGNMENT_NOT_FOUND',
      'organization_id', p_organization_id,
      'client_company_id', p_client_company_id,
      'reference_date', p_reference_date,
      'client', jsonb_build_object(
        'company_id', p_client_company_id,
        'company_status', v_company_status,
        'client_profile_status', v_client_status
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'RESOLVED',
    'organization_id', p_organization_id,
    'client_company_id', p_client_company_id,
    'reference_date', p_reference_date,
    'client', jsonb_build_object(
      'company_id', p_client_company_id,
      'company_status', v_company_status,
      'client_profile_status', v_client_status
    ),
    'assignment', jsonb_build_object(
      'id', v_assignment.id,
      'status', v_assignment.status,
      'commercial_price_table_id', v_assignment.commercial_price_table_id,
      'valid_from', v_assignment.valid_from,
      'valid_to', v_assignment.valid_to
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_resolve_client_price_override(
  p_organization_id   uuid,
  p_client_company_id uuid,
  p_catalog_item_id   uuid,
  p_reference_date    date DEFAULT current_date
)
RETURNS jsonb AS $$
DECLARE
  v_company_status text;
  v_client_status text;
  v_item_status text;
  v_override public.client_price_overrides%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;
  IF p_client_company_id IS NULL THEN
    RAISE EXCEPTION 'client_company_id is required';
  END IF;
  IF p_catalog_item_id IS NULL THEN
    RAISE EXCEPTION 'catalog_item_id is required';
  END IF;
  IF p_reference_date IS NULL THEN
    RAISE EXCEPTION 'Reference date is required';
  END IF;

  IF NOT public.is_member_of(p_organization_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;
  IF NOT public.has_permission('pricing.client.view', p_organization_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.client.view)';
  END IF;

  SELECT c.status, cp.status
  INTO v_company_status, v_client_status
  FROM public.client_profiles cp
  JOIN public.companies c
    ON c.id = cp.company_id
   AND c.organization_id = cp.organization_id
  WHERE cp.company_id = p_client_company_id
    AND cp.organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'CLIENT_NOT_FOUND',
      'organization_id', p_organization_id,
      'client_company_id', p_client_company_id,
      'catalog_item_id', p_catalog_item_id,
      'reference_date', p_reference_date
    );
  END IF;

  SELECT ci.status
  INTO v_item_status
  FROM public.catalog_items ci
  WHERE ci.id = p_catalog_item_id
    AND ci.organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'ITEM_NOT_FOUND',
      'organization_id', p_organization_id,
      'client_company_id', p_client_company_id,
      'catalog_item_id', p_catalog_item_id,
      'reference_date', p_reference_date,
      'client', jsonb_build_object(
        'company_id', p_client_company_id,
        'company_status', v_company_status,
        'client_profile_status', v_client_status
      )
    );
  END IF;

  SELECT o.*
  INTO v_override
  FROM public.client_price_overrides o
  WHERE o.organization_id = p_organization_id
    AND o.client_company_id = p_client_company_id
    AND o.catalog_item_id = p_catalog_item_id
    AND o.status IN ('active', 'scheduled', 'superseded')
    AND o.valid_from <= p_reference_date
    AND (o.valid_to IS NULL OR o.valid_to > p_reference_date)
  ORDER BY
    o.valid_from DESC,
    o.published_at DESC NULLS LAST,
    o.created_at DESC,
    o.id DESC
  LIMIT 1;

  IF v_override.id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'OVERRIDE_NOT_FOUND',
      'organization_id', p_organization_id,
      'client_company_id', p_client_company_id,
      'catalog_item_id', p_catalog_item_id,
      'reference_date', p_reference_date,
      'client', jsonb_build_object(
        'company_id', p_client_company_id,
        'company_status', v_company_status,
        'client_profile_status', v_client_status
      ),
      'item', jsonb_build_object(
        'catalog_item_id', p_catalog_item_id,
        'status', v_item_status
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'RESOLVED',
    'organization_id', p_organization_id,
    'client_company_id', p_client_company_id,
    'catalog_item_id', p_catalog_item_id,
    'reference_date', p_reference_date,
    'client', jsonb_build_object(
      'company_id', p_client_company_id,
      'company_status', v_company_status,
      'client_profile_status', v_client_status
    ),
    'override', jsonb_build_object(
      'id', v_override.id,
      'status', v_override.status,
      'valid_from', v_override.valid_from,
      'valid_to', v_override.valid_to
    ),
    'item', jsonb_build_object(
      'catalog_item_id', v_override.catalog_item_id,
      'status', v_item_status,
      'item_code_snapshot', v_override.item_code_snapshot,
      'item_name_snapshot', v_override.item_name_snapshot,
      'item_type_snapshot', v_override.item_type_snapshot
    ),
    'price_amount', v_override.price_amount,
    'currency', v_override.currency,
    'reason', v_override.reason,
    'workflow', jsonb_build_object(
      'created_by', v_override.created_by,
      'created_at', v_override.created_at,
      'updated_by', v_override.updated_by,
      'updated_at', v_override.updated_at,
      'submitted_by', v_override.submitted_by,
      'submitted_at', v_override.submitted_at,
      'approved_by', v_override.approved_by,
      'approved_at', v_override.approved_at,
      'published_by', v_override.published_by,
      'published_at', v_override.published_at,
      'superseded_by', v_override.superseded_by,
      'superseded_at', v_override.superseded_at,
      'cancelled_by', v_override.cancelled_by,
      'cancelled_at', v_override.cancelled_at
    ),
    'provenance', CASE
      WHEN v_override.source_reference_date IS NULL THEN 'null'::jsonb
      ELSE jsonb_build_object(
        'source_reference_date', v_override.source_reference_date,
        'source_commercial_price_table_id', v_override.source_commercial_price_table_id,
        'source_commercial_price_table_version_id', v_override.source_commercial_price_table_version_id,
        'source_commercial_price_item_id', v_override.source_commercial_price_item_id,
        'source_table_price_amount', v_override.source_table_price_amount
      )
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.fn_resolve_client_table_assignment(uuid, uuid, date)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_resolve_client_price_override(uuid, uuid, uuid, date)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_resolve_client_table_assignment(uuid, uuid, date)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_resolve_client_price_override(uuid, uuid, uuid, date)
  TO authenticated;
