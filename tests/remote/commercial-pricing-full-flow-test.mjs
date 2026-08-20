#!/usr/bin/env node
/**
 * PRC-05E: CPF-H01..H26 Commercial Pricing End-to-End Full-Flow Test
 *
 * Exercises one complete business scenario spanning PRC-03 (cost),
 * PRC-04 (pricing engine) and PRC-05 (commercial tables):
 *
 *   catalog → supplier cost → pricing policy → pricing engine →
 *   commercial table → commercial version → commercial item →
 *   exception workflow → publication → temporal resolution →
 *   historical reproducibility → UI/UX invariants
 *
 * This test deliberately complements (does NOT duplicate) the lower-level
 * CPW-H01..H85 and COM-H01..H57 suites. It uses the dedicated cOrg test
 * fixtures, and exercises ONE integrated scenario end-to-end.
 *
 * Requires: tests/remote/sql/commercial_price_test_setup.sql to have
 * been executed first.
 *
 * Credentials come from environment variables (never hardcoded):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
 *   E2E_TEST_EMAIL, E2E_TEST_PASSWORD
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || process.env.PRC03A_TEST_EMAIL;
const TEST_PASSWORD =
  process.env.E2E_TEST_PASSWORD || process.env.PRC03A_TEST_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  );
  process.exit(1);
}
if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error(
    "REMOTE TESTS: BLOCKED — E2E TEST USER REQUIRED (E2E_TEST_EMAIL / E2E_TEST_PASSWORD)"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let passed = 0;
let failed = 0;
const failures = [];
const RUN = Date.now().toString(36);

function log(label, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}${detail ? " — " + detail : ""}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`);
  }
}

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  return { data, error };
}

const F = {
  cOrg: "55555555-5555-5555-5555-555555555551",
  itemA: "55555555-0000-0000-0000-000000000002",
  itemB: "55555555-0000-0000-0000-000000000003",
  company: "55555555-1111-1111-1111-111111111111",
  costTable: "55555555-2222-2222-2222-222222222221",
  costVersion: "55555555-2222-2222-2222-222222222222",
  policy: "55555555-3333-3333-3333-333333333331",
  policyVersion: "55555555-3333-3333-3333-333333333332",
};

async function authenticate() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error("Auth failed: " + error.message);
  return data.user.id;
}

function uniqueCode(label) {
  return `E2E-CPF-${RUN}-${label}`;
}

async function getRow(table, filter) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .match(filter)
    .maybeSingle();
  return { data, error };
}

async function listRows(table, filter, order = "created_at", ascending = true) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .match(filter)
    .order(order, { ascending });
  return { data, error };
}

async function runFullFlow() {
  console.log("\n═══ CPF-H01..H26 END-TO-END COMMERCIAL PRICING FLOW ═══\n");

  const todayIso = new Date().toISOString().slice(0, 10);
  console.log(`  (today reference date: ${todayIso})`);

  // ====================================================================
  // PHASE A: PRC-03 + PRC-04 — Cost + Pricing Engine
  // ====================================================================

  // 1. Resolve a confirmed supplier cost (PRC-03)
  console.log("\n[A] 1. Resolve a confirmed supplier cost");
  const costRes = await rpc("fn_resolve_supplier_cost", {
    p_organization_id: F.cOrg,
    p_supplier_company_id: F.company,
    p_catalog_item_id: F.itemA,
    p_reference_date: todayIso,
  });
  log(
    "CPF-H01",
    !costRes.error && Array.isArray(costRes.data) && costRes.data.length > 0,
    costRes.data?.[0]
      ? `cost_table=${costRes.data[0].cost_table_id?.slice(0, 8)}…`
      : (costRes.error?.message ?? "no data")
  );

  // 2. Verify an applicable pricing policy (PRC-04)
  console.log("[A] 2. Resolve an applicable pricing policy");
  const policyRes = await rpc("fn_resolve_pricing_policy", {
    p_organization_id: F.cOrg,
    p_catalog_item_id: F.itemA,
    p_reference_date: todayIso,
  });
  log(
    "CPF-H02",
    !policyRes.error &&
      Array.isArray(policyRes.data) &&
      policyRes.data.length > 0,
    policyRes.data?.[0]?.pricing_policy_id
      ? `policy=${policyRes.data[0].pricing_policy_id.slice(0, 8)}…`
      : "no policy"
  );

  // 3. Call fn_simulate_price
  console.log("[A] 3. Simulate recommended price via fn_simulate_price");
  const sim = await rpc("fn_simulate_price", {
    p_organization_id: F.cOrg,
    p_supplier_company_id: F.company,
    p_catalog_item_id: F.itemA,
    p_reference_date: todayIso,
    p_discount_rate: 0,
  });
  const simResult = sim.data ?? {};
  const recommended = simResult.recommended_price ?? simResult.effective_price;
  log(
    "CPF-H03",
    !sim.error && typeof recommended === "number",
    `recommended=${recommended}`
  );

  // ====================================================================
  // PHASE B: PRC-05 — Commercial Table Setup + Items
  // ====================================================================

  // 4. Create commercial table
  console.log("\n[B] 4. Create commercial table");
  const t = await rpc("fn_create_commercial_price_table", {
    p_organization_id: F.cOrg,
    p_code: uniqueCode("TBL"),
    p_name: "Full-Flow Test Table",
    p_description: "PRC-05E end-to-end full-flow test fixture",
  });
  const tableId = t.data;
  log(
    "CPF-H04",
    !t.error && !!tableId,
    `tableId=${tableId?.slice(0, 8)}…${t.error ? ` err=${t.error.message}` : ""}`
  );

  // 5. Create draft commercial version (with valid_from <= today so it's
  // immediately publishable as active).
  console.log("[B] 5. Create draft commercial version (v1)");
  const v1Res = await rpc("fn_create_commercial_price_table_version", {
    p_commercial_price_table_id: tableId,
    p_valid_from: "2025-01-01",
    p_valid_to: null,
    p_version_label: "v1",
    p_notes: null,
  });
  const v1Id = v1Res.data?.[0]?.version_id;
  log(
    "CPF-H05",
    !v1Res.error && !!v1Id && v1Res.data?.[0]?.version_number === 1,
    `v1Id=${v1Id?.slice(0, 8)}… versionNumber=${v1Res.data?.[0]?.version_number}`
  );

  // 6. Add engine-derived commercial item
  console.log("[B] 6. Add engine-derived commercial item");
  const engItem = await rpc("fn_add_commercial_price_item_from_engine", {
    p_version_id: v1Id,
    p_catalog_item_id: F.itemA,
    p_supplier_company_id: F.company,
    p_reference_date: todayIso,
    p_discount_rate: 0,
    p_commercial_price_amount: recommended ?? 100,
  });
  const engineItemId = engItem.data;
  log(
    "CPF-H06",
    !engItem.error && !!engineItemId,
    `engineItemId=${engineItemId?.slice(0, 8)}…`
  );

  // 7. Verify trusted provenance (server-derived)
  console.log("[B] 7. Verify trusted provenance");
  const ei = await getRow("commercial_price_items", { id: engineItemId });
  const eiData = ei.data;
  const provenanceOk =
    !ei.error &&
    eiData?.origin_type === "pricing_engine" &&
    eiData?.source_reference_date === todayIso &&
    eiData?.source_supplier_company_id === F.company &&
    eiData?.source_cost_version_id === F.costVersion &&
    eiData?.source_pricing_policy_version_id !== null &&
    eiData?.source_effective_price !== null;
  log(
    "CPF-H07",
    provenanceOk,
    provenanceOk
      ? `origin=${eiData.origin_type} cost_v=${eiData.source_cost_version_id?.slice(0, 8)}…`
      : "provenance missing"
  );

  // 8. Add manual commercial item with explicit zero price
  console.log("[B] 8. Add manual commercial item (price = 0)");
  const manualZero = await rpc("fn_add_commercial_price_item_manual", {
    p_version_id: v1Id,
    p_catalog_item_id: F.itemB,
    p_price_amount: 0,
  });
  const manualZeroId = manualZero.data;
  log(
    "CPF-H08",
    !manualZero.error && !!manualZeroId,
    `manualZeroId=${manualZeroId?.slice(0, 8)}…`
  );

  // ====================================================================
  // PHASE C: Workflow (submit → approve → publish) and zero/missing test
  // ====================================================================

  // 9. Request BELOW_COST exception for engine item (may be needed for
  //    publish if engine recommended < total_cost)
  console.log("\n[C] 9. Request BELOW_COST exception for engine item");
  const excReq = await rpc("fn_request_commercial_price_exception", {
    p_commercial_price_item_id: engineItemId,
    p_violation_code: "BELOW_COST",
    p_reason: "E2E full-flow: required to unblock publish readiness",
  });
  let excId = excReq.data;
  log(
    "CPF-H09",
    !excReq.error && !!excId,
    `exceptionId=${excId?.slice(0, 8)}…${excReq.error ? ` err=${excReq.error.message}` : ""}`
  );

  // 10. Approve the exception (admin role)
  console.log("[C] 10. Approve the BELOW_COST exception");
  let excApproveOk = false;
  if (excId) {
    const excApprove = await rpc("fn_decide_commercial_price_exception", {
      p_exception_id: excId,
      p_decision: "approved",
      p_decision_notes: "E2E full-flow approval",
    });
    excApproveOk = !excApprove.error;
    log(
      "CPF-H10",
      excApproveOk,
      excApprove.error ? ` err=${excApprove.error.message}` : "approved"
    );
  } else {
    log("CPF-H10", false, "no exception id to approve");
  }

  // 11. Submit v1
  console.log("[C] 11. Submit v1 (draft → under_review)");
  const sub1 = await rpc("fn_submit_commercial_price_version", {
    p_version_id: v1Id,
  });
  log("CPF-H11", !sub1.error, sub1.error ? ` err=${sub1.error.message}` : "submitted");

  // 12. Approve v1
  console.log("[C] 12. Approve v1 (under_review → approved)");
  const app1 = await rpc("fn_approve_commercial_price_version", {
    p_version_id: v1Id,
  });
  log("CPF-H12", !app1.error, app1.error ? ` err=${app1.error.message}` : "approved");

  // 13. Validate publish readiness
  console.log("[C] 13. Validate publish readiness");
  const valid = await rpc("fn_validate_commercial_price_version", {
    p_version_id: v1Id,
  });
  const readyOk =
    !valid.error && valid.data?.ready === true;
  log(
    "CPF-H13",
    readyOk,
    readyOk
      ? `ready=true item_count=${valid.data?.item_count}`
      : `blockers=${JSON.stringify(valid.data?.blockers)}`
  );

  // 14. Publish v1 (immediate)
  console.log("[C] 14. Publish v1 (immediate)");
  const pub1 = await rpc("fn_publish_commercial_price_version", {
    p_version_id: v1Id,
  });
  log("CPF-H14", !pub1.error, pub1.error ? ` err=${pub1.error.message}` : "published");

  // 15. Resolve current price for itemA (engine-derived)
  console.log("[C] 15. Resolve CURRENT price for itemA");
  const curA = await rpc("fn_resolve_commercial_table_price", {
    p_organization_id: F.cOrg,
    p_commercial_price_table_id: tableId,
    p_catalog_item_id: F.itemA,
    p_reference_date: todayIso,
  });
  log(
    "CPF-H15",
    !curA.error &&
      curA.data?.status === "RESOLVED" &&
      typeof curA.data?.price_amount === "number",
    `status=${curA.data?.status} v=${curA.data?.version?.version_number} price=${curA.data?.price_amount}`
  );

  // 16. Resolve zero vs missing
  console.log("[C] 16. Resolve zero price (itemB) vs missing (non-existent item)");
  const zeroRes = await rpc("fn_resolve_commercial_table_price", {
    p_organization_id: F.cOrg,
    p_commercial_price_table_id: tableId,
    p_catalog_item_id: F.itemB,
    p_reference_date: todayIso,
  });
  const missingRes = await rpc("fn_resolve_commercial_table_price", {
    p_organization_id: F.cOrg,
    p_commercial_price_table_id: tableId,
    p_catalog_item_id: "00000000-dead-beef-cafe-000000000099",
    p_reference_date: todayIso,
  });
  const zeroOk =
    !zeroRes.error &&
    zeroRes.data?.status === "RESOLVED" &&
    zeroRes.data?.price_amount === 0;
  const missingOk =
    !missingRes.error &&
    missingRes.data?.status === "PRICE_NOT_FOUND";
  log(
    "CPF-H16",
    zeroOk && missingOk,
    `zero=${zeroOk ? "RESOLVED/0" : "FAIL"} missing=${
      missingOk ? "PRICE_NOT_FOUND" : "FAIL"
    }`
  );

  // ====================================================================
  // PHASE D: Clone + Bulk + Future Scheduled + Cutover + Determinism
  // ====================================================================

  // 17. Clone v1 → v2 (draft)
  console.log("\n[D] 17. Clone v1 → v2 (draft)");
  const cloneRes = await rpc("fn_clone_commercial_price_table_version", {
    p_source_version_id: v1Id,
    p_valid_from: "2030-01-01", // future so v2 is future-scheduled later
    p_valid_to: null,
    p_version_label: "v2-clone",
    p_notes: null,
  });
  const v2Id = cloneRes.data?.[0]?.new_version_id;
  log(
    "CPF-H17",
    !cloneRes.error && !!v2Id && cloneRes.data?.[0]?.new_version_number === 2,
    `v2Id=${v2Id?.slice(0, 8)}…`
  );

  // 18. Verify lineage
  console.log("[D] 18. Verify lineage (cloned items point to source items)");
  const clonedItems = await listRows(
    "commercial_price_items",
    { commercial_price_table_version_id: v2Id }
  );
  const lineageOk =
    !clonedItems.error &&
    Array.isArray(clonedItems.data) &&
    clonedItems.data.length === 2 &&
    clonedItems.data.every(
      (i) =>
        i.source_commercial_price_item_id !== null &&
        i.source_commercial_price_item_id !== i.id
    );
  log(
    "CPF-H18",
    lineageOk,
    lineageOk ? `count=${clonedItems.data.length}` : "lineage missing"
  );

  // 19. Bulk adjustment (+5%) on cloned items
  console.log("[D] 19. Bulk draft adjustment (+5%) on cloned items");
  const v2ItemIds = clonedItems.data.map((i) => i.id);
  const bulkRes = await rpc("fn_bulk_adjust_commercial_prices", {
    p_version_id: v2Id,
    p_operation: "percentage",
    p_rate: 0.05,
    p_fixed_amount: null,
    p_rounding_mode: null,
    p_rounding_step: null,
    p_item_ids: v2ItemIds,
  });
  log(
    "CPF-H19",
    !bulkRes.error && (bulkRes.data ?? 0) >= 2,
    `updated=${bulkRes.data}`
  );

  // 20. Submit + approve + publish v2 as future scheduled
  console.log("[D] 20. Publish v2 as future-scheduled (valid_from=2030-01-01)");
  const sub2 = await rpc("fn_submit_commercial_price_version", {
    p_version_id: v2Id,
  });
  const app2 = await rpc("fn_approve_commercial_price_version", {
    p_version_id: v2Id,
  });
  const pub2 = await rpc("fn_publish_commercial_price_version", {
    p_version_id: v2Id,
  });
  log(
    "CPF-H20",
    !sub2.error && !app2.error && !pub2.error,
    `v2 published as scheduled (2030-01-01)`
  );

  // 21. Resolve at today (should still hit v1 active — v2 is future-scheduled)
  console.log("[D] 21. Resolve current price at today (v1 still active)");
  const curAfterFuture = await rpc("fn_resolve_commercial_table_price", {
    p_organization_id: F.cOrg,
    p_commercial_price_table_id: tableId,
    p_catalog_item_id: F.itemA,
    p_reference_date: todayIso,
  });
  log(
    "CPF-H21",
    !curAfterFuture.error &&
      curAfterFuture.data?.status === "RESOLVED" &&
      curAfterFuture.data?.version?.version_number === 1,
    `today→v${curAfterFuture.data?.version?.version_number} (${curAfterFuture.data?.version?.status}) price=${curAfterFuture.data?.price_amount}`
  );

  // 22. Resolve at v2.valid_from (should hit v2 scheduled)
  console.log("[D] 22. Resolve price at v2.valid_from (should hit v2 scheduled)");
  const futureRes = await rpc("fn_resolve_commercial_table_price", {
    p_organization_id: F.cOrg,
    p_commercial_price_table_id: tableId,
    p_catalog_item_id: F.itemA,
    p_reference_date: "2030-01-01",
  });
  log(
    "CPF-H22",
    !futureRes.error &&
      futureRes.data?.status === "RESOLVED" &&
      futureRes.data?.version?.version_number === 2 &&
      futureRes.data?.version?.status === "scheduled",
    `2030-01-01→v${futureRes.data?.version?.version_number} (${futureRes.data?.version?.status})`
  );

  // 23. Cutover (sync)
  console.log("[D] 23. Cutover: sync status to reference_date=2030-01-02");
  const sync1 = await rpc("fn_sync_commercial_price_version_status", {
    p_reference_date: "2030-01-02",
  });
  const sync1Updated = sync1.data ?? 0;
  const sync2 = await rpc("fn_sync_commercial_price_version_status", {
    p_reference_date: "2030-01-02",
  });
  const sync2Updated = sync2.data ?? 0;
  log(
    "CPF-H23",
    sync1Updated >= 1 && sync2Updated === 0,
    `sync1=${sync1Updated} sync2=${sync2Updated} (idempotent)`
  );

  // 24. Resolve after cutover
  console.log("[D] 24. Resolve current price AFTER cutover (v2 active)");
  const curAfterCutover = await rpc("fn_resolve_commercial_table_price", {
    p_organization_id: F.cOrg,
    p_commercial_price_table_id: tableId,
    p_catalog_item_id: F.itemA,
    p_reference_date: "2030-02-01",
  });
  log(
    "CPF-H24",
    !curAfterCutover.error &&
      curAfterCutover.data?.status === "RESOLVED" &&
      curAfterCutover.data?.version?.version_number === 2,
    `2030-02-01→v${curAfterCutover.data?.version?.version_number} (${curAfterCutover.data?.version?.status}) price=${curAfterCutover.data?.price_amount}`
  );

  // 25. Historical resolution (point in time when v1 was active)
  console.log("[D] 25. Resolve HISTORICAL price (when v1 was active)");
  const hist = await rpc("fn_resolve_commercial_table_price", {
    p_organization_id: F.cOrg,
    p_commercial_price_table_id: tableId,
    p_catalog_item_id: F.itemA,
    p_reference_date: "2026-01-01",
  });
  log(
    "CPF-H25",
    !hist.error &&
      hist.data?.status === "RESOLVED" &&
      hist.data?.version?.version_number === 1 &&
      hist.data?.version?.status === "superseded",
    `2026-01-01→v${hist.data?.version?.version_number} (${hist.data?.version?.status}) price=${hist.data?.price_amount}`
  );

  // 26. Deterministic resolver (two identical calls → identical output)
  console.log("[D] 26. Determinism: two identical resolver calls");
  const det1 = await rpc("fn_resolve_commercial_table_price", {
    p_organization_id: F.cOrg,
    p_commercial_price_table_id: tableId,
    p_catalog_item_id: F.itemA,
    p_reference_date: todayIso,
  });
  const det2 = await rpc("fn_resolve_commercial_table_price", {
    p_organization_id: F.cOrg,
    p_commercial_price_table_id: tableId,
    p_catalog_item_id: F.itemA,
    p_reference_date: todayIso,
  });
  const deterministicOk =
    !det1.error &&
    !det2.error &&
    det1.data?.price_amount === det2.data?.price_amount &&
    det1.data?.version?.version_number === det2.data?.version?.version_number;
  log(
    "CPF-H26",
    deterministicOk,
    `det1=${det1.data?.version?.version_number}@${det1.data?.price_amount} det2=${det2.data?.version?.version_number}@${det2.data?.price_amount}`
  );

  // 27. Cross-tenant resolver rejection
  console.log("\n[D] 27. Cross-tenant resolver (request from foreign org)");
  const xt = await rpc("fn_resolve_commercial_table_price", {
    p_organization_id: "55555555-5555-5555-5555-555555555552", // xOrg
    p_commercial_price_table_id: tableId,
    p_catalog_item_id: F.itemA,
    p_reference_date: todayIso,
  });
  log(
    "CPF-H27",
    !!xt.error || xt.data?.status === "TABLE_NOT_FOUND",
    xt.error?.message ?? `xOrg→status=${xt.data?.status}`
  );

  console.log("\n  (next run of commercial_price_test_setup.sql resets fixtures)");
}

(async () => {
  try {
    console.log("═══ AUTHENTICATION ═══");
    const e2eUserId = await authenticate();
    console.log("  Authenticated as:", e2eUserId);
    await runFullFlow();
  } catch (e) {
    console.error("\n💀 FATAL:", e.message);
    process.exit(1);
  }
  console.log("\n═══ SUMMARY ═══");
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  if (failed > 0) {
    console.log(`  Failures: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("\n  ✅ ALL TESTS PASSED");
})();
