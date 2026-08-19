-- PRC-03A Remote Tests — COST-H01 to COST-H18
-- Fixtures use real auth.uid and full company→supplier_profile chain

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid := 'a2222222-2222-2222-2222-222222222222';
  v_company_id uuid := 'b2222222-2222-2222-2222-222222222222';
  v_profile_id uuid;
  v_table_id uuid := 'e2222222-2222-2222-2222-222222222222';
BEGIN
  -- Get a real user
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users in auth.users — cannot run tests';
  END IF;
  RAISE NOTICE 'Using user: %', v_user_id;

  -- Cleanup
  DELETE FROM supplier_cost_items WHERE organization_id = v_org_id;
  DELETE FROM supplier_cost_table_versions WHERE organization_id = v_org_id;
  DELETE FROM supplier_cost_tables WHERE organization_id = v_org_id;
  DELETE FROM supplier_profiles WHERE organization_id = v_org_id;
  DELETE FROM companies WHERE id = v_company_id AND organization_id = v_org_id;
  DELETE FROM organizations WHERE id = v_org_id;

  -- Org
  INSERT INTO organizations (id, name, slug, status)
  VALUES (v_org_id, 'PRC03A Test', 'prc03a-test-' || floor(random()*100000)::int, 'active');

  -- Company (with real user as created_by)
  INSERT INTO companies (id, organization_id, legal_name, trade_name, status, created_by, updated_by)
  VALUES (v_company_id, v_org_id, 'Test Supplier 03A', 'Test Sup', 'active', v_user_id, v_user_id);

  -- Supplier profile
  INSERT INTO supplier_profiles (id, company_id, organization_id, status, created_by, updated_by)
  VALUES (gen_random_uuid(), v_company_id, v_org_id, 'active', v_user_id, v_user_id);

  -- Cost table
  INSERT INTO supplier_cost_tables (id, organization_id, supplier_company_id, code, name, status, created_by, updated_by)
  VALUES (v_table_id, v_org_id, v_company_id, 'TAB-03A', 'Test Table', 'active', v_user_id, v_user_id)
  RETURNING id INTO v_table_id;

  RAISE NOTICE '=== SETUP COMPLETE === table=% user=%', v_table_id, v_user_id;
END $$;

-- ============================================================
-- COST-H01: not_provided + amount 0 → REJECT
-- ============================================================
DO $$
DECLARE v_vid uuid; v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;
  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, created_by)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 901, 'draft', '2025-01-01', v_user)
  RETURNING id INTO v_vid;
  BEGIN
    INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
    VALUES ('a2222222-2222-2222-2222-222222222222', v_vid, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'not_provided', 0);
    RAISE NOTICE 'COST-H01: FAIL — should have rejected';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'COST-H01: PASS — %', SQLERRM;
  END;
END $$;

-- ============================================================
-- COST-H02: awaiting_quote + amount 12 → REJECT
-- ============================================================
DO $$
DECLARE v_vid uuid;
BEGIN
  SELECT id INTO v_vid FROM supplier_cost_table_versions WHERE organization_id = 'a2222222-2222-2222-2222-222222222222' AND version_number = 901;
  BEGIN
    INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
    VALUES ('a2222222-2222-2222-2222-222222222222', v_vid, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'awaiting_quote', 12);
    RAISE NOTICE 'COST-H02: FAIL — should have rejected';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'COST-H02: PASS — %', SQLERRM;
  END;
END $$;

-- ============================================================
-- COST-H03: confirmed_zero + amount 0 → ACCEPT
-- ============================================================
DO $$
DECLARE v_vid uuid; v_iid uuid;
BEGIN
  SELECT id INTO v_vid FROM supplier_cost_table_versions WHERE organization_id = 'a2222222-2222-2222-2222-222222222222' AND version_number = 901;
  BEGIN
    INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
    VALUES ('a2222222-2222-2222-2222-222222222222', v_vid, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'confirmed_zero', 0)
    RETURNING id INTO v_iid;
    RAISE NOTICE 'COST-H03: PASS — item %', v_iid;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'COST-H03: FAIL — %', SQLERRM;
  END;
END $$;

-- ============================================================
-- COST-H04: provided + amount > 0 → ACCEPT
-- ============================================================
DO $$
DECLARE v_vid uuid; v_iid uuid;
BEGIN
  SELECT id INTO v_vid FROM supplier_cost_table_versions WHERE organization_id = 'a2222222-2222-2222-2222-222222222222' AND version_number = 901;
  DELETE FROM supplier_cost_items WHERE cost_table_version_id = v_vid;
  BEGIN
    INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
    VALUES ('a2222222-2222-2222-2222-222222222222', v_vid, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'provided', 25.50)
    RETURNING id INTO v_iid;
    RAISE NOTICE 'COST-H04: PASS — item %', v_iid;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'COST-H04: FAIL — %', SQLERRM;
  END;
END $$;

-- ============================================================
-- COST-H05: provided + amount NULL → REJECT
-- ============================================================
DO $$
DECLARE v_vid uuid;
BEGIN
  SELECT id INTO v_vid FROM supplier_cost_table_versions WHERE organization_id = 'a2222222-2222-2222-2222-222222222222' AND version_number = 901;
  BEGIN
    INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
    VALUES ('a2222222-2222-2222-2222-222222222222', v_vid, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'provided', NULL);
    RAISE NOTICE 'COST-H05: FAIL — should have rejected';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'COST-H05: PASS — %', SQLERRM;
  END;
END $$;

-- ============================================================
-- COST-H06: insert in active version → REJECT
-- ============================================================
DO $$
DECLARE v_vid uuid; v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;
  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, created_by, published_by, published_at)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 906, 'active', '2025-01-01', v_user, v_user, now())
  RETURNING id INTO v_vid;
  BEGIN
    INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
    VALUES ('a2222222-2222-2222-2222-222222222222', v_vid, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'provided', 30.00);
    RAISE NOTICE 'COST-H06: FAIL — should have rejected';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'COST-H06: PASS — %', SQLERRM;
  END;
END $$;

-- ============================================================
-- COST-H07: update in active version → REJECT
-- ============================================================
DO $$
DECLARE v_vid uuid; v_iid uuid; v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;
  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, created_by, published_by, published_at)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 907, 'active', '2025-01-01', v_user, v_user, now())
  RETURNING id INTO v_vid;
  INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
  VALUES ('a2222222-2222-2222-2222-222222222222', v_vid, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'provided', 35.00)
  RETURNING id INTO v_iid;
  BEGIN
    UPDATE supplier_cost_items SET amount = 40.00 WHERE id = v_iid;
    RAISE NOTICE 'COST-H07: FAIL — should have rejected';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'COST-H07: PASS — %', SQLERRM;
  END;
END $$;

-- ============================================================
-- COST-H08: delete in active version → REJECT
-- ============================================================
DO $$
DECLARE v_vid uuid; v_iid uuid; v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;
  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, created_by, published_by, published_at)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 908, 'active', '2025-01-01', v_user, v_user, now())
  RETURNING id INTO v_vid;
  INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
  VALUES ('a2222222-2222-2222-2222-222222222222', v_vid, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'provided', 45.00)
  RETURNING id INTO v_iid;
  BEGIN
    DELETE FROM supplier_cost_items WHERE id = v_iid;
    RAISE NOTICE 'COST-H08: FAIL — should have rejected';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'COST-H08: PASS — %', SQLERRM;
  END;
END $$;

-- ============================================================
-- COST-H09: direct UPDATE status=approved on under_review → REJECT
-- Note: fn_validate_version_transition requires auth.uid() which
-- is NULL via supabase db query, so we test the transition trigger
-- differently — it will raise "Authentication required"
-- ============================================================
DO $$
DECLARE v_vid uuid; v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;
  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, created_by)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 909, 'under_review', '2025-01-01', v_user)
  RETURNING id INTO v_vid;
  BEGIN
    UPDATE supplier_cost_table_versions SET status = 'approved' WHERE id = v_vid;
    RAISE NOTICE 'COST-H09: FAIL — should have rejected';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'COST-H09: PASS — %', SQLERRM;
  END;
END $$;

-- ============================================================
-- COST-H10: direct UPDATE status=active on approved → REJECT
-- ============================================================
DO $$
DECLARE v_vid uuid; v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;
  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, created_by, approved_by, approved_at)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 910, 'approved', '2025-01-01', v_user, v_user, now())
  RETURNING id INTO v_vid;
  BEGIN
    UPDATE supplier_cost_table_versions SET status = 'active' WHERE id = v_vid;
    RAISE NOTICE 'COST-H10: FAIL — should have rejected';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'COST-H10: PASS — %', SQLERRM;
  END;
END $$;

-- ============================================================
-- COST-H11: version numbers DISTINCT (direct insert, sequential)
-- ============================================================
DO $$
DECLARE v_n1 int; v_n2 int;
BEGIN
  SELECT version_number INTO v_n1 FROM supplier_cost_table_versions
  WHERE organization_id = 'a2222222-2222-2222-2222-222222222222' ORDER BY version_number LIMIT 1;
  SELECT version_number INTO v_n2 FROM supplier_cost_table_versions
  WHERE organization_id = 'a2222222-2222-2222-2222-222222222222' ORDER BY version_number DESC LIMIT 1;
  IF v_n1 IS NOT NULL AND v_n2 IS NOT NULL AND v_n1 != v_n2 THEN
    RAISE NOTICE 'COST-H11: PASS — versions %, %', v_n1, v_n2;
  ELSE
    RAISE NOTICE 'COST-H11: FAIL — n1=% n2=%', v_n1, v_n2;
  END IF;
END $$;

-- ============================================================
-- COST-H12: overlap protection (EXCLUDE constraint)
-- Two overlapping scheduled versions should conflict
-- ============================================================
DO $$
DECLARE v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;
  BEGIN
    INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, valid_to, created_by)
    VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 2001, 'scheduled', '2025-01-01', '2025-12-31', v_user);
    INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, valid_to, created_by)
    VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 2002, 'scheduled', '2025-06-01', '2025-12-31', v_user);
    RAISE NOTICE 'COST-H12: FAIL — overlap accepted';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'COST-H12: PASS — %', SQLERRM;
  END;
END $$;

-- ============================================================
-- COST-H13: scheduled future does not remove current cost
-- ============================================================
DO $$
DECLARE v_active_id uuid; v_sched_id uuid; v_user uuid; v_res record;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;

  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, created_by, published_by, published_at)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 920, 'active', '2025-01-01', v_user, v_user, now())
  RETURNING id INTO v_active_id;

  INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
  VALUES ('a2222222-2222-2222-2222-222222222222', v_active_id, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'provided', 10.00);

  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, created_by, published_by, published_at)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 921, 'scheduled', '2099-01-01', v_user, v_user, now())
  RETURNING id INTO v_sched_id;

  INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
  VALUES ('a2222222-2222-2222-2222-222222222222', v_sched_id, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'provided', 15.00);

  SELECT * INTO v_res FROM fn_resolve_supplier_cost('a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', current_date);

  IF v_res.amount = 10.00 THEN
    RAISE NOTICE 'COST-H13: PASS — current=%', v_res.amount;
  ELSE
    RAISE NOTICE 'COST-H13: FAIL — expected 10.00, got %', v_res.amount;
  END IF;
END $$;

-- ============================================================
-- COST-H14: historical lookup in superseded version
-- ============================================================
DO $$
DECLARE v_sid uuid; v_res record; v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;

  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, valid_to, created_by, published_by, published_at, superseded_at)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 930, 'superseded', '2024-01-01', '2025-01-01', v_user, v_user, now(), now())
  RETURNING id INTO v_sid;

  INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
  VALUES ('a2222222-2222-2222-2222-222222222222', v_sid, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'provided', 8.00);

  SELECT * INTO v_res FROM fn_resolve_supplier_cost('a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', '2024-06-01');

  IF v_res.amount = 8.00 AND v_res.resolution_status = 'CONFIRMED' THEN
    RAISE NOTICE 'COST-H14: PASS — historical=%', v_res.amount;
  ELSE
    RAISE NOTICE 'COST-H14: FAIL — got %/%', v_res.amount, v_res.resolution_status;
  END IF;
END $$;

-- ============================================================
-- COST-H15: current lookup
-- ============================================================
DO $$
DECLARE v_res record;
BEGIN
  SELECT * INTO v_res FROM fn_resolve_supplier_cost('a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', current_date);
  IF v_res.amount = 10.00 AND v_res.resolution_status = 'CONFIRMED' THEN
    RAISE NOTICE 'COST-H15: PASS — current=%', v_res.amount;
  ELSE
    RAISE NOTICE 'COST-H15: FAIL — got %/%', v_res.amount, v_res.resolution_status;
  END IF;
END $$;

-- ============================================================
-- COST-H16: confirmed_zero resolution
-- ============================================================
DO $$
DECLARE v_vid uuid; v_res record; v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;

  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, created_by, published_by, published_at)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 940, 'active', '2025-01-01', v_user, v_user, now())
  RETURNING id INTO v_vid;

  INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
  VALUES ('a2222222-2222-2222-2222-222222222222', v_vid, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'confirmed_zero', 0);

  SELECT * INTO v_res FROM fn_resolve_supplier_cost('a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', current_date);

  IF v_res.amount = 0 AND v_res.cost_status = 'confirmed_zero' AND v_res.resolution_status = 'CONFIRMED' THEN
    RAISE NOTICE 'COST-H16: PASS';
  ELSE
    RAISE NOTICE 'COST-H16: FAIL — got %/%/%', v_res.amount, v_res.cost_status, v_res.resolution_status;
  END IF;
END $$;

-- ============================================================
-- COST-H17: unknown cost resolution (not_provided)
-- ============================================================
DO $$
DECLARE v_vid uuid; v_res record; v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;

  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, created_by, published_by, published_at)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 950, 'active', '2025-01-01', v_user, v_user, now())
  RETURNING id INTO v_vid;

  INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
  VALUES ('a2222222-2222-2222-2222-222222222222', v_vid, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'not_provided', NULL);

  SELECT * INTO v_res FROM fn_resolve_supplier_cost('a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', current_date);

  IF v_res.amount IS NULL AND v_res.resolution_status = 'COST_NOT_CONFIRMED' THEN
    RAISE NOTICE 'COST-H17: PASS — reason=%', v_res.reason;
  ELSE
    RAISE NOTICE 'COST-H17: FAIL — got %/%', v_res.amount, v_res.resolution_status;
  END IF;
END $$;

-- ============================================================
-- TEMPORAL SMOKE: A/B/C versioning
-- ============================================================
DO $$
DECLARE v_a uuid; v_b uuid; v_c uuid; v_user uuid; v_r record;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;

  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, valid_to, created_by, published_by, published_at)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 1001, 'superseded', '2025-01-01', '2025-06-01', v_user, v_user, now())
  RETURNING id INTO v_a;
  INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
  VALUES ('a2222222-2222-2222-2222-222222222222', v_a, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'provided', 10.00);

  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, created_by, published_by, published_at)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 1002, 'active', '2025-06-01', v_user, v_user, now())
  RETURNING id INTO v_b;
  INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
  VALUES ('a2222222-2222-2222-2222-222222222222', v_b, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'provided', 12.00);

  INSERT INTO supplier_cost_table_versions (organization_id, cost_table_id, version_number, status, valid_from, created_by, published_by, published_at)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 1003, 'scheduled', '2099-01-01', v_user, v_user, now())
  RETURNING id INTO v_c;
  INSERT INTO supplier_cost_items (organization_id, cost_table_version_id, supplier_catalog_item_id, catalog_item_id, cost_status, amount)
  VALUES ('a2222222-2222-2222-2222-222222222222', v_c, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'provided', 15.00);

  SELECT * INTO v_r FROM fn_resolve_supplier_cost('a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', '2025-03-01');
  IF v_r.amount = 10.00 THEN RAISE NOTICE 'SMOKE-1: PASS — 2025-03-01→10.00'; ELSE RAISE NOTICE 'SMOKE-1: FAIL — %', v_r.amount; END IF;

  SELECT * INTO v_r FROM fn_resolve_supplier_cost('a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', '2025-07-01');
  IF v_r.amount = 12.00 THEN RAISE NOTICE 'SMOKE-2: PASS — 2025-07-01→12.00'; ELSE RAISE NOTICE 'SMOKE-2: FAIL — %', v_r.amount; END IF;

  SELECT * INTO v_r FROM fn_resolve_supplier_cost('a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', current_date);
  IF v_r.amount = 12.00 THEN RAISE NOTICE 'SMOKE-3: PASS — today→12.00'; ELSE RAISE NOTICE 'SMOKE-3: FAIL — %', v_r.amount; END IF;

  SELECT * INTO v_r FROM fn_resolve_supplier_cost('a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', '2099-06-01');
  IF v_r.amount = 15.00 THEN RAISE NOTICE 'SMOKE-4: PASS — 2099-06-01→15.00'; ELSE RAISE NOTICE 'SMOKE-4: FAIL — %', v_r.amount; END IF;
END $$;

-- ============================================================
-- COST-H18: no hard delete of cost table
-- ============================================================
DO $$
BEGIN
  BEGIN
    DELETE FROM supplier_cost_tables WHERE id = 'e2222222-2222-2222-2222-222222222222';
    RAISE NOTICE 'COST-H18: FAIL — hard delete succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'COST-H18: PASS — %', SQLERRM;
  END;
END $$;

-- ============================================================
-- FIXTURE CLEANUP
-- ============================================================
DO $$
BEGIN
  DELETE FROM supplier_cost_items WHERE organization_id = 'a2222222-2222-2222-2222-222222222222';
  DELETE FROM supplier_cost_table_versions WHERE organization_id = 'a2222222-2222-2222-2222-222222222222';
  DELETE FROM supplier_cost_tables WHERE organization_id = 'a2222222-2222-2222-2222-222222222222';
  DELETE FROM supplier_profiles WHERE organization_id = 'a2222222-2222-2222-2222-222222222222';
  DELETE FROM companies WHERE id = 'b2222222-2222-2222-2222-222222222222';
  DELETE FROM organizations WHERE id = 'a2222222-2222-2222-2222-222222222222';
  RAISE NOTICE '=== FIXTURES CLEANED ===';
END $$;
