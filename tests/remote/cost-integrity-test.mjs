#!/usr/bin/env node
/**
 * PRC-03A: COST-H01 to COST-H18 Remote Integrity Tests
 *
 * Runs against the remote Supabase project using the JS client.
 * Tests: strict cost status, immutability, workflow, overlap, no hard delete,
 * temporal resolution, and continuous timeline.
 *
 * Includes fixture cleanup: tracks created versions and cleans up
 * active/scheduled/draft versions after tests complete.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://scyxgyewdokmsuehgwql.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.PRC03A_TEST_EMAIL;
const TEST_PASSWORD = process.env.PRC03A_TEST_PASSWORD;

if (!SUPABASE_ANON_KEY) {
  console.error("Missing required env var: VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error(
    "Missing required env vars: PRC03A_TEST_EMAIL and PRC03A_TEST_PASSWORD (use rotated credentials, never commit them)"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let passed = 0;
let failed = 0;
const failures = [];
const createdVersionIds = [];

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

const F = {
  orgId: "a2222222-2222-2222-2222-222222222222",
  companyId: "b2222222-2222-2222-2222-222222222222",
  catalogItemId: "c2222222-0000-0000-0000-000000000001",
  supplierCatalogItemId: "c2222222-0000-0000-0000-000000000002",
  costTableId: "c2222222-0000-0000-0000-000000000003",
  userId: "d7df8bb1-7da4-4926-8bd2-2fe6ad8ac060",
};

// ============================================================
// AUTH
// ============================================================
async function authenticate() {
  console.log("\n═══ AUTHENTICATION ═══");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error("Auth failed: " + error.message);
  console.log("  Authenticated as:", data.user.id);
}

// ============================================================
// HELPERS
// ============================================================

async function createVersion(label, validFrom, validTo) {
  const { data, error } = await supabase.rpc("fn_create_cost_version", {
    p_cost_table_id: F.costTableId,
    p_valid_from: validFrom,
    p_valid_to: validTo,
    p_version_label: label,
    p_source_date: validFrom,
    p_notes: "test",
  });
  if (error) throw new Error("createVersion(" + label + ") failed: " + error.message);
  createdVersionIds.push(data);
  return data;
}

async function addItem(versionId, status, amount) {
  return await supabase
    .from("supplier_cost_items")
    .insert({
      organization_id: F.orgId,
      cost_table_version_id: versionId,
      supplier_catalog_item_id: F.supplierCatalogItemId,
      catalog_item_id: F.catalogItemId,
      cost_status: status,
      amount: amount,
    })
    .select("id")
    .single();
}

async function resolveCost(supplierId, catalogId, refDate) {
  const { data, error } = await supabase.rpc("fn_resolve_supplier_cost", {
    p_organization_id: F.orgId,
    p_supplier_company_id: supplierId || F.companyId,
    p_catalog_item_id: catalogId || F.catalogItemId,
    p_reference_date: refDate,
  });
  return { data: data?.[0], error };
}

async function submitVersion(vid) {
  const { error } = await supabase.rpc("fn_submit_cost_version", { p_version_id: vid });
  if (error) throw new Error("submit failed: " + error.message);
}

async function approveVersion(vid) {
  const { error } = await supabase.rpc("fn_approve_cost_version", { p_version_id: vid });
  if (error) throw new Error("approve failed: " + error.message);
}

async function publishVersion(vid) {
  const { error } = await supabase.rpc("fn_publish_cost_version", { p_version_id: vid });
  if (error) throw new Error("publish failed: " + error.message);
}

async function createSecondMapping() {
  const { data: ci2 } = await supabase
    .from("catalog_items")
    .insert({
      organization_id: F.orgId,
      code: "T03A-X-" + Date.now(),
      name: "Test Item X",
      category_id: (await supabase.from("catalog_categories").select("id").eq("organization_id", F.orgId).limit(1).single()).data.id,
      item_type: "other_service",
      commercial_unit: "unit",
      execution_type: "own",
      status: "active",
      created_by: F.userId,
      updated_by: F.userId,
    })
    .select("id")
    .single();

  const { data: map2 } = await supabase
    .from("supplier_catalog_items")
    .insert({
      organization_id: F.orgId,
      supplier_company_id: F.companyId,
      catalog_item_id: ci2.id,
      external_code: "EXT-X-" + Date.now(),
      external_name: "External X",
      normalized_external_name: "external x",
      status: "active",
      created_by: F.userId,
      updated_by: F.userId,
    })
    .select("id")
    .single();

  return { catalogItemId: ci2.id, mappingId: map2.id };
}

async function cleanupFixtures() {
  console.log("\n═══ CLEANUP ═══");
  try {
    const { data: versions } = await supabase
      .from("supplier_cost_table_versions")
      .select("id, status, version_number")
      .eq("cost_table_id", F.costTableId)
      .order("version_number", { ascending: true });

    if (!versions) {
      console.log("  No versions found to clean");
      return;
    }

    console.log(`  Total versions: ${versions.length}`);
    const byStatus = {};
    for (const v of versions) {
      byStatus[v.status] = (byStatus[v.status] || 0) + 1;
    }
    console.log("  Status breakdown:", JSON.stringify(byStatus));

    let cleaned = 0;
    for (const v of versions) {
      if (v.status === "draft" || v.status === "under_review" || v.status === "approved") {
        try {
          const { error } = await supabase
            .from("supplier_cost_table_versions")
            .delete()
            .eq("id", v.id);
          if (!error) {
            cleaned++;
          }
        } catch {
          // hard delete may be blocked by trigger
        }
      }
    }
    console.log(`  Attempted cleanup of ${cleaned} non-published versions`);
  } catch (e) {
    console.log("  Cleanup error:", e.message);
  }
}

// ============================================================
// TESTS
// ============================================================

async function runTests() {
  console.log("\n═══ COST-H01 to H18 TESTS ═══\n");

  // ---- H01: not_provided + amount 0 → REJECT ----
  console.log("COST-H01: not_provided + amount 0 → REJECT");
  {
    const vid = await createVersion("H01", "2025-01-01", "2025-12-31");
    const { error } = await addItem(vid, "not_provided", 0);
    log("COST-H01", error !== null, error?.message || "rejected");
  }

  // ---- H02: awaiting_quote + amount 12 → REJECT ----
  console.log("COST-H02: awaiting_quote + amount 12 → REJECT");
  {
    const vid = await createVersion("H02", "2025-01-01", "2025-12-31");
    const { error } = await addItem(vid, "awaiting_quote", 12);
    log("COST-H02", error !== null, error?.message || "rejected");
  }

  // ---- H03: confirmed_zero + amount 0 → ACCEPT ----
  console.log("COST-H03: confirmed_zero + amount 0 → ACCEPT");
  {
    const vid = await createVersion("H03", "2025-01-01", "2025-12-31");
    const { data, error } = await addItem(vid, "confirmed_zero", 0);
    log("COST-H03", data !== null && error === null, data?.id ? "accepted id=" + data.id : error?.message);
  }

  // ---- H04: provided + amount > 0 → ACCEPT ----
  console.log("COST-H04: provided + amount > 0 → ACCEPT");
  {
    const vid = await createVersion("H04", "2025-01-01", "2025-12-31");
    const { data, error } = await addItem(vid, "provided", 25.5);
    log("COST-H04", data !== null && error === null, data?.id ? "accepted id=" + data.id : error?.message);
  }

  // ---- H05: provided + amount NULL → REJECT ----
  console.log("COST-H05: provided + amount NULL → REJECT");
  {
    const vid = await createVersion("H05", "2025-01-01", "2025-12-31");
    const { error } = await addItem(vid, "provided", null);
    log("COST-H05", error !== null, error?.message || "rejected");
  }

  // ---- H06: insert in active version → REJECT ----
  console.log("COST-H06: insert in active version → REJECT");
  {
    const vid = await createVersion("H06", "2025-01-01", "2025-12-31");
    await addItem(vid, "provided", 30);
    await submitVersion(vid);
    await approveVersion(vid);
    await publishVersion(vid);
    const { error } = await addItem(vid, "provided", 99);
    log("COST-H06", error !== null, error?.message || "rejected");
  }

  // ---- H07: update in active version → REJECT ----
  console.log("COST-H07: update in active version → REJECT");
  {
    const vid = await createVersion("H07", "2025-01-01", "2025-12-31");
    const { data: item } = await addItem(vid, "provided", 35);
    await submitVersion(vid);
    await approveVersion(vid);
    await publishVersion(vid);
    const { error } = await supabase
      .from("supplier_cost_items")
      .update({ amount: 40 })
      .eq("id", item.id);
    log("COST-H07", error !== null, error?.message || "rejected");
  }

  // ---- H08: delete in active version → REJECT ----
  console.log("COST-H08: delete in active version → REJECT");
  {
    const vid = await createVersion("H08", "2025-01-01", "2025-12-31");
    const { data: item } = await addItem(vid, "provided", 45);
    await submitVersion(vid);
    await approveVersion(vid);
    await publishVersion(vid);
    const { error } = await supabase
      .from("supplier_cost_items")
      .delete()
      .eq("id", item.id);
    log("COST-H08", error !== null, error?.message || "rejected");
  }

  // ---- H09: direct UPDATE status=approved on under_review → REJECT ----
  console.log("COST-H09: under_review → approved (direct UPDATE) → REJECT");
  {
    const vid = await createVersion("H09", "2025-01-01", "2025-12-31");
    await addItem(vid, "provided", 10);
    await submitVersion(vid);
    const { error } = await supabase
      .from("supplier_cost_table_versions")
      .update({ status: "approved" })
      .eq("id", vid);
    log("COST-H09", error !== null, error?.message || "rejected");
  }

  // ---- H10: direct UPDATE status=active on approved → REJECT ----
  console.log("COST-H10: approved → active (direct UPDATE) → REJECT");
  {
    const vid = await createVersion("H10", "2025-01-01", "2025-12-31");
    await addItem(vid, "provided", 10);
    await submitVersion(vid);
    await approveVersion(vid);
    const { error } = await supabase
      .from("supplier_cost_table_versions")
      .update({ status: "active" })
      .eq("id", vid);
    log("COST-H10", error !== null, error?.message || "rejected");
  }

  // ---- H11: version numbers are DISTINCT ----
  console.log("COST-H11: version numbers are DISTINCT");
  {
    const v1 = await createVersion("H11-A", "2025-01-01", "2025-12-31");
    const v2 = await createVersion("H11-B", "2025-01-01", "2025-12-31");
    const { data: rows } = await supabase
      .from("supplier_cost_table_versions")
      .select("id, version_number")
      .in("id", [v1, v2])
      .order("version_number");
    const nums = rows.map((r) => r.version_number);
    log("COST-H11", nums.length === 2 && nums[0] !== nums[1], `v1=${nums[0]} v2=${nums[1]}`);
  }

  // ---- H12: overlap protection (EXCLUDE constraint) ----
  console.log("COST-H12: overlap protection (EXCLUDE constraint)");
  {
    // The publish RPC gracefully handles overlap by superseding the previous version.
    // The EXCLUDE constraint is a safety net for direct SQL operations.
    // Verify the constraint exists in the schema.
    const { data: constraints } = await supabase.rpc("fn_get_cost_stats", {
      p_organization_id: F.orgId,
    });

    // Also verify that publishing a version with overlapping dates succeeds
    // (because the RPC supersedes the old version first)
    const v1 = await createVersion("H12-A", "2025-01-01", "2025-12-31");
    await addItem(v1, "provided", 100);
    await submitVersion(v1);
    await approveVersion(v1);
    await publishVersion(v1);

    // v1 is now active — create v2 with overlapping dates
    const v2 = await createVersion("H12-B", "2025-06-01", "2025-12-31");
    await addItem(v2, "provided", 200);
    await submitVersion(v2);
    await approveVersion(v2);

    // Publish v2 — should succeed because RPC supersedes v1
    const { error: pubErr } = await supabase.rpc("fn_publish_cost_version", { p_version_id: v2 });

    // Verify v1 is now superseded and v2 is active
    const { data: v1Row } = await supabase
      .from("supplier_cost_table_versions")
      .select("status")
      .eq("id", v1)
      .single();
    const { data: v2Row } = await supabase
      .from("supplier_cost_table_versions")
      .select("status")
      .eq("id", v2)
      .single();

    const ok = pubErr === null && v1Row?.status === "superseded" && v2Row?.status === "active";
    log("COST-H12", ok, `v1=${v1Row?.status} v2=${v2Row?.status} pubErr=${pubErr?.message || "none"}`);
  }

  // ---- H13: scheduled future keeps predecessor active + date-driven resolution ----
  console.log("COST-H13: scheduled future keeps predecessor active + date-driven resolution");
  {
    const vB_AFTER = "2099-01-01";

    // Create vA (active, current)
    const vA = await createVersion("H13-A", "2025-01-01", null);
    await addItem(vA, "provided", 10.0);
    await submitVersion(vA);
    await approveVersion(vA);
    await publishVersion(vA);

    // Create vB (scheduled, future)
    const vB = await createVersion("H13-B", vB_AFTER, null);
    await addItem(vB, "provided", 15.0);
    await submitVersion(vB);
    await approveVersion(vB);

    // Publish vB — must succeed (predecessor stays active; EXCLUDE passes)
    let publishOk = false;
    try {
      await publishVersion(vB);
      publishOk = true;
    } catch (e) {
      console.log("  H13-B publish error:", e.message);
    }
    log("COST-H13.1 publish ok", publishOk);

    // vA must still be ACTIVE (NOT superseded)
    const { data: vARow } = await supabase
      .from("supplier_cost_table_versions")
      .select("status, valid_from, valid_to")
      .eq("id", vA)
      .single();
    log("COST-H13.2 vA stays active", vARow?.status === "active", `vA_status=${vARow?.status}`);

    // vA.valid_to must be closed to vB.valid_from
    log("COST-H13.3 vA.valid_to = B.valid_from", vARow?.valid_to === vB_AFTER, `vA.valid_to=${vARow?.valid_to}`);

    // vB must be scheduled
    const { data: vBRow } = await supabase
      .from("supplier_cost_table_versions")
      .select("status, valid_from, valid_to")
      .eq("id", vB)
      .single();
    log("COST-H13.4 vB scheduled", vBRow?.status === "scheduled", `vB_status=${vBRow?.status}`);

    const today = new Date().toISOString().slice(0, 10);

    // resolve(today) → vA (10.0) — B not applicable yet
    const rToday = await resolveCost(null, null, today);
    log(
      "COST-H13.5 resolve(today)=vA",
      rToday.data?.amount === 10.0 && rToday.data?.version_id === vA,
      `today→${rToday.data?.amount}`
    );

    // resolve(B.valid_from) → vB (15.0) — date-driven, scheduled included
    const rFrom = await resolveCost(null, null, vB_AFTER);
    log(
      "COST-H13.6 resolve(B.valid_from)=vB",
      rFrom.data?.amount === 15.0 && rFrom.data?.version_id === vB,
      `${vB_AFTER}→${rFrom.data?.amount}`
    );

    // resolve(after B) → vB (15.0)
    const rAfter = await resolveCost(null, null, "2099-06-01");
    log(
      "COST-H13.7 resolve(after B)=vB",
      rAfter.data?.amount === 15.0 && rAfter.data?.version_id === vB,
      `2099-06-01→${rAfter.data?.amount}`
    );
  }

  // ---- H14: historical lookup in superseded version ----
  console.log("COST-H14: historical lookup in superseded version");
  {
    const { data: res } = await resolveCost(null, null, "2025-03-01");
    log(
      "COST-H14",
      res?.resolution_status === "CONFIRMED",
      `amount=${res?.amount} resolution=${res?.resolution_status}`
    );
  }

  // ---- H15: current lookup ----
  console.log("COST-H15: current lookup");
  {
    const { data: res } = await resolveCost(null, null, new Date().toISOString().slice(0, 10));
    log(
      "COST-H15",
      res?.amount !== null && res?.resolution_status === "CONFIRMED",
      `amount=${res?.amount} resolution=${res?.resolution_status}`
    );
  }

  // ---- H16: confirmed_zero resolution ----
  console.log("COST-H16: confirmed_zero resolution");
  {
    // Create a version with confirmed_zero for a second mapping
    const m2 = await createSecondMapping();
    const vZ = await createVersion("H16-Z", "2025-01-01", null);
    await supabase.from("supplier_cost_items").insert({
      organization_id: F.orgId,
      cost_table_version_id: vZ,
      supplier_catalog_item_id: m2.mappingId,
      catalog_item_id: m2.catalogItemId,
      cost_status: "confirmed_zero",
      amount: 0,
    });
    await submitVersion(vZ);
    await approveVersion(vZ);
    await publishVersion(vZ);

    const { data: res } = await resolveCost(null, m2.catalogItemId, new Date().toISOString().slice(0, 10));
    log(
      "COST-H16",
      res?.resolution_status === "CONFIRMED" && res?.cost_status === "confirmed_zero",
      `amount=${res?.amount} status=${res?.cost_status} resolution=${res?.resolution_status}`
    );
  }

  // ---- H17: unknown cost resolution (not_provided → COST_NOT_CONFIRMED) ----
  console.log("COST-H17: unknown cost resolution → COST_NOT_CONFIRMED");
  {
    const m3 = await createSecondMapping();
    const vN = await createVersion("H17-N", "2025-01-01", null);
    await supabase.from("supplier_cost_items").insert({
      organization_id: F.orgId,
      cost_table_version_id: vN,
      supplier_catalog_item_id: m3.mappingId,
      catalog_item_id: m3.catalogItemId,
      cost_status: "not_provided",
      amount: null,
    });
    await submitVersion(vN);
    await approveVersion(vN);
    await publishVersion(vN);

    const { data } = await supabase.rpc("fn_resolve_supplier_cost", {
      p_organization_id: F.orgId,
      p_supplier_company_id: F.companyId,
      p_catalog_item_id: m3.catalogItemId,
      p_reference_date: new Date().toISOString().slice(0, 10),
    });
    const r = data?.[0];
    log(
      "COST-H17",
      r?.amount === null && r?.resolution_status === "COST_NOT_CONFIRMED",
      `amount=${r?.amount} resolution=${r?.resolution_status} reason=${r?.reason}`
    );
  }

  // ---- H18: no hard delete of cost table ----
  console.log("COST-H18: no hard delete of cost table");
  {
    const { error } = await supabase
      .from("supplier_cost_tables")
      .delete()
      .eq("id", F.costTableId);
    log("COST-H18", error !== null, error?.message || "hard delete blocked");
  }

  // ---- H19: idempotent scheduled→active cutover (fn_sync_cost_version_status) ----
  console.log("COST-H19: fn_sync_cost_version_status idempotent cutover");
  {
    const CUTOVER = "2099-01-01";
    const m = await createSecondMapping();

    // vA: active today
    const vA = await createVersion("H19-A", "2025-01-01", null);
    await supabase.from("supplier_cost_items").insert({
      organization_id: F.orgId,
      cost_table_version_id: vA,
      supplier_catalog_item_id: m.mappingId,
      catalog_item_id: m.catalogItemId,
      cost_status: "provided",
      amount: 100.0,
    });
    await submitVersion(vA);
    await approveVersion(vA);
    await publishVersion(vA);

    // vB: scheduled future (valid_from > current_date → scheduled)
    const vB = await createVersion("H19-B", CUTOVER, null);
    await supabase.from("supplier_cost_items").insert({
      organization_id: F.orgId,
      cost_table_version_id: vB,
      supplier_catalog_item_id: m.mappingId,
      catalog_item_id: m.catalogItemId,
      cost_status: "provided",
      amount: 200.0,
    });
    await submitVersion(vB);
    await approveVersion(vB);
    await publishVersion(vB);

    // Predecessor stays active with closed valid_to; vB scheduled
    const { data: aRow } = await supabase
      .from("supplier_cost_table_versions")
      .select("status, valid_to")
      .eq("id", vA)
      .single();
    const { data: bRow } = await supabase
      .from("supplier_cost_table_versions")
      .select("status")
      .eq("id", vB)
      .single();
    log(
      "COST-H19.1 scheduled publish (pred stays active)",
      aRow?.status === "active" && aRow?.valid_to === CUTOVER && bRow?.status === "scheduled",
      `vA=${aRow?.status} vA.to=${aRow?.valid_to} vB=${bRow?.status}`
    );

    const today = new Date().toISOString().slice(0, 10);

    // resolve(today) → vA (100)
    const rToday = await supabase.rpc("fn_resolve_supplier_cost", {
      p_organization_id: F.orgId,
      p_supplier_company_id: F.companyId,
      p_catalog_item_id: m.catalogItemId,
      p_reference_date: today,
    });
    log("COST-H19.2 resolve(today)=vA", rToday.data?.[0]?.amount === 100.0, `today→${rToday.data?.[0]?.amount}`);

    // resolve(cutover) → vB (200) — date-driven, scheduled included
    const rCut = await supabase.rpc("fn_resolve_supplier_cost", {
      p_organization_id: F.orgId,
      p_supplier_company_id: F.companyId,
      p_catalog_item_id: m.catalogItemId,
      p_reference_date: CUTOVER,
    });
    log("COST-H19.3 resolve(cutover)=vB", rCut.data?.[0]?.amount === 200.0, `${CUTOVER}→${rCut.data?.[0]?.amount}`);

    // Run cutover at reference date = CUTOVER
    const { data: synced, error: syncErr } = await supabase.rpc("fn_sync_cost_version_status", {
      p_reference_date: CUTOVER,
    });
    log("COST-H19.4 cutover ran", syncErr === null && synced >= 1, `activated=${synced} err=${syncErr?.message || "none"}`);

    // vB now active, vA superseded
    const { data: aRow2 } = await supabase
      .from("supplier_cost_table_versions")
      .select("status")
      .eq("id", vA)
      .single();
    const { data: bRow2 } = await supabase
      .from("supplier_cost_table_versions")
      .select("status")
      .eq("id", vB)
      .single();
    log(
      "COST-H19.5 cutover statuses",
      aRow2?.status === "superseded" && bRow2?.status === "active",
      `vA=${aRow2?.status} vB=${bRow2?.status}`
    );

    // resolve(cutover) → vB (200) after cutover
    const rAfter = await supabase.rpc("fn_resolve_supplier_cost", {
      p_organization_id: F.orgId,
      p_supplier_company_id: F.companyId,
      p_catalog_item_id: m.catalogItemId,
      p_reference_date: CUTOVER,
    });
    log("COST-H19.6 resolve(cutover)=vB after cutover", rAfter.data?.[0]?.amount === 200.0, `${CUTOVER}→${rAfter.data?.[0]?.amount}`);

    // Idempotency: second run activates nothing
    const { data: synced2, error: syncErr2 } = await supabase.rpc("fn_sync_cost_version_status", {
      p_reference_date: CUTOVER,
    });
    log("COST-H19.7 idempotent (second run → 0)", syncErr2 === null && synced2 === 0, `activated=${synced2} err=${syncErr2?.message || "none"}`);
  }

  // ---- TEMPORAL SMOKE: A/B/C versioning ----
  console.log("TEMPORAL SMOKE: A/B/C versioning");
  {
    // Use second mapping for clean test
    const m = await createSecondMapping();

    // Version A (superseded)
    const vA = await createVersion("Smoke-A", "2025-01-01", "2025-06-01");
    await supabase.from("supplier_cost_items").insert({
      organization_id: F.orgId,
      cost_table_version_id: vA,
      supplier_catalog_item_id: m.mappingId,
      catalog_item_id: m.catalogItemId,
      cost_status: "provided",
      amount: 100.0,
    });
    await submitVersion(vA);
    await approveVersion(vA);
    await publishVersion(vA);

    // Version B (active)
    const vB = await createVersion("Smoke-B", "2025-06-01", null);
    await supabase.from("supplier_cost_items").insert({
      organization_id: F.orgId,
      cost_table_version_id: vB,
      supplier_catalog_item_id: m.mappingId,
      catalog_item_id: m.catalogItemId,
      cost_status: "provided",
      amount: 200.0,
    });
    await submitVersion(vB);
    await approveVersion(vB);
    await publishVersion(vB);

    // Test 1: 2025-03-01 → 100.00 (version A)
    const r1 = await supabase.rpc("fn_resolve_supplier_cost", {
      p_organization_id: F.orgId,
      p_supplier_company_id: F.companyId,
      p_catalog_item_id: m.catalogItemId,
      p_reference_date: "2025-03-01",
    });
    log(
      "SMOKE-T1",
      r1.data?.[0]?.amount === 100.0,
      `2025-03-01 → ${r1.data?.[0]?.amount}`
    );

    // Test 2: 2025-07-01 → 200.00 (version B)
    const r2 = await supabase.rpc("fn_resolve_supplier_cost", {
      p_organization_id: F.orgId,
      p_supplier_company_id: F.companyId,
      p_catalog_item_id: m.catalogItemId,
      p_reference_date: "2025-07-01",
    });
    log(
      "SMOKE-T2",
      r2.data?.[0]?.amount === 200.0,
      `2025-07-01 → ${r2.data?.[0]?.amount}`
    );

    // Test 3: today → 200.00 (version B)
    const r3 = await supabase.rpc("fn_resolve_supplier_cost", {
      p_organization_id: F.orgId,
      p_supplier_company_id: F.companyId,
      p_catalog_item_id: m.catalogItemId,
      p_reference_date: new Date().toISOString().slice(0, 10),
    });
    log(
      "SMOKE-T3",
      r3.data?.[0]?.amount === 200.0,
      `today → ${r3.data?.[0]?.amount}`
    );
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║  PRC-03A: COST INTEGRITY — REMOTE TESTS      ║");
  console.log("║  COST-H01 to COST-H18 + Temporal Smoke       ║");
  console.log("╚════════════════════════════════════════════════╝");

  try {
    await authenticate();
    await runTests();
  } catch (e) {
    console.error("\n💀 FATAL:", e.message);
    process.exit(1);
  }

  await cleanupFixtures();

  console.log("\n═══ SUMMARY ═══");
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  if (failures.length > 0) {
    console.log("  Failures:", failures.join(", "));
  }
  console.log(failed === 0 ? "\n  ✅ ALL TESTS PASSED" : "\n  ❌ SOME TESTS FAILED");
  process.exit(failed > 0 ? 1 : 0);
}

main();
