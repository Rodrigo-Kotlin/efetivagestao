#!/usr/bin/env node
/**
 * PRC-04E: Pricing Full-Flow Remote End-to-End Test
 *
 * Drives ONE complete pricing scenario through the public application-facing
 * interfaces (RPCs) only:
 *
 *   catalog item → supplier mapping → confirmed cost → cost version
 *   → pricing policy → policy version → authoritative engine
 *   → fn_simulate_price → user-facing result
 *
 * Verifies: current-date resolution, future-date resolution (date-driven, no
 * physical scheduler), historical reproducibility, determinism, margin vs
 * markup, unknown cost != zero, confirmed zero, violation integration,
 * zero-denominator safety, provenance completeness, RBAC/backend
 * authorization and cross-tenant rejection.
 *
 * Uses a DEDICATED isolated fixture chain inside the PRC-04 test org
 * (own supplier, catalog items, cost table, policies) so it never touches
 * production business records and never conflicts with other suites.
 *
 * Requires: tests/remote/sql/pricing_engine_test_setup.sql executed first
 * (provides the dedicated test org + membership). Credentials from env:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, E2E_TEST_EMAIL, E2E_TEST_PASSWORD
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || process.env.PRC03A_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || process.env.PRC03A_TEST_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error("Missing env vars: E2E_TEST_EMAIL/E2E_TEST_PASSWORD");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let passed = 0;
let failed = 0;
const failures = [];
const artifacts = {
  items: [],
  mappings: [],
  costTable: null,
  costVersions: [],
  policyIds: [],
  draftVersionIds: [],
};

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

function approx(a, b, eps = 0.01) {
  return Math.abs(a - b) < eps;
}

// ============================================================
// FIXTURES
// ============================================================
const F = {
  pOrg: "b3333333-3333-3333-3333-333333333333", // PRC-04 dedicated test org
  xOrg: "c3333333-3333-3333-3333-333333333333", // foreign tenant (no membership)
  pCat: "b3333333-0000-0000-0000-000000000001",
};

// Dates (all relative to the frozen PRC-04 test timeline)
const TODAY = new Date().toISOString().slice(0, 10); // current date
const HIST = "2026-06-15"; // historical reference date
const FUT = "2027-06-15"; // future reference date
const RUN = randomUUID().slice(0, 8); // run-unique code suffix (idempotent re-runs)

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
// FIXTURE HELPERS (application-facing interfaces only)
// ============================================================

async function createCompany() {
  const id = randomUUID();
  const { error } = await supabase.from("companies").insert({
    id,
    organization_id: F.pOrg,
    legal_name: "PRC04E Full Flow Supplier",
    status: "active",
    created_by: "d7df8bb1-7da4-4926-8bd2-2fe6ad8ac060",
    updated_by: "d7df8bb1-7da4-4926-8bd2-2fe6ad8ac060",
  });
  if (error) throw new Error("createCompany failed: " + error.message);
  const { error: pErr } = await supabase.from("supplier_profiles").insert({
    company_id: id,
    organization_id: F.pOrg,
    supplier_category: "laboratory",
    status: "active",
    created_by: "d7df8bb1-7da4-4926-8bd2-2fe6ad8ac060",
    updated_by: "d7df8bb1-7da4-4926-8bd2-2fe6ad8ac060",
  });
  if (pErr) throw new Error("createProfile failed: " + pErr.message);
  return id;
}

async function createCatalogItem(code, name) {
  const { data, error } = await supabase
    .from("catalog_items")
    .insert({
      id: randomUUID(),
      organization_id: F.pOrg,
      code: code + "-" + RUN,
      name,
      category_id: F.pCat,
      item_type: "other_service",
      commercial_unit: "unit",
      execution_type: "own",
      status: "active",
      created_by: "d7df8bb1-7da4-4926-8bd2-2fe6ad8ac060",
      updated_by: "d7df8bb1-7da4-4926-8bd2-2fe6ad8ac060",
    })
    .select("id")
    .single();
  if (error) throw new Error("createCatalogItem failed: " + error.message);
  artifacts.items.push(data.id);
  return data.id;
}

async function createMapping(supplierId, itemId, externalCode) {
  const { data, error } = await supabase
    .from("supplier_catalog_items")
    .insert({
      id: randomUUID(),
      organization_id: F.pOrg,
      supplier_company_id: supplierId,
      catalog_item_id: itemId,
      external_code: externalCode + "-" + RUN,
      external_name: "External " + externalCode,
      normalized_external_name: "external " + externalCode,
      external_unit: "unit",
      is_preferred: true,
      status: "active",
      created_by: "d7df8bb1-7da4-4926-8bd2-2fe6ad8ac060",
      updated_by: "d7df8bb1-7da4-4926-8bd2-2fe6ad8ac060",
    })
    .select("id")
    .single();
  if (error) throw new Error("createMapping failed: " + error.message);
  artifacts.mappings.push(data.id);
  return data.id;
}

async function createCostTable(supplierId) {
  const id = randomUUID();
  const { error } = await supabase.from("supplier_cost_tables").insert({
    id,
    organization_id: F.pOrg,
    supplier_company_id: supplierId,
    code: "PRC04E-COST",
    name: "PRC04E Cost Table",
    status: "active",
    created_by: "d7df8bb1-7da4-4926-8bd2-2fe6ad8ac060",
    updated_by: "d7df8bb1-7da4-4926-8bd2-2fe6ad8ac060",
  });
  if (error) throw new Error("createCostTable failed: " + error.message);
  artifacts.costTable = id;
  return id;
}

async function createCostVersion(tableId, validFrom, validTo, label) {
  const { data, error } = await supabase.rpc("fn_create_cost_version", {
    p_cost_table_id: tableId,
    p_valid_from: validFrom,
    p_valid_to: validTo,
    p_version_label: label,
    p_source_date: validFrom,
    p_notes: "PRC04E full-flow",
  });
  if (error) throw new Error("createCostVersion(" + label + ") failed: " + error.message);
  artifacts.costVersions.push(data);
  return data;
}

async function addCostItem(versionId, mappingId, itemId, costStatus, amount) {
  const { error } = await supabase.from("supplier_cost_items").insert({
    organization_id: F.pOrg,
    cost_table_version_id: versionId,
    supplier_catalog_item_id: mappingId,
    catalog_item_id: itemId,
    cost_status: costStatus,
    amount,
    currency_code: "BRL",
  });
  if (error) throw new Error("addCostItem failed: " + error.message);
}

async function promoteCost(versionId) {
  for (const rpc of ["fn_submit_cost_version", "fn_approve_cost_version", "fn_publish_cost_version"]) {
    const { error } = await supabase.rpc(rpc, { p_version_id: versionId });
    if (error) throw new Error(rpc + " failed: " + error.message);
  }
}

async function createPolicy(itemId, code) {
  const { data, error } = await supabase.rpc("fn_create_pricing_policy", {
    p_organization_id: F.pOrg,
    p_code: code + "-" + RUN,
    p_name: "PRC04E " + code,
    p_description: "PRC04E full-flow policy",
    p_scope_type: "catalog_item",
    p_catalog_category_id: null,
    p_catalog_item_id: itemId,
  });
  if (error) throw new Error("createPolicy(" + code + ") failed: " + error.message);
  artifacts.policyIds.push(data);
  return data;
}

async function createPolicyVersion(policyId, { validFrom, validTo, method, targetMarginRate = null, markupRate = null, minimumMarginRate = null, maximumDiscountRate = null }) {
  const { data, error } = await supabase.rpc("fn_create_pricing_policy_version", {
    p_policy_id: policyId,
    p_valid_from: validFrom,
    p_valid_to: validTo,
    p_pricing_method: method,
    p_target_margin_rate: targetMarginRate,
    p_markup_rate: markupRate,
    p_fixed_price: null,
    p_minimum_margin_rate: minimumMarginRate,
    p_maximum_discount_rate: maximumDiscountRate,
    p_rounding_mode: "none",
    p_rounding_step: null,
  });
  if (error) throw new Error("createPolicyVersion failed: " + error.message);
  artifacts.draftVersionIds.push(data);
  return data;
}

async function addComponent(versionId, name, componentType, fixedAmount, rate) {
  const { error } = await supabase.rpc("fn_add_pricing_policy_component", {
    p_version_id: versionId,
    p_name: name,
    p_component_type: componentType,
    p_fixed_amount: fixedAmount,
    p_rate: rate,
  });
  if (error) throw new Error("addComponent failed: " + error.message);
}

async function promotePolicy(versionId) {
  artifacts.draftVersionIds.splice(artifacts.draftVersionIds.indexOf(versionId), 1);
  for (const rpc of ["fn_submit_pricing_policy_version", "fn_approve_pricing_policy_version", "fn_publish_pricing_policy_version"]) {
    const { error } = await supabase.rpc(rpc, { p_version_id: versionId });
    if (error) throw new Error(rpc + " failed: " + error.message);
  }
}

async function simulate(orgId, supplierId, itemId, refDate, discountRate = 0) {
  return await supabase.rpc("fn_simulate_price", {
    p_organization_id: orgId,
    p_supplier_company_id: supplierId,
    p_catalog_item_id: itemId,
    p_reference_date: refDate,
    p_discount_rate: discountRate,
  });
}

// ============================================================
// FIXTURE BOOTSTRAP
// ============================================================
async function bootstrap() {
  console.log("\n═══ FIXTURE BOOTSTRAP ═══");
  const supplier = await createCompany();

  const itemA = await createCatalogItem("PRC04E-ITEM-A", "PRC04E Item A");
  const itemB1 = await createCatalogItem("PRC04E-ITEM-B1", "PRC04E Item B1");
  const itemB2 = await createCatalogItem("PRC04E-ITEM-B2", "PRC04E Item B2");
  const itemViol = await createCatalogItem("PRC04E-ITEM-VIOL", "PRC04E Item Viol");
  const itemZero = await createCatalogItem("PRC04E-ITEM-ZERO", "PRC04E Item Zero");
  const itemZero2 = await createCatalogItem("PRC04E-ITEM-ZERO2", "PRC04E Item Zero2");
  const itemNoCost = await createCatalogItem("PRC04E-ITEM-NOCOST", "PRC04E Item NoCost");

  const mapA = await createMapping(supplier, itemA, "EXT-FF-A");
  const mapB1 = await createMapping(supplier, itemB1, "EXT-FF-B1");
  const mapB2 = await createMapping(supplier, itemB2, "EXT-FF-B2");
  const mapViol = await createMapping(supplier, itemViol, "EXT-FF-VIOL");
  const mapZero = await createMapping(supplier, itemZero, "EXT-FF-ZERO");
  const mapZero2 = await createMapping(supplier, itemZero2, "EXT-FF-ZERO2");
  const mapNoCost = await createMapping(supplier, itemNoCost, "EXT-FF-NOCOST");

  const costTable = await createCostTable(supplier);
  const vCur = await createCostVersion(costTable, "2026-01-01", "2027-01-01", "v1");
  const vFut = await createCostVersion(costTable, "2027-01-01", null, "v2");

  await addCostItem(vCur, mapA, itemA, "provided", 80);
  await addCostItem(vFut, mapA, itemA, "provided", 110);
  await addCostItem(vCur, mapB1, itemB1, "provided", 100);
  await addCostItem(vCur, mapB2, itemB2, "provided", 100);
  await addCostItem(vCur, mapViol, itemViol, "provided", 100);
  await addCostItem(vCur, mapZero, itemZero, "confirmed_zero", 0);
  await addCostItem(vCur, mapZero2, itemZero2, "confirmed_zero", 0);
  // itemNoCost intentionally has NO cost item

  await promoteCost(vCur); // active [2026-01-01, 2027-01-01)
  await promoteCost(vFut); // scheduled [2027-01-01, ∞)

  // Policy: full-flow item A — margin 0.20 now, margin 0.25 from 2027
  const polA = await createPolicy(itemA, "POL-FF-A");
  const polAV1 = await createPolicyVersion(polA, {
    validFrom: "2026-06-01", validTo: "2027-01-01",
    method: "target_margin", targetMarginRate: 0.2,
  });
  await addComponent(polAV1, "Taxa de coleta", "fixed", 5, null);
  await promotePolicy(polAV1);
  const polAV2 = await createPolicyVersion(polA, {
    validFrom: "2027-01-01", validTo: null,
    method: "target_margin", targetMarginRate: 0.25,
  });
  await addComponent(polAV2, "Taxa de coleta", "fixed", 5, null);
  await promotePolicy(polAV2);

  // Margin vs Markup — same cost (100), same component (5)
  const polM = await createPolicy(itemB1, "POL-FF-MARGIN");
  const polMV = await createPolicyVersion(polM, {
    validFrom: "2026-06-01", validTo: null,
    method: "target_margin", targetMarginRate: 0.2,
  });
  await addComponent(polMV, "Taxa de coleta", "fixed", 5, null);
  await promotePolicy(polMV);

  const polK = await createPolicy(itemB2, "POL-FF-MARKUP");
  const polKV = await createPolicyVersion(polK, {
    validFrom: "2026-06-01", validTo: null,
    method: "markup", markupRate: 0.2,
  });
  await addComponent(polKV, "Taxa de coleta", "fixed", 5, null);
  await promotePolicy(polKV);

  // Violations policy — margin 0.20, min 0.25, max discount 0.10
  const polV = await createPolicy(itemViol, "POL-FF-VIOL");
  const polVV = await createPolicyVersion(polV, {
    validFrom: "2026-06-01", validTo: null,
    method: "target_margin", targetMarginRate: 0.2,
    minimumMarginRate: 0.25, maximumDiscountRate: 0.1,
  });
  await addComponent(polVV, "Taxa de coleta", "fixed", 5, null);
  await promotePolicy(polVV);

  // Confirmed-zero policy — margin 0.20 + fixed 5
  const polZ = await createPolicy(itemZero, "POL-FF-ZERO");
  const polZV = await createPolicyVersion(polZ, {
    validFrom: "2026-06-01", validTo: null,
    method: "target_margin", targetMarginRate: 0.2,
  });
  await addComponent(polZV, "Taxa de coleta", "fixed", 5, null);
  await promotePolicy(polZV);

  // Zero-denominator policy — confirmed zero, NO components (total_cost = 0)
  const polZ2 = await createPolicy(itemZero2, "POL-FF-ZERO2");
  const polZ2V = await createPolicyVersion(polZ2, {
    validFrom: "2026-06-01", validTo: null,
    method: "target_margin", targetMarginRate: 0.2,
  });
  await promotePolicy(polZ2V);

  // No-cost policy — allows COST_NOT_CONFIRMED to be exercised (policy present)
  const polN = await createPolicy(itemNoCost, "POL-FF-NOCOST");
  const polNV = await createPolicyVersion(polN, {
    validFrom: "2026-06-01", validTo: null,
    method: "target_margin", targetMarginRate: 0.2,
  });
  await promotePolicy(polNV);

  console.log(`  supplier=${supplier} costTable=${costTable}`);
  return { supplier, itemA, itemB1, itemB2, itemViol, itemZero, itemZero2, itemNoCost, vCur, vFut, polAV1, polAV2 };
}

// ============================================================
// TEST GROUPS
// ============================================================
async function testCurrentDate(fx) {
  console.log("\n═══ CURRENT-DATE RESOLUTION ═══");
  const { data, error } = await simulate(F.pOrg, fx.supplier, fx.itemA, TODAY);
  log("FF-CURRENT-01 status OK", !error && data?.status === "OK", error?.message || data?.status);
  log(
    "FF-CURRENT-02 resolves current cost version",
    data?.provenance?.cost?.cost_version_id === fx.vCur,
    `version=${data?.provenance?.cost?.cost_version_id}`
  );
  log(
    "FF-CURRENT-03 resolves current policy version",
    data?.provenance?.policy?.pricing_policy_version_id === fx.polAV1,
    `version=${data?.provenance?.policy?.pricing_policy_version_id}`
  );
  log(
    "FF-CURRENT-04 cost amount 80",
    approx(data?.base_cost, 80),
    `base_cost=${data?.base_cost}`
  );
  log(
    "FF-CURRENT-05 price = (80+5)/0.8 = 106.25",
    approx(data?.effective_price, 106.25),
    `effective_price=${data?.effective_price}`
  );
  log(
    "FF-CURRENT-06 policy method + scope in provenance",
    data?.provenance?.policy?.scope_type === "catalog_item" &&
      data?.provenance?.policy?.pricing_method === "target_margin",
    `scope=${data?.provenance?.policy?.scope_type} method=${data?.provenance?.policy?.pricing_method}`
  );
  log(
    "FF-CURRENT-07 component breakdown present",
    Array.isArray(data?.components) && data.components.some((c) => c.name === "Taxa de coleta" && approx(c.component_amount, 5)),
    JSON.stringify(data?.components || [])
  );
  return data;
}

async function testFutureDate(fx) {
  console.log("\n═══ FUTURE-DATE RESOLUTION (no physical cutover) ═══");
  const { data, error } = await simulate(F.pOrg, fx.supplier, fx.itemA, FUT);
  log("FF-FUTURE-01 status OK", !error && data?.status === "OK", error?.message || data?.status);
  log(
    "FF-FUTURE-02 scheduled future COST selected by date",
    data?.provenance?.cost?.cost_version_id === fx.vFut,
    `version=${data?.provenance?.cost?.cost_version_id} status=${data?.provenance?.cost?.cost_status}`
  );
  log(
    "FF-FUTURE-03 scheduled future POLICY selected by date",
    data?.provenance?.policy?.pricing_policy_version_id === fx.polAV2,
    `version=${data?.provenance?.policy?.pricing_policy_version_id}`
  );
  log(
    "FF-FUTURE-04 future cost amount 110",
    approx(data?.base_cost, 110),
    `base_cost=${data?.base_cost}`
  );
  log(
    "FF-FUTURE-05 price = (110+5)/0.75 = 153.33",
    approx(data?.effective_price, 115 / 0.75),
    `effective_price=${data?.effective_price}`
  );
  return data;
}

async function testCurrentRemainsCurrent(fx, currentResult) {
  console.log("\n═══ CURRENT RESULT REMAINS CURRENT ═══");
  const { data, error } = await simulate(F.pOrg, fx.supplier, fx.itemA, TODAY);
  log(
    "FF-CURRENT-REMAIN-01 current cost version unchanged",
    data?.provenance?.cost?.cost_version_id === fx.vCur,
    `version=${data?.provenance?.cost?.cost_version_id}`
  );
  log(
    "FF-CURRENT-REMAIN-02 current policy version unchanged",
    data?.provenance?.policy?.pricing_policy_version_id === fx.polAV1,
    `version=${data?.provenance?.policy?.pricing_policy_version_id}`
  );
  log(
    "FF-CURRENT-REMAIN-03 identical price",
    !error && approx(data?.effective_price, currentResult?.effective_price),
    `price=${data?.effective_price}`
  );
  return data;
}

async function testHistorical(fx) {
  console.log("\n═══ HISTORICAL REPRODUCIBILITY ═══");
  const { data, error } = await simulate(F.pOrg, fx.supplier, fx.itemA, HIST);
  log("FF-HIST-01 status OK", !error && data?.status === "OK", error?.message || data?.status);
  log(
    "FF-HIST-02 historical cost version resolved",
    data?.provenance?.cost?.cost_version_id === fx.vCur,
    `version=${data?.provenance?.cost?.cost_version_id}`
  );
  log(
    "FF-HIST-03 historical policy version resolved",
    data?.provenance?.policy?.pricing_policy_version_id === fx.polAV1,
    `version=${data?.provenance?.policy?.pricing_policy_version_id}`
  );
  log(
    "FF-HIST-04 price reproducible (106.25)",
    approx(data?.effective_price, 106.25),
    `effective_price=${data?.effective_price}`
  );
}

async function testDeterminism(fx) {
  console.log("\n═══ DETERMINISM ═══");
  const r1 = await simulate(F.pOrg, fx.supplier, fx.itemA, FUT, 0.05);
  const r2 = await simulate(F.pOrg, fx.supplier, fx.itemA, FUT, 0.05);
  const fin = (r) => ({
    base_cost: r.data?.base_cost,
    additional_fixed_total: r.data?.additional_fixed_total,
    additional_percentage_total: r.data?.additional_percentage_total,
    additional_cost_total: r.data?.additional_cost_total,
    total_cost: r.data?.total_cost,
    calculated_price: r.data?.calculated_price,
    rounded_price: r.data?.rounded_price,
    discount_rate: r.data?.discount_rate,
    discount_amount: r.data?.discount_amount,
    effective_price: r.data?.effective_price,
    gross_profit: r.data?.gross_profit,
    margin_rate: r.data?.margin_rate,
    markup_rate: r.data?.markup_rate,
    margin_pct: r.data?.margin_pct,
    markup_pct: r.data?.markup_pct,
    status: r.data?.status,
    violations: r.data?.violations,
    warnings: r.data?.warnings,
  });
  log("FF-DET-01 no errors", !r1.error && !r2.error, r1.error?.message || r2.error?.message || "none");
  log("FF-DET-02 identical financial fields", JSON.stringify(fin(r1)) === JSON.stringify(fin(r2)), JSON.stringify(fin(r1)));
}

async function testCutover(fx) {
  console.log("\n═══ CUTOVER + SIMULATE AGAIN ═══");
  const s1 = await supabase.rpc("fn_sync_cost_version_status", { p_reference_date: FUT });
  const s2 = await supabase.rpc("fn_sync_pricing_policy_version_status", { p_reference_date: FUT });
  log("FF-CUT-01 cost sync idempotent", s1.error === null, s1.error?.message || "ok");
  log("FF-CUT-02 policy sync idempotent", s2.error === null, s2.error?.message || "ok");

  const { data, error } = await simulate(F.pOrg, fx.supplier, fx.itemA, FUT);
  log(
    "FF-CUT-03 future result unchanged after cutover",
    !error && data?.provenance?.cost?.cost_version_id === fx.vFut &&
      data?.provenance?.policy?.pricing_policy_version_id === fx.polAV2 &&
      approx(data?.effective_price, 115 / 0.75),
    `cost=${data?.provenance?.cost?.cost_version_id} price=${data?.effective_price}`
  );

  // Historical pricing must remain reproducible after cutover
  const { data: hist } = await simulate(F.pOrg, fx.supplier, fx.itemA, HIST);
  log(
    "FF-CUT-04 historical still resolves previous versions",
    hist?.provenance?.cost?.cost_version_id === fx.vCur &&
      hist?.provenance?.policy?.pricing_policy_version_id === fx.polAV1,
    `cost=${hist?.provenance?.cost?.cost_version_id} policy=${hist?.provenance?.policy?.pricing_policy_version_id}`
  );
}

async function testMarginVsMarkup(fx) {
  console.log("\n═══ MARGIN != MARKUP (same cost, via RPC) ═══");
  const m = await simulate(F.pOrg, fx.supplier, fx.itemB1, HIST);
  const k = await simulate(F.pOrg, fx.supplier, fx.itemB2, HIST);
  const marginPrice = m.data?.effective_price;
  const markupPrice = k.data?.effective_price;
  log("FF-MM-01 both OK", m.data?.status === "OK" && k.data?.status === "OK", `${m.data?.status} / ${k.data?.status}`);
  log(
    "FF-MM-02 same total_cost",
    approx(m.data?.total_cost, k.data?.total_cost),
    `cost=${m.data?.total_cost} / ${k.data?.total_cost}`
  );
  log(
    "FF-MM-03 margin price = 105/0.8 = 131.25",
    approx(marginPrice, 131.25),
    `price=${marginPrice}`
  );
  log(
    "FF-MM-04 markup price = 105*1.2 = 126.00",
    approx(markupPrice, 126),
    `price=${markupPrice}`
  );
  log(
    "FF-MM-05 prices differ",
    marginPrice !== markupPrice,
    `${marginPrice} vs ${markupPrice}`
  );
}

async function testUnknownCost(fx) {
  console.log("\n═══ UNKNOWN COST != ZERO ═══");
  const { data, error } = await simulate(F.pOrg, fx.supplier, fx.itemNoCost, HIST);
  log(
    "FF-NC-01 PRICE_NOT_CALCULABLE",
    data?.status === "PRICE_NOT_CALCULABLE" || data?.status === "COST_NOT_CONFIRMED",
    `status=${data?.status}`
  );
  log(
    "FF-NC-02 reason COST_NOT_CONFIRMED",
    data?.reason === "COST_NOT_CONFIRMED",
    `reason=${data?.reason}`
  );
  log(
    "FF-NC-03 no zero price fabricated",
    data?.effective_price === null || data?.effective_price === undefined,
    `effective_price=${data?.effective_price}`
  );
  log(
    "FF-NC-04 base_cost null (never 0)",
    data?.base_cost === null,
    `base_cost=${data?.base_cost}`
  );
  void error;
}

async function testConfirmedZero(fx) {
  console.log("\n═══ CONFIRMED ZERO ═══");
  const { data, error } = await simulate(F.pOrg, fx.supplier, fx.itemZero, HIST);
  log("FF-Z-01 simulation proceeds", !error && data?.status === "OK", error?.message || data?.status);
  log(
    "FF-Z-02 base_cost 0 resolved as a CONFIRMED cost (zero is real, not missing)",
    data?.base_cost === 0 && data?.provenance?.cost?.cost_status === "CONFIRMED",
    `base_cost=${data?.base_cost} status=${data?.provenance?.cost?.cost_status}`
  );
  log(
    "FF-Z-03 price from fixed component (0+5)/0.8 = 6.25",
    approx(data?.effective_price, 6.25),
    `effective_price=${data?.effective_price}`
  );
}

async function testViolations(fx) {
  console.log("\n═══ VIOLATION INTEGRATION (authoritative codes) ═══");
  const base = await simulate(F.pOrg, fx.supplier, fx.itemViol, HIST);
  log(
    "FF-V-01 no discount → BELOW_MINIMUM_MARGIN",
    base.data?.status === "VIOLATIONS" && (base.data?.violations || []).includes("BELOW_MINIMUM_MARGIN"),
    JSON.stringify(base.data?.violations)
  );
  const disc = await simulate(F.pOrg, fx.supplier, fx.itemViol, HIST, 0.2);
  log(
    "FF-V-02 discount 20% (max 10%) → DISCOUNT_EXCEEDS_LIMIT",
    (disc.data?.violations || []).includes("DISCOUNT_EXCEEDS_LIMIT"),
    JSON.stringify(disc.data?.violations)
  );
  const below = await simulate(F.pOrg, fx.supplier, fx.itemViol, HIST, 0.9);
  log(
    "FF-V-03 discount 90% → BELOW_COST",
    (below.data?.violations || []).includes("BELOW_COST"),
    JSON.stringify(below.data?.violations)
  );
}

async function testZeroDenominator(fx) {
  console.log("\n═══ ZERO-DENOMINATOR SAFETY ═══");
  const { data, error } = await simulate(F.pOrg, fx.supplier, fx.itemZero2, HIST);
  const json = JSON.stringify(data || {});
  log(
    "FF-ZD-01 no NaN/Infinity in RPC JSON",
    !json.includes("NaN") && !json.includes("Infinity"),
    data?.status || ""
  );
  log(
    "FF-ZD-02 markup null / ZERO_COST_DENOMINATOR communicated",
    data?.markup_rate === null && (data?.warnings || data?.reason || []).includes?.("ZERO_COST_DENOMINATOR"),
    `markup=${data?.markup_rate} reason=${data?.reason}`
  );
  void error;
}

async function testProvenance(fx) {
  console.log("\n═══ PROVENANCE COMPLETENESS ═══");
  const { data } = await simulate(F.pOrg, fx.supplier, fx.itemA, TODAY);
  const prov = data?.provenance || {};
  log(
    "FF-P-01 identity (org/supplier/item/date)",
    prov.organization_id === F.pOrg && prov.supplier_company_id === fx.supplier &&
      prov.catalog_item_id === fx.itemA && prov.reference_date === TODAY,
    `org=${prov.organization_id} date=${prov.reference_date}`
  );
  log(
    "FF-P-02 cost block complete",
    prov.cost?.cost_status && prov.cost?.cost_version_id && prov.cost?.cost_version_number &&
      prov.cost?.cost_valid_from,
    JSON.stringify(prov.cost)
  );
  log(
    "FF-P-03 policy block complete (scope, version, number, method, validity)",
    prov.policy?.scope_type && prov.policy?.pricing_policy_version_id &&
      prov.policy?.policy_version_number && prov.policy?.pricing_method &&
      prov.policy?.policy_valid_from,
    JSON.stringify(prov.policy)
  );
  log(
    "FF-P-04 component breakdown present",
    Array.isArray(data?.components) && data.components.length > 0,
    `components=${data?.components?.length}`
  );
}

async function testAuthorization() {
  console.log("\n═══ BACKEND AUTHORIZATION (RBAC is not just hiding buttons) ═══");
  const { error } = await supabase.rpc("fn_create_pricing_policy", {
    p_organization_id: F.xOrg, // no membership
    p_code: "POL-FF-X-" + Date.now().toString(36),
    p_name: "Cross Tenant",
    p_description: null,
    p_scope_type: "default",
    p_catalog_category_id: null,
    p_catalog_item_id: null,
  });
  log("FF-AUTH-01 policy create for foreign org rejected", error !== null, error?.message || "NOT BLOCKED");

  const sim = await supabase.rpc("fn_simulate_price", {
    p_organization_id: F.xOrg,
    p_supplier_company_id: "b3333333-aaaa-bbbb-cccc-000000000001",
    p_catalog_item_id: "b3333333-0000-0000-0000-000000000002",
    p_reference_date: HIST,
    p_discount_rate: 0,
  });
  log(
    "FF-AUTH-02 simulate for foreign org rejected",
    sim.error !== null || sim.data?.status === "VALIDATION_FAILED",
    sim.error?.message || sim.data?.status
  );

  const sel = await supabase.from("pricing_policies").select("id").eq("organization_id", F.xOrg);
  log(
    "FF-AUTH-03 cross-tenant policy read returns nothing",
    (sel.data?.length || 0) === 0,
    `rows=${sel.data?.length || 0}`
  );
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanupFixtures() {
  console.log("\n═══ CLEANUP ═══");
  let cleaned = 0;
  for (const id of artifacts.draftVersionIds) {
    try {
      const { error } = await supabase.from("pricing_policy_versions").delete().eq("id", id);
      if (!error) cleaned++;
    } catch {
      /* hard-delete guard may block — expected */
    }
  }
  console.log(`  Removed ${cleaned}/${artifacts.draftVersionIds.length} draft versions`);

  // Best-effort removal of isolated catalog items (requires removing mappings first)
  let itemsRemoved = 0;
  for (const mid of artifacts.mappings) {
    try {
      const { error } = await supabase.from("supplier_catalog_items").delete().eq("id", mid);
      if (!error) itemsRemoved++;
    } catch { /* ignore */ }
  }
  for (const iid of artifacts.items) {
    try {
      const { error } = await supabase.from("catalog_items").delete().eq("id", iid);
      if (!error) itemsRemoved++;
    } catch { /* ignore */ }
  }
  console.log(`  Best-effort removed ${itemsRemoved}/${artifacts.items.length + artifacts.mappings.length} mapping/item rows`);
  console.log("  Note: published policy/cost artifacts remain in the dedicated test org; pricing_engine_test_setup.sql resets them (test-only helper).");
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  PRC-04E: PRICING FULL-FLOW REMOTE E2E TESTS          ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  try {
    await authenticate();
    const fx = await bootstrap();
    const current = await testCurrentDate(fx);
    await testFutureDate(fx);
    await testCurrentRemainsCurrent(fx, current);
    await testHistorical(fx);
    await testDeterminism(fx);
    await testCutover(fx);
    await testMarginVsMarkup(fx);
    await testUnknownCost(fx);
    await testConfirmedZero(fx);
    await testViolations(fx);
    await testZeroDenominator(fx);
    await testProvenance(fx);
    await testAuthorization();
  } catch (e) {
    console.error("\n💀 FATAL:", e.message);
    process.exit(1);
  }

  await cleanupFixtures();

  console.log("\n═══ SUMMARY ═══");
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  if (failures.length > 0) console.log("  Failures:", failures.join(", "));
  console.log(failed === 0 ? "\n  ✅ ALL TESTS PASSED" : "\n  ❌ SOME TESTS FAILED");
  process.exit(failed > 0 ? 1 : 0);
}

main();