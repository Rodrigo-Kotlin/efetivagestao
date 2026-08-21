-- PRC-07B: Authoritative final commercial price resolver.
-- Migrations 001-040 are immutable.

CREATE OR REPLACE FUNCTION public.fn_resolve_final_client_price(
  p_organization_id   uuid,
  p_client_company_id uuid,
  p_catalog_item_id   uuid,
  p_reference_date    date DEFAULT current_date
)
RETURNS jsonb AS $$
DECLARE
  v_override_result       jsonb;
  v_assignment_result     jsonb;
  v_table_result          jsonb;
  v_override_status       text;
  v_assignment_status     text;
  v_table_status          text;
  v_client_status         text;
  v_override_id           uuid;
  v_assignment_id         uuid;
  v_table_id              uuid;
  v_version_id            uuid;
  v_commercial_item_id    uuid;
  v_source_table_id       uuid;
  v_source_version_id     uuid;
  v_source_item_id        uuid;
  v_price_amount          numeric;
  v_provenance            jsonb;
  v_source_refs           jsonb;
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
  IF NOT public.has_permission('pricing.commercial.view', p_organization_id) THEN
    RAISE EXCEPTION 'Insufficient permissions (requires pricing.commercial.view)';
  END IF;

  v_override_result := public.fn_resolve_client_price_override(
    p_organization_id,
    p_client_company_id,
    p_catalog_item_id,
    p_reference_date
  );

  IF jsonb_typeof(v_override_result) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Final price resolver integrity error: invalid override payload';
  END IF;

  v_override_status := v_override_result->>'status';
  IF v_override_status IS NULL
     OR v_override_result->>'organization_id' IS DISTINCT FROM p_organization_id::text
     OR v_override_result->>'client_company_id' IS DISTINCT FROM p_client_company_id::text
     OR v_override_result->>'catalog_item_id' IS DISTINCT FROM p_catalog_item_id::text
     OR v_override_result->>'reference_date' IS DISTINCT FROM p_reference_date::text THEN
    RAISE EXCEPTION 'Final price resolver integrity error: contradictory override payload';
  END IF;

  IF v_override_status = 'CLIENT_NOT_FOUND' THEN
    RETURN jsonb_build_object(
      'status', 'CLIENT_NOT_FOUND',
      'source', NULL,
      'reason_code', NULL,
      'reference_date', p_reference_date,
      'organization_id', p_organization_id,
      'client_company_id', p_client_company_id,
      'catalog_item_id', p_catalog_item_id,
      'price_amount', NULL,
      'currency', NULL,
      'client_profile_status', NULL,
      'source_refs', NULL,
      'trace', jsonb_build_object(
        'override_status', 'CLIENT_NOT_FOUND',
        'assignment_status', NULL,
        'table_price_status', NULL
      )
    );
  END IF;

  v_client_status := v_override_result#>>'{client,client_profile_status}';
  IF v_client_status IS NULL THEN
    RAISE EXCEPTION 'Final price resolver integrity error: override payload missing client status';
  END IF;

  IF v_override_status = 'ITEM_NOT_FOUND' THEN
    RETURN jsonb_build_object(
      'status', 'ITEM_NOT_FOUND',
      'source', NULL,
      'reason_code', NULL,
      'reference_date', p_reference_date,
      'organization_id', p_organization_id,
      'client_company_id', p_client_company_id,
      'catalog_item_id', p_catalog_item_id,
      'price_amount', NULL,
      'currency', NULL,
      'client_profile_status', v_client_status,
      'source_refs', NULL,
      'trace', jsonb_build_object(
        'override_status', 'ITEM_NOT_FOUND',
        'assignment_status', NULL,
        'table_price_status', NULL
      )
    );
  END IF;

  IF v_override_status = 'RESOLVED' THEN
    IF jsonb_typeof(v_override_result->'price_amount') IS DISTINCT FROM 'number'
       OR v_override_result->>'currency' IS DISTINCT FROM 'BRL'
       OR v_override_result#>>'{override,id}' IS NULL THEN
      RAISE EXCEPTION 'Final price resolver integrity error: invalid resolved override';
    END IF;

    BEGIN
      v_override_id := (v_override_result#>>'{override,id}')::uuid;
      v_price_amount := (v_override_result->>'price_amount')::numeric;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Final price resolver integrity error: invalid resolved override types';
    END;

    IF v_price_amount IS NULL THEN
      RAISE EXCEPTION 'Final price resolver integrity error: override price is required';
    END IF;

    v_source_refs := jsonb_build_object('override_id', v_override_id);
    v_provenance := v_override_result->'provenance';

    IF v_provenance IS NOT NULL AND v_provenance <> 'null'::jsonb THEN
      IF jsonb_typeof(v_provenance) IS DISTINCT FROM 'object'
         OR v_provenance->>'source_commercial_price_table_id' IS NULL
         OR v_provenance->>'source_commercial_price_table_version_id' IS NULL
         OR v_provenance->>'source_commercial_price_item_id' IS NULL THEN
        RAISE EXCEPTION 'Final price resolver integrity error: partial override provenance';
      END IF;

      BEGIN
        v_source_table_id := (v_provenance->>'source_commercial_price_table_id')::uuid;
        v_source_version_id := (v_provenance->>'source_commercial_price_table_version_id')::uuid;
        v_source_item_id := (v_provenance->>'source_commercial_price_item_id')::uuid;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Final price resolver integrity error: invalid override provenance types';
      END;

      v_source_refs := v_source_refs || jsonb_build_object(
        'source_commercial_price_table_id', v_source_table_id,
        'source_commercial_price_table_version_id', v_source_version_id,
        'source_commercial_price_item_id', v_source_item_id
      );
    END IF;

    RETURN jsonb_build_object(
      'status', 'RESOLVED',
      'source', 'CLIENT_OVERRIDE',
      'reason_code', NULL,
      'reference_date', p_reference_date,
      'organization_id', p_organization_id,
      'client_company_id', p_client_company_id,
      'catalog_item_id', p_catalog_item_id,
      'price_amount', v_price_amount,
      'currency', 'BRL',
      'client_profile_status', v_client_status,
      'source_refs', v_source_refs,
      'trace', jsonb_build_object(
        'override_status', 'RESOLVED',
        'assignment_status', NULL,
        'table_price_status', NULL
      )
    );
  END IF;

  IF v_override_status <> 'OVERRIDE_NOT_FOUND' THEN
    RAISE EXCEPTION 'Final price resolver integrity error: unexpected override status %', v_override_status;
  END IF;

  v_assignment_result := public.fn_resolve_client_table_assignment(
    p_organization_id,
    p_client_company_id,
    p_reference_date
  );

  IF jsonb_typeof(v_assignment_result) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Final price resolver integrity error: invalid assignment payload';
  END IF;

  v_assignment_status := v_assignment_result->>'status';
  IF v_assignment_status IS NULL
     OR v_assignment_result->>'organization_id' IS DISTINCT FROM p_organization_id::text
     OR v_assignment_result->>'client_company_id' IS DISTINCT FROM p_client_company_id::text
     OR v_assignment_result->>'reference_date' IS DISTINCT FROM p_reference_date::text THEN
    RAISE EXCEPTION 'Final price resolver integrity error: contradictory assignment payload';
  END IF;

  IF v_assignment_status = 'CLIENT_NOT_FOUND' THEN
    RAISE EXCEPTION 'Final price resolver integrity error: assignment contradicted existing client';
  END IF;

  IF v_assignment_result#>>'{client,client_profile_status}' IS DISTINCT FROM v_client_status THEN
    RAISE EXCEPTION 'Final price resolver integrity error: client status mismatch between components';
  END IF;

  IF v_assignment_status = 'ASSIGNMENT_NOT_FOUND' THEN
    RETURN jsonb_build_object(
      'status', 'PRICE_NOT_FOUND',
      'source', NULL,
      'reason_code', 'ASSIGNMENT_NOT_FOUND',
      'reference_date', p_reference_date,
      'organization_id', p_organization_id,
      'client_company_id', p_client_company_id,
      'catalog_item_id', p_catalog_item_id,
      'price_amount', NULL,
      'currency', NULL,
      'client_profile_status', v_client_status,
      'source_refs', NULL,
      'trace', jsonb_build_object(
        'override_status', 'OVERRIDE_NOT_FOUND',
        'assignment_status', 'ASSIGNMENT_NOT_FOUND',
        'table_price_status', NULL
      )
    );
  END IF;

  IF v_assignment_status <> 'RESOLVED' THEN
    RAISE EXCEPTION 'Final price resolver integrity error: unexpected assignment status %', v_assignment_status;
  END IF;

  IF v_assignment_result#>>'{assignment,id}' IS NULL
     OR v_assignment_result#>>'{assignment,commercial_price_table_id}' IS NULL THEN
    RAISE EXCEPTION 'Final price resolver integrity error: invalid resolved assignment';
  END IF;

  BEGIN
    v_assignment_id := (v_assignment_result#>>'{assignment,id}')::uuid;
    v_table_id := (v_assignment_result#>>'{assignment,commercial_price_table_id}')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Final price resolver integrity error: invalid resolved assignment types';
  END;

  v_table_result := public.fn_resolve_commercial_table_price(
    p_organization_id,
    v_table_id,
    p_catalog_item_id,
    p_reference_date
  );

  IF jsonb_typeof(v_table_result) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Final price resolver integrity error: invalid table-price payload';
  END IF;

  v_table_status := v_table_result->>'status';
  IF v_table_status IS NULL
     OR v_table_result->>'organization_id' IS DISTINCT FROM p_organization_id::text
     OR v_table_result->>'commercial_price_table_id' IS DISTINCT FROM v_table_id::text
     OR v_table_result->>'catalog_item_id' IS DISTINCT FROM p_catalog_item_id::text
     OR v_table_result->>'reference_date' IS DISTINCT FROM p_reference_date::text THEN
    RAISE EXCEPTION 'Final price resolver integrity error: contradictory table-price payload';
  END IF;

  IF v_table_status = 'RESOLVED' THEN
    IF jsonb_typeof(v_table_result->'price_amount') IS DISTINCT FROM 'number'
       OR v_table_result->>'currency' IS DISTINCT FROM 'BRL'
       OR v_table_result#>>'{version,id}' IS NULL
       OR v_table_result#>>'{item,commercial_price_item_id}' IS NULL
       OR v_table_result#>>'{item,catalog_item_id}' IS DISTINCT FROM p_catalog_item_id::text THEN
      RAISE EXCEPTION 'Final price resolver integrity error: invalid resolved table price';
    END IF;

    BEGIN
      v_version_id := (v_table_result#>>'{version,id}')::uuid;
      v_commercial_item_id := (v_table_result#>>'{item,commercial_price_item_id}')::uuid;
      v_price_amount := (v_table_result->>'price_amount')::numeric;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Final price resolver integrity error: invalid resolved table-price types';
    END;

    IF v_price_amount IS NULL THEN
      RAISE EXCEPTION 'Final price resolver integrity error: table price is required';
    END IF;

    RETURN jsonb_build_object(
      'status', 'RESOLVED',
      'source', 'ASSIGNED_COMMERCIAL_TABLE',
      'reason_code', NULL,
      'reference_date', p_reference_date,
      'organization_id', p_organization_id,
      'client_company_id', p_client_company_id,
      'catalog_item_id', p_catalog_item_id,
      'price_amount', v_price_amount,
      'currency', 'BRL',
      'client_profile_status', v_client_status,
      'source_refs', jsonb_build_object(
        'assignment_id', v_assignment_id,
        'commercial_price_table_id', v_table_id,
        'commercial_price_table_version_id', v_version_id,
        'commercial_price_item_id', v_commercial_item_id
      ),
      'trace', jsonb_build_object(
        'override_status', 'OVERRIDE_NOT_FOUND',
        'assignment_status', 'RESOLVED',
        'table_price_status', 'RESOLVED'
      )
    );
  END IF;

  IF v_table_status NOT IN ('TABLE_NOT_FOUND', 'VERSION_NOT_FOUND', 'PRICE_NOT_FOUND') THEN
    RAISE EXCEPTION 'Final price resolver integrity error: unexpected table-price status %', v_table_status;
  END IF;

  RETURN jsonb_build_object(
    'status', 'PRICE_NOT_FOUND',
    'source', NULL,
    'reason_code', CASE v_table_status
      WHEN 'TABLE_NOT_FOUND' THEN 'TABLE_NOT_FOUND'
      WHEN 'VERSION_NOT_FOUND' THEN 'VERSION_NOT_FOUND'
      WHEN 'PRICE_NOT_FOUND' THEN 'TABLE_PRICE_NOT_FOUND'
    END,
    'reference_date', p_reference_date,
    'organization_id', p_organization_id,
    'client_company_id', p_client_company_id,
    'catalog_item_id', p_catalog_item_id,
    'price_amount', NULL,
    'currency', NULL,
    'client_profile_status', v_client_status,
    'source_refs', NULL,
    'trace', jsonb_build_object(
      'override_status', 'OVERRIDE_NOT_FOUND',
      'assignment_status', 'RESOLVED',
      'table_price_status', v_table_status
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.fn_resolve_final_client_price(uuid, uuid, uuid, date)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_resolve_final_client_price(uuid, uuid, uuid, date)
  TO authenticated;
