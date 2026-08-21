#!/usr/bin/env node
/**
 * PRC-04B: POL-H01 to POL-H27 Remote Integrity Tests
 *
 * Runs against the remote Supabase project using the JS client.
 * Tests pricing policy schema integrity: scope rules, method constraints,
 * component integrity, temporal exclusion, cross-tenant protection,
 * immutability, hard-delete guards, RLS and RBAC.
 *
 * Requires: tests/remote/sql/pricing_test_setup.sql to have been executed
 * first (creates the dedicated test organizations with deterministic UUIDs).
 *
 * Credentials come from environment variables (never hardcoded):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
 *   E2E_TEST_EMAIL, E2E_TEST_PASSWORD
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || process.env.PRC03A_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || process.env.PRC03A_TEST_PASSWORD;

if (!SUPABASE_URL) {
  console.error("Missing required env var: VITE_SUPABASE_URL");
  process.exit(1);
}
if (!SUPABASE_ANON_KEY) {
  console.error("Missing required env var: VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error(
    "Missing E2E_TEST_EMAIL/E2E_TEST_PASSWORD (legacy PRC03A fallback is supported)"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let passed = 0;
let failed = 0;
const failures = [];
const draftVersionIds = [];

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

// ============================================================
// FIXTURE IDS (deterministic — must match pricing_test_setup.sql)
// ============================================================
const F = {
  user: "d7df8bb1-7da4-4926-8bd2-2fe6ad8ac060",
  pOrg: "b3333333-3333-3333-3333-333333333333", // main pricing test org (admin)
  xOrg: "c3333333-3333-3333-3333-333333333333", // foreign org (no membership)
  yOrg: "d3333333-3333-3333-3333-333333333333", // viewer-only org (no policy perms)
  zOrg: "e3333333-3333-3333-3333-333333333333", // admin org for cross-tenant trigger tests
  pCat: "b3333333-0000-0000-0000-000000000001",
  pItemA: "b3333333-0000-0000-0000-000000000002",
  pItemB: "b3333333-0000-0000-0000-000000000003",
  xCat: "c3333333-0000-0000-0000-000000000001",
  xItem: "c3333333-0000-0000-0000-000000000002",
};

const RUN = Date.now().toString(36);

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
async function insertPolicy(org, scopeType, { categoryId = null, itemId = null, status = "active", code = null } = {}) {
  return await supabase
    .from("pricing_policies")
    .insert({
      organization_id: org,
      code: code || `POL-${scopeType}-${RUN}`,
      name: `Test ${scopeType} ${RUN}`,
      scope_type: scopeType,
      catalog_category_id: categoryId,
      catalog_item_id: itemId,
      status,
      created_by: F.user,
      updated_by: F.user,
    })
    .select("id")
    .single();
}

async function insertVersion(policyId, org, {
  versionNumber,
  validFrom,
  validTo = null,
  status = "draft",
  method = "target_margin",
  targetMarginRate = null,
  markupRate = null,
  fixedPrice = null,
  minimumMarginRate = null,
  maximumDiscountRate = null,
  roundingMode = "none",
  roundingStep = null,
}) {
  if (targetMarginRate === null && markupRate === null && fixedPrice === null) {
    if (method === "markup") markupRate = 0.1;
    else if (method === "fixed_price") fixedPrice = 10;
    else targetMarginRate = 0.2; // target_margin
  }
  const payload = {
    organization_id: org,
    pricing_policy_id: policyId,
    version_number: versionNumber,
    valid_from: validFrom,
    valid_to: validTo,
    status,
    pricing_method: method,
    target_margin_rate: targetMarginRate,
    markup_rate: markupRate,
    fixed_price: fixedPrice,
    minimum_margin_rate: minimumMarginRate,
    maximum_discount_rate: maximumDiscountRate,
    rounding_mode: roundingMode,
    rounding_step: roundingStep,
    created_by: F.user,
  };
  if (targetMarginRate !== null) payload.target_margin_rate = targetMarginRate;
  if (markupRate !== null) payload.markup_rate = markupRate;
  if (fixedPrice !== null) payload.fixed_price = fixedPrice;
  const res = await supabase
    .from("pricing_policy_versions")
    .insert(payload)
    .select("id")
    .single();
  if (!res.error && status === "draft") draftVersionIds.push(res.data.id);
  return res;
}

async function insertComponent(versionId, org, { type, fixedAmount = null, rate = null, name = null }) {
  return await supabase
    .from("pricing_policy_components")
    .insert({
      organization_id: org,
      pricing_policy_version_id: versionId,
      name: name || `comp-${type}-${RUN}`,
      component_type: type,
      fixed_amount: fixedAmount,
      rate,
      created_by: F.user,
      updated_by: F.user,
    })
    .select("id")
    .single();
}

// ============================================================
// TESTS
// ============================================================
async function runTests() {
  console.log("\n═══ POL-H01..H27 TESTS ═══\n");

  // ---- H01: DEFAULT scope valid → ACCEPT ----
  console.log("POL-H01: DEFAULT scope valid → ACCEPT");
  let defaultPolicyId;
  {
    const { data, error } = await insertPolicy(F.pOrg, "default");
    defaultPolicyId = data?.id;
    log("POL-H01", data !== null && error === null, data?.id ? "accepted id=" + data.id : error?.message);
  }

  // ---- H02: DEFAULT with category → REJECT ----
  console.log("POL-H02: DEFAULT with category → REJECT");
  {
    const { error } = await insertPolicy(F.pOrg, "default", { categoryId: F.pCat });
    log("POL-H02", error !== null, error?.message || "rejected");
  }

  // ---- H03: CATEGORY without category → REJECT ----
  console.log("POL-H03: CATEGORY without category → REJECT");
  {
    const { error } = await insertPolicy(F.pOrg, "category");
    log("POL-H03", error !== null, error?.message || "rejected");
  }

  // ---- H04: CATEGORY + item simultaneously → REJECT ----
  console.log("POL-H04: CATEGORY + item simultaneously → REJECT");
  {
    const { error } = await insertPolicy(F.pOrg, "category", { categoryId: F.pCat, itemId: F.pItemA });
    log("POL-H04", error !== null, error?.message || "rejected");
  }

  // ---- H05: CATALOG_ITEM without item → REJECT ----
  console.log("POL-H05: CATALOG_ITEM without item → REJECT");
  {
    const { error } = await insertPolicy(F.pOrg, "catalog_item");
    log("POL-H05", error !== null, error?.message || "rejected");
  }

  // ---- H06: duplicate DEFAULT policy → REJECT ----
  console.log("POL-H06: duplicate DEFAULT policy → REJECT");
  {
    const { error } = await insertPolicy(F.pOrg, "default", { code: `POL-default-dup-${RUN}` });
    log("POL-H06", error !== null, error?.message || "rejected");
  }

  // ---- H07: duplicate same CATEGORY scope → REJECT ----
  console.log("POL-H07: duplicate same CATEGORY scope → REJECT");
  {
    const first = await insertPolicy(F.pOrg, "category", { categoryId: F.pCat, code: `POL-cat-${RUN}` });
    log("POL-H07.1 first category policy accepted", first.error === null, first.data?.id || first.error?.message);
    const dup = await insertPolicy(F.pOrg, "category", { categoryId: F.pCat, code: `POL-cat-dup-${RUN}` });
    log("POL-H07", dup.error !== null, dup.error?.message || "rejected");
  }

  // ---- H08: cross-organization category/item → REJECT ----
  console.log("POL-H08: cross-organization item → REJECT");
  {
    const { error } = await insertPolicy(F.pOrg, "catalog_item", { itemId: F.xItem, code: `POL-xitem-${RUN}` });
    log("POL-H08", error !== null, error?.message || "rejected");
  }

  // ---- H09: TARGET_MARGIN valid input → ACCEPT ----
  console.log("POL-H09: TARGET_MARGIN valid input → ACCEPT");
  {
    const { data, error } = await insertVersion(defaultPolicyId, F.pOrg, {
      versionNumber: 1, validFrom: "2026-01-01", targetMarginRate: 0.2,
    });
    log("POL-H09", data !== null && error === null, data?.id ? "accepted id=" + data.id : error?.message);
  }

  // ---- H10: TARGET_MARGIN >= 1 → REJECT ----
  console.log("POL-H10: TARGET_MARGIN >= 1 → REJECT");
  {
    const { error } = await insertVersion(defaultPolicyId, F.pOrg, {
      versionNumber: 2, validFrom: "2026-01-01", targetMarginRate: 1.0,
    });
    log("POL-H10", error !== null, error?.message || "rejected");
  }

  // ---- H11: TARGET_MARGIN with markup also populated → REJECT ----
  console.log("POL-H11: TARGET_MARGIN with markup also populated → REJECT");
  {
    const { error } = await insertVersion(defaultPolicyId, F.pOrg, {
      versionNumber: 3, validFrom: "2026-01-01", targetMarginRate: 0.2, markupRate: 0.25,
    });
    log("POL-H11", error !== null, error?.message || "rejected");
  }

  // ---- H12: MARKUP negative → REJECT ----
  console.log("POL-H12: MARKUP negative → REJECT");
  {
    const { error } = await insertVersion(defaultPolicyId, F.pOrg, {
      versionNumber: 4, validFrom: "2026-01-01", method: "markup", markupRate: -0.1,
    });
    log("POL-H12", error !== null, error?.message || "rejected");
  }

  // ---- H13: FIXED_PRICE negative → REJECT ----
  console.log("POL-H13: FIXED_PRICE negative → REJECT");
  {
    const { error } = await insertVersion(defaultPolicyId, F.pOrg, {
      versionNumber: 5, validFrom: "2026-01-01", method: "fixed_price", fixedPrice: -5,
    });
    log("POL-H13", error !== null, error?.message || "rejected");
  }

  // ---- H14: invalid minimum margin → REJECT ----
  console.log("POL-H14: invalid minimum margin (1.5) → REJECT");
  {
    const { error } = await insertVersion(defaultPolicyId, F.pOrg, {
      versionNumber: 6, validFrom: "2026-01-01", minimumMarginRate: 1.5,
    });
    log("POL-H14", error !== null, error?.message || "rejected");
  }

  // ---- H15: invalid maximum discount → REJECT ----
  console.log("POL-H15: invalid maximum discount (1.5) → REJECT");
  {
    const { error } = await insertVersion(defaultPolicyId, F.pOrg, {
      versionNumber: 7, validFrom: "2026-01-01", maximumDiscountRate: 1.5,
    });
    log("POL-H15", error !== null, error?.message || "rejected");
  }

  // ---- H16: rounding mode != none without positive step → REJECT ----
  console.log("POL-H16: rounding 'nearest' without step → REJECT");
  {
    const { error } = await insertVersion(defaultPolicyId, F.pOrg, {
      versionNumber: 8, validFrom: "2026-01-01", roundingMode: "nearest",
    });
    log("POL-H16", error !== null, error?.message || "rejected");
  }

  // ---- H17: FIXED component valid → ACCEPT ----
  console.log("POL-H17: FIXED component valid → ACCEPT");
  let draftVersionId;
  {
    const { data, error } = await insertVersion(defaultPolicyId, F.pOrg, {
      versionNumber: 9, validFrom: "2026-01-01",
    });
    draftVersionId = data?.id;
    log("POL-H17.1 draft version created", data !== null && error === null, data?.id || error?.message);
    const comp = await insertComponent(draftVersionId, F.pOrg, { type: "fixed", fixedAmount: 10 });
    log("POL-H17", comp.data !== null && comp.error === null, comp.data?.id ? "accepted id=" + comp.data.id : comp.error?.message);
  }

  // ---- H18: FIXED component with rate → REJECT ----
  console.log("POL-H18: FIXED component with rate → REJECT");
  {
    const { error } = await insertComponent(draftVersionId, F.pOrg, { type: "fixed", fixedAmount: 10, rate: 0.05 });
    log("POL-H18", error !== null, error?.message || "rejected");
  }

  // ---- H19: PERCENTAGE component valid → ACCEPT ----
  console.log("POL-H19: PERCENTAGE component valid → ACCEPT");
  {
    const comp = await insertComponent(draftVersionId, F.pOrg, { type: "percentage_of_base_cost", rate: 0.05 });
    log("POL-H19", comp.data !== null && comp.error === null, comp.data?.id ? "accepted id=" + comp.data.id : comp.error?.message);
  }

  // ---- H20: PERCENTAGE component with fixed_amount → REJECT ----
  console.log("POL-H20: PERCENTAGE component with fixed_amount → REJECT");
  {
    const { error } = await insertComponent(draftVersionId, F.pOrg, { type: "percentage_of_base_cost", rate: 0.05, fixedAmount: 10 });
    log("POL-H20", error !== null, error?.message || "rejected");
  }

  // ---- H21: cross-tenant version/component → REJECT ----
  console.log("POL-H21: cross-tenant version/component → REJECT");
  {
    // version in Z_ORG referencing a P_ORG policy (RLS passes, trigger rejects)
    const v = await insertVersion(defaultPolicyId, F.zOrg, {
      versionNumber: 1, validFrom: "2026-01-01",
    });
    log("POL-H21.1 cross-tenant version rejected", v.error !== null, v.error?.message || "rejected");
    // component in Z_ORG referencing a P_ORG version
    const c = await insertComponent(draftVersionId, F.zOrg, { type: "fixed", fixedAmount: 5 });
    log("POL-H21", c.error !== null, c.error?.message || "rejected");
  }

  // ---- H22: overlapping active/scheduled ranges → REJECT ----
  console.log("POL-H22: overlapping active ranges → REJECT");
  {
    const pol = await insertPolicy(F.pOrg, "catalog_item", { itemId: F.pItemB, code: `POL-h22-${RUN}` });
    if (pol.error) throw new Error("H22 policy setup failed: " + pol.error.message);
    const v1 = await insertVersion(pol.data.id, F.pOrg, {
      versionNumber: 1, validFrom: "2027-01-01", status: "active",
    });
    log("POL-H22.1 first active version accepted", v1.error === null, v1.error?.message || "accepted");
    const v2 = await insertVersion(pol.data.id, F.pOrg, {
      versionNumber: 2, validFrom: "2027-06-01", status: "active",
    });
    log("POL-H22", v2.error !== null, v2.error?.message || "rejected");
  }

  // ---- H23: adjacent ranges → ACCEPT ----
  console.log("POL-H23: adjacent ranges → ACCEPT");
  {
    const pol = await insertPolicy(F.pOrg, "catalog_item", { itemId: F.pItemA, code: `POL-h23-${RUN}` });
    if (pol.error) throw new Error("H23 policy setup failed: " + pol.error.message);
    const v1 = await insertVersion(pol.data.id, F.pOrg, {
      versionNumber: 1, validFrom: "2028-01-01", validTo: "2028-06-01", status: "active",
    });
    log("POL-H23.1 first active version accepted", v1.error === null, v1.error?.message || "accepted");
    const v2 = await insertVersion(pol.data.id, F.pOrg, {
      versionNumber: 2, validFrom: "2028-06-01", status: "active",
    });
    log("POL-H23", v2.data !== null && v2.error === null, v2.data?.id ? "accepted id=" + v2.data.id : v2.error?.message);
  }

  // ---- H24: component mutation on non-draft parent → REJECT ----
  console.log("POL-H24: component mutation on non-draft parent → REJECT");
  let activeVersionId;
  {
    const v = await insertVersion(defaultPolicyId, F.pOrg, {
      versionNumber: 10, validFrom: "2030-01-01", validTo: "2030-12-31", status: "active",
    });
    activeVersionId = v.data?.id;
    log("POL-H24.1 active version created", v.error === null, v.error?.message || "accepted");
    const comp = await insertComponent(activeVersionId, F.pOrg, { type: "fixed", fixedAmount: 5 });
    log("POL-H24", comp.error !== null, comp.error?.message || "rejected");
  }

  // ---- H25: non-draft version hard-delete → REJECT ----
  console.log("POL-H25: non-draft version hard-delete → REJECT");
  {
    const v = await insertVersion(defaultPolicyId, F.pOrg, {
      versionNumber: 11, validFrom: "2031-01-01", status: "active",
    });
    if (v.error) throw new Error("H25 version setup failed: " + v.error.message);
    const { error } = await supabase.from("pricing_policy_versions").delete().eq("id", v.data.id);
    log("POL-H25", error !== null, error?.message || "rejected");
  }

  // ---- H26: RLS cross-tenant access → REJECT ----
  console.log("POL-H26: RLS cross-tenant access → REJECT");
  {
    const policies = await supabase.from("pricing_policies").select("id").eq("organization_id", F.xOrg);
    const versions = await supabase.from("pricing_policy_versions").select("id").eq("organization_id", F.xOrg);
    const components = await supabase.from("pricing_policy_components").select("id").eq("organization_id", F.xOrg);
    log(
      "POL-H26",
      (policies.data?.length || 0) === 0 && (versions.data?.length || 0) === 0 && (components.data?.length || 0) === 0,
      `policies=${policies.data?.length || 0} versions=${versions.data?.length || 0} components=${components.data?.length || 0}`
    );
  }

  // ---- H27: permissionless mutation → REJECT ----
  console.log("POL-H27: permissionless mutation (viewer-only org) → REJECT");
  {
    const { data, error } = await insertPolicy(F.yOrg, "default", { code: `POL-yorg-${RUN}` });
    const blocked = error !== null || (data === null || (Array.isArray(data) && data.length === 0));
    log("POL-H27", blocked, error?.message || (data ? "row returned (NOT blocked)" : "blocked (no row)"));
  }
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanupFixtures() {
  console.log("\n═══ CLEANUP ═══");
  let cleaned = 0;
  for (const id of draftVersionIds) {
    try {
      const { error } = await supabase.from("pricing_policy_versions").delete().eq("id", id);
      if (!error) cleaned++;
    } catch {
      // hard delete may be blocked by trigger — ignore
    }
  }
  console.log(`  Removed ${cleaned}/${draftVersionIds.length} draft versions (cascaded components)`);
  // Non-draft harness artifacts (active/scheduled/superseded versions and
  // policies with history) are intentionally left in the dedicated test orgs;
  // pricing_test_setup.sql resets them on the next run (test-only helper).
  console.log("  Note: non-draft harness artifacts left for reproducibility; reset via pricing_test_setup.sql");
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║  PRC-04B: PRICING POLICY INTEGRITY REMOTE TESTS  ║");
  console.log("║  POL-H01 to POL-H27                              ║");
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
