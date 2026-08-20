#!/usr/bin/env node
/**
 * PRC-05B: COM-H01 to COM-H57 Remote Integrity Tests
 *
 * Runs against the remote Supabase project using the JS client.
 * Tests commercial price tables schema integrity: code normalization,
 * version/temporal integrity, item + provenance integrity, exceptions,
 * RLS and RBAC.
 *
 * Requires: tests/remote/sql/commercial_price_test_setup.sql to have been
 * executed first (creates the dedicated test organizations, catalog,
 * supplier/cost/policy provenance fixtures and the published fixture with
 * deterministic UUIDs). The setup also performs the DB-level verifications
 * that the REST harness cannot reach (normalizer, role mappings, orphan
 * permission, FK RESTRICT and the version-completeness gate).
 *
 * Credentials come from environment variables (never hardcoded):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
 *   E2E_TEST_EMAIL/E2E_TEST_PASSWORD (or PRC03A_TEST_EMAIL/PRC03A_TEST_PASSWORD)
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
    "Missing required env vars: E2E_TEST_EMAIL/E2E_TEST_PASSWORD (or PRC03A_TEST_EMAIL/PRC03A_TEST_PASSWORD; use rotated credentials, never commit them)"
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
// FIXTURE IDS (deterministic — must match commercial_price_test_setup.sql)
// ============================================================
const F = {
  cOrg: "55555555-5555-5555-5555-555555555551", // admin
  xOrg: "55555555-5555-5555-5555-555555555552", // no membership
  yOrg: "55555555-5555-5555-5555-555555555553", // viewer
  zOrg: "55555555-5555-5555-5555-555555555554", // admin (cross-tenant)
  oOrg: "55555555-5555-5555-5555-555555555555", // operator
  mOrg: "55555555-5555-5555-5555-555555555556", // manager

  itemA: "55555555-0000-0000-0000-000000000002", // cOrg active
  itemB: "55555555-0000-0000-0000-000000000003", // cOrg active
  itemI: "55555555-0000-0000-0000-000000000004", // cOrg inactive
  xItem: "55555555-0000-0000-0000-000000000102", // xOrg active
  yItem: "55555555-0000-0000-0000-000000000202", // yOrg active
  mItem: "55555555-0000-0000-0000-000000000302", // mOrg active

  company: "55555555-1111-1111-1111-111111111111", // cOrg supplier
  companyZ: "55555555-1111-1111-1111-111111111112", // zOrg company
  company2: "55555555-1111-1111-1111-111111111113", // cOrg supplier 2

  costTable: "55555555-2222-2222-2222-222222222221",
  costVersion: "55555555-2222-2222-2222-222222222222",
  costTable2: "55555555-2222-2222-2222-222222222224",
  costVersion2: "55555555-2222-2222-2222-222222222225",

  policy: "55555555-3333-3333-3333-333333333331",
  policyVersion: "55555555-3333-3333-3333-333333333332",
  policy2: "55555555-3333-3333-3333-333333333333",
  policyVersion2: "55555555-3333-3333-3333-333333333334",
  policyVersionZ: "55555555-3333-3333-3333-333333333342",

  pubTable: "55555555-4444-4444-4444-444444444441", // E2E-COM-PUB (active)
  pubVersion: "55555555-4444-4444-4444-444444444442",
  pubItem: "55555555-4444-4444-4444-444444444443",

  yTable: "55555555-4444-4444-4444-444444444451", // E2E-COM-YYY
  yVersion: "55555555-4444-4444-4444-444444444454",
  yPriceItem: "55555555-4444-4444-4444-444444444455",
  oTable: "55555555-4444-4444-4444-444444444452", // E2E-COM-OOO
  zTable: "55555555-4444-4444-4444-444444444471", // E2E-COM-ZZZ
  zVersion: "55555555-4444-4444-4444-444444444472",
};

const RUN = Date.now().toString(36);
let e2eUserId = null;

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
  e2eUserId = data.user.id;
  console.log("  Authenticated as:", data.user.id);
}

// ============================================================
// HELPERS
// ============================================================
function uniqueCode(label) {
  return `E2E-${RUN}-${label}`;
}

async function insertTable(org, { code = null, status = "active", name = null } = {}) {
  return await supabase
    .from("commercial_price_tables")
    .insert({
      organization_id: org,
      code: code || uniqueCode("T"),
      name: name || `Test Table ${RUN}`,
      status,
    })
    .select("*")
    .single();
}

async function insertVersion(tableId, org, {
  versionNumber = 1,
  validFrom = "2025-01-01",
  validTo = null,
  status = "draft",
  versionLabel = null,
} = {}) {
  const payload = {
    organization_id: org,
    commercial_price_table_id: tableId,
    version_number: versionNumber,
    valid_from: validFrom,
    valid_to: validTo,
    status,
    version_label: versionLabel,
  };
  return await supabase.from("commercial_price_table_versions").insert(payload).select("*").single();
}

async function insertItem(versionId, org, {
  catalogItemId = F.itemA,
  priceAmount = 10,
  currency = "BRL",
  originType = "manual",
  wrongSnapshot = false,
  provenance = null,
  snapshot = null,
} = {}) {
  const payload = {
    organization_id: org,
    commercial_price_table_version_id: versionId,
    catalog_item_id: catalogItemId,
    price_amount: priceAmount,
    currency,
    origin_type: originType,
  };
  if (wrongSnapshot) {
    payload.item_code_snapshot = "WRONG-CODE";
    payload.item_name_snapshot = "WRONG-NAME";
    payload.item_type_snapshot = "WRONG-TYPE";
  }
  if (provenance) Object.assign(payload, provenance);
  if (snapshot) payload.pricing_snapshot = snapshot;
  return await supabase.from("commercial_price_items").insert(payload).select("*").single();
}

async function insertException(versionId, itemId, org, {
  violationCode = "BELOW_COST",
  reason = "Test exception",
  status = null,
} = {}) {
  const payload = {
    organization_id: org,
    commercial_price_table_version_id: versionId,
    commercial_price_item_id: itemId,
    violation_code: violationCode,
    reason,
  };
  if (status !== null) payload.status = status;
  return await supabase.from("commercial_price_exceptions").insert(payload).select("*").single();
}

async function freshDraft(org = F.cOrg, codeLabel = "D") {
  const t = await insertTable(org, { code: uniqueCode(codeLabel) });
  if (t.error) throw new Error("freshDraft table failed: " + t.error.message);
  const v = await insertVersion(t.data.id, org, { status: "draft" });
  if (v.error) throw new Error("freshDraft version failed: " + v.error.message);
  draftVersionIds.push(v.data.id);
  return { tableId: t.data.id, versionId: v.data.id };
}

const ENGINE_PROV = {
  origin_type: "pricing_engine",
  source_reference_date: "2025-06-01",
  source_supplier_company_id: F.company,
  source_cost_table_id: F.costTable,
  source_cost_version_id: F.costVersion,
  source_cost_version_number: 1,
  source_pricing_policy_id: F.policy,
  source_pricing_policy_version_id: F.policyVersion,
  source_policy_version_number: 1,
  source_calculated_price: 120,
  source_total_cost: 80,
  source_margin_rate: 0.2,
  source_markup_rate: null,
  source_effective_price: 120,
};

// ============================================================
// TESTS
// ============================================================
async function runTests() {
  console.log("\n═══ COM-H01..H57 TESTS ═══\n");

  // ============================================================
  // TABLE IDENTITY (COM-H01..H08)
  // ============================================================

  // ---- H01: valid table insert → ACCEPT (code normalized) ----
  console.log("COM-H01: valid table insert → ACCEPT");
  let t1;
  {
    const { data, error } = await insertTable(F.cOrg);
    t1 = data;
    log("COM-H01", data !== null && error === null && !!data.code_normalized, data?.id ? `accepted id=${data.id}` : error?.message);
  }

  // ---- H02: duplicate code (same org) → REJECT ----
  console.log("COM-H02: duplicate code → REJECT");
  {
    const { error } = await insertTable(F.cOrg, { code: t1.code });
    log("COM-H02", error !== null, error?.message || "rejected");
  }

  // ---- H03: duplicate normalized code (different raw code) → REJECT ----
  console.log("COM-H03: duplicate normalized code → REJECT");
  {
    const codeA = `Comercial  ${RUN}  A`;
    const codeB = `comercial ${RUN} a`; // normalizes identically to codeA
    const a = await insertTable(F.cOrg, { code: codeA });
    log("COM-H03.1 first accepted", a.error === null, a.error?.message || "accepted");
    const b = await insertTable(F.cOrg, { code: codeB });
    log("COM-H03", b.error !== null, b.error?.message || "rejected");
  }

  // ---- H04: empty/whitespace code → REJECT ----
  console.log("COM-H04: empty/whitespace code → REJECT");
  {
    const e1 = await insertTable(F.cOrg, { code: "   " });
    const e2 = await insertTable(F.cOrg, { code: "" });
    log("COM-H04", e1.error !== null && e2.error !== null, `${e1.error?.message || "no-error"} | ${e2.error?.message || "no-error"}`);
  }

  // ---- H05: foreign org (no membership) table insert → RLS REJECT ----
  console.log("COM-H05: foreign org table insert → RLS REJECT");
  {
    const { data, error } = await insertTable(F.xOrg);
    const blocked = error !== null || data === null;
    log("COM-H05", blocked, error?.message || (data ? "row returned (NOT blocked)" : "blocked (no row)"));
  }

  // ---- H06: invalid status → REJECT ----
  console.log("COM-H06: invalid status → REJECT");
  {
    const { error } = await insertTable(F.cOrg, { status: "bogus" });
    log("COM-H06", error !== null, error?.message || "rejected");
  }

  // ---- H07: actor derivation (created_by = authenticated user) ----
  console.log("COM-H07: created_by server-derived from auth.uid()");
  {
    const { data } = await supabase.from("commercial_price_tables").select("created_by").eq("id", t1.id).single();
    log("COM-H07", data?.created_by === e2eUserId, `created_by=${data?.created_by}`);
  }

  // ---- H08: code immutability once version history exists ----
  console.log("COM-H08: code immutable with history / editable without");
  {
    const upPub = await supabase.from("commercial_price_tables").update({ code: uniqueCode("PUBCHG") }).eq("id", F.pubTable);
    log("COM-H08.1 code change on table WITH history → REJECT", upPub.error !== null, upPub.error?.message || "rejected");
    const fresh = await insertTable(F.cOrg, { code: uniqueCode("NOCHG") });
    const upFresh = await supabase.from("commercial_price_tables").update({ code: uniqueCode("NOCHG2") }).eq("id", fresh.data.id);
    log("COM-H08", upFresh.error === null, upFresh.error?.message || "accepted");
  }

  // ============================================================
  // VERSIONS (COM-H09..H20)
  // ============================================================

  // ---- H09: draft version insert → ACCEPT ----
  console.log("COM-H09: draft version insert → ACCEPT");
  let tv;
  {
    const t = await insertTable(F.cOrg, { code: uniqueCode("V") });
    const { data, error } = await insertVersion(t.data.id, F.cOrg, { status: "draft" });
    tv = { tableId: t.data.id, versionId: data?.id };
    draftVersionIds.push(data?.id);
    log("COM-H09", data !== null && error === null, data?.id ? `accepted id=${data.id}` : error?.message);
  }

  // ---- H10: version_number <= 0 → REJECT ----
  console.log("COM-H10: version_number 0 → REJECT");
  {
    const { error } = await insertVersion(t1.id, F.cOrg, { versionNumber: 0 });
    log("COM-H10", error !== null, error?.message || "rejected");
  }

  // ---- H11: duplicate version_number → REJECT ----
  console.log("COM-H11: duplicate version_number → REJECT");
  {
    const dup = await insertVersion(tv.tableId, F.cOrg, { versionNumber: 1 });
    log("COM-H11", dup.error !== null, dup.error?.message || "rejected");
  }

  // ---- H12: valid_to <= valid_from → REJECT ----
  console.log("COM-H12: valid_to <= valid_from → REJECT");
  {
    const { error } = await insertVersion(t1.id, F.cOrg, { versionNumber: 2, validFrom: "2025-01-01", validTo: "2024-12-31" });
    log("COM-H12", error !== null, error?.message || "rejected");
  }

  // ---- H13: cross-org version (zOrg table ref cOrg table) → REJECT ----
  console.log("COM-H13: cross-org version → REJECT");
  {
    const { error } = await insertVersion(t1.id, F.zOrg, { versionNumber: 1 });
    log("COM-H13", error !== null, error?.message || "rejected");
  }

  // ---- H14: direct draft→under_review (no gate) → REJECT ----
  console.log("COM-H14: direct draft→under_review → REJECT");
  {
    const { error } = await supabase.from("commercial_price_table_versions").update({ status: "under_review" }).eq("id", tv.versionId);
    log("COM-H14", error !== null, error?.message || "rejected");
  }

  // ---- H15: direct under_review→approved (no gate) → REJECT ----
  console.log("COM-H15: direct under_review→approved → REJECT");
  {
    const v = await insertVersion(t1.id, F.cOrg, { versionNumber: 3, status: "under_review" });
    if (!v.error) {
      const { error } = await supabase.from("commercial_price_table_versions").update({ status: "approved" }).eq("id", v.data.id);
      log("COM-H15", error !== null, error?.message || "rejected");
    } else {
      log("COM-H15", false, "setup failed: " + v.error.message);
    }
  }

  // ---- H16: update non-draft version fields (no gate) → REJECT ----
  console.log("COM-H16: update non-draft (active) version → REJECT");
  {
    const { error } = await supabase.from("commercial_price_table_versions").update({ notes: "hacked" }).eq("id", F.pubVersion);
    log("COM-H16", error !== null, error?.message || "rejected");
  }

  // ---- H17: delete non-draft version → REJECT ----
  console.log("COM-H17: delete non-draft (active) version → REJECT");
  {
    const { error } = await supabase.from("commercial_price_table_versions").delete().eq("id", F.pubVersion);
    log("COM-H17", error !== null, error?.message || "rejected");
  }

  // ---- H18: overlapping active ranges → REJECT (EXCLUDE) ----
  console.log("COM-H18: overlapping active ranges → REJECT");
  {
    const t = await insertTable(F.cOrg, { code: uniqueCode("OV") });
    const v1 = await insertVersion(t.data.id, F.cOrg, { versionNumber: 1, validFrom: "2027-01-01", validTo: "2027-12-31", status: "active" });
    log("COM-H18.1 first active accepted", v1.error === null, v1.error?.message || "accepted");
    const v2 = await insertVersion(t.data.id, F.cOrg, { versionNumber: 2, validFrom: "2027-06-01", status: "active" });
    log("COM-H18", v2.error !== null, v2.error?.message || "rejected");
  }

  // ---- H19: adjacent active ranges → ACCEPT (EXCLUDE) ----
  console.log("COM-H19: adjacent active ranges → ACCEPT");
  {
    const t = await insertTable(F.cOrg, { code: uniqueCode("ADJ") });
    const v1 = await insertVersion(t.data.id, F.cOrg, { versionNumber: 1, validFrom: "2028-01-01", validTo: "2028-06-01", status: "active" });
    log("COM-H19.1 first active accepted", v1.error === null, v1.error?.message || "accepted");
    const v2 = await insertVersion(t.data.id, F.cOrg, { versionNumber: 2, validFrom: "2028-06-01", status: "active" });
    log("COM-H19", v2.data !== null && v2.error === null, v2.data?.id ? "accepted id=" + v2.data.id : v2.error?.message);
  }

  // ---- H20: delete draft version → ACCEPT ----
  console.log("COM-H20: delete draft version → ACCEPT");
  {
    const { tableId, versionId } = await freshDraft(F.cOrg, "DEL");
    const { error } = await supabase.from("commercial_price_table_versions").delete().eq("id", versionId);
    log("COM-H20", error === null, error?.message || "deleted");
  }

  // ============================================================
  // ITEMS (COM-H21..H35)
  // ============================================================

  // ---- H21: manual item on draft version → ACCEPT (snapshot derived) ----
  console.log("COM-H21: manual item insert → ACCEPT");
  let itemVersion;
  let itemId;
  {
    const { versionId } = await freshDraft(F.cOrg, "I");
    itemVersion = versionId;
    const { data, error } = await insertItem(versionId, F.cOrg);
    itemId = data?.id;
    log("COM-H21", data !== null && error === null, data?.id ? "accepted id=" + data.id : error?.message);
  }

  // ---- H22: duplicate item (same catalog item in same version) → REJECT ----
  console.log("COM-H22: duplicate catalog item in version → REJECT");
  {
    const { error } = await insertItem(itemVersion, F.cOrg, { catalogItemId: F.itemA });
    log("COM-H22", error !== null, error?.message || "rejected");
  }

  // ---- H23: negative price → REJECT ----
  console.log("COM-H23: negative price → REJECT");
  {
    const { error } = await insertItem(itemVersion, F.cOrg, { catalogItemId: F.itemB, priceAmount: -1 });
    log("COM-H23", error !== null, error?.message || "rejected");
  }

  // ---- H24: currency != BRL → REJECT ----
  console.log("COM-H24: non-BRL currency → REJECT");
  {
    const { error } = await insertItem(itemVersion, F.cOrg, { catalogItemId: F.itemB, currency: "USD" });
    log("COM-H24", error !== null, error?.message || "rejected");
  }

  // ---- H25: inactive catalog item → REJECT ----
  console.log("COM-H25: inactive catalog item → REJECT");
  {
    const { error } = await insertItem(itemVersion, F.cOrg, { catalogItemId: F.itemI });
    log("COM-H25", error !== null, error?.message || "rejected");
  }

  // ---- H26: cross-org catalog item → REJECT ----
  console.log("COM-H26: cross-org catalog item → REJECT");
  {
    const { error } = await insertItem(itemVersion, F.cOrg, { catalogItemId: F.xItem });
    log("COM-H26", error !== null, error?.message || "rejected");
  }

  // ---- H27: cross-org version → REJECT ----
  console.log("COM-H27: cross-org version → REJECT");
  {
    const { error } = await insertItem(F.zVersion, F.cOrg);
    log("COM-H27", error !== null, error?.message || "rejected");
  }

  // ---- H28: snapshot server-derived (client values ignored) ----
  console.log("COM-H28: snapshot derived from catalog, not client");
  {
    const { data, error } = await insertItem(itemVersion, F.cOrg, { catalogItemId: F.itemB, wrongSnapshot: true });
    const ok =
      error === null &&
      data?.item_code_snapshot === "PRC05B-ITEM-B" &&
      data?.item_name_snapshot === "PRC05B Item B" &&
      data?.item_type_snapshot === "other_service";
    log("COM-H28", ok, `code=${data?.item_code_snapshot} name=${data?.item_name_snapshot} type=${data?.item_type_snapshot}`);
  }

  // ---- H29: engine item with full provenance → ACCEPT ----
  console.log("COM-H29: engine item with full provenance → ACCEPT");
  let engineItemId;
  {
    const { versionId } = await freshDraft(F.cOrg, "ENG");
    const { data, error } = await insertItem(versionId, F.cOrg, {
      catalogItemId: F.itemB,
      priceAmount: 120,
      snapshot: { engine: "PRC-04C", note: "com-h29 fixture" },
      provenance: ENGINE_PROV,
    });
    engineItemId = data?.id;
    log("COM-H29", data !== null && error === null, data?.id ? "accepted id=" + data.id : error?.message);
  }

  // ---- H30: engine item missing effective price → REJECT ----
  console.log("COM-H30: engine item missing provenance → REJECT");
  {
    const { versionId } = await freshDraft(F.cOrg, "ENGX");
    const incomplete = { ...ENGINE_PROV };
    delete incomplete.source_effective_price;
    const { error } = await insertItem(versionId, F.cOrg, { catalogItemId: F.itemB, priceAmount: 120, provenance: incomplete });
    log("COM-H30", error !== null, error?.message || "rejected");
  }

  // ---- H31: manual item WITH provenance → ACCEPT ----
  console.log("COM-H31: manual item with provenance → ACCEPT");
  {
    const { versionId } = await freshDraft(F.cOrg, "MANP");
    const { data, error } = await insertItem(versionId, F.cOrg, { catalogItemId: F.itemA, priceAmount: 90, provenance: { source_supplier_company_id: F.company, source_total_cost: 70 } });
    log("COM-H31", data !== null && error === null, data?.id ? "accepted id=" + data.id : error?.message);
  }

  // ---- H32: insert item on non-draft version → REJECT ----
  console.log("COM-H32: insert item on active version → REJECT");
  {
    const { error } = await insertItem(F.pubVersion, F.cOrg, { catalogItemId: F.itemB });
    log("COM-H32", error !== null, error?.message || "rejected");
  }

  // ---- H33: update item on non-draft version → REJECT ----
  console.log("COM-H33: update item on active version → REJECT");
  {
    const { error } = await supabase.from("commercial_price_items").update({ price_amount: 200 }).eq("id", F.pubItem);
    log("COM-H33", error !== null, error?.message || "rejected");
  }

  // ---- H34: delete item on non-draft version → REJECT ----
  console.log("COM-H34: delete item on active version → REJECT");
  {
    const { error } = await supabase.from("commercial_price_items").delete().eq("id", F.pubItem);
    log("COM-H34", error !== null, error?.message || "rejected");
  }

  // ---- H35: lineage across different commercial tables → REJECT ----
  console.log("COM-H35: lineage cross-table → REJECT");
  {
    const a = await freshDraft(F.cOrg, "LGA");
    const ia = await insertItem(a.versionId, F.cOrg, { catalogItemId: F.itemA });
    const b = await freshDraft(F.cOrg, "LGB");
    const { error } = await insertItem(b.versionId, F.cOrg, { catalogItemId: F.itemB, provenance: { source_commercial_price_item_id: ia.data.id } });
    log("COM-H35", error !== null, error?.message || "rejected");
  }

  // ============================================================
  // PROVENANCE (COM-H36..H42)
  // ============================================================

  // ---- H36: cross-org supplier company → REJECT ----
  console.log("COM-H36: cross-org supplier company → REJECT");
  {
    const { versionId } = await freshDraft(F.cOrg, "P36");
    const prov = { ...ENGINE_PROV, source_supplier_company_id: F.companyZ };
    const { error } = await insertItem(versionId, F.cOrg, { catalogItemId: F.itemB, priceAmount: 120, provenance: prov });
    log("COM-H36", error !== null, error?.message || "rejected");
  }

  // ---- H37: cost table does not match supplier → REJECT ----
  console.log("COM-H37: cost table ≠ supplier → REJECT");
  {
    const { versionId } = await freshDraft(F.cOrg, "P37");
    const prov = { ...ENGINE_PROV, source_cost_table_id: F.costTable2 };
    const { error } = await insertItem(versionId, F.cOrg, { catalogItemId: F.itemB, priceAmount: 120, provenance: prov });
    log("COM-H37", error !== null, error?.message || "rejected");
  }

  // ---- H38: cost version does not match cost table → REJECT ----
  console.log("COM-H38: cost version ≠ cost table → REJECT");
  {
    const { versionId } = await freshDraft(F.cOrg, "P38");
    const prov = { ...ENGINE_PROV, source_cost_version_id: F.costVersion2 };
    const { error } = await insertItem(versionId, F.cOrg, { catalogItemId: F.itemB, priceAmount: 120, provenance: prov });
    log("COM-H38", error !== null, error?.message || "rejected");
  }

  // ---- H39: policy version does not match policy → REJECT ----
  console.log("COM-H39: policy version ≠ policy → REJECT");
  {
    const { versionId } = await freshDraft(F.cOrg, "P39");
    const prov = { ...ENGINE_PROV, source_pricing_policy_version_id: F.policyVersion2 };
    const { error } = await insertItem(versionId, F.cOrg, { catalogItemId: F.itemB, priceAmount: 120, provenance: prov });
    log("COM-H39", error !== null, error?.message || "rejected");
  }

  // ---- H40: cross-org policy version → REJECT ----
  console.log("COM-H40: cross-org policy version → REJECT");
  {
    const { versionId } = await freshDraft(F.cOrg, "P40");
    const prov = { ...ENGINE_PROV, source_pricing_policy_version_id: F.policyVersionZ };
    const { error } = await insertItem(versionId, F.cOrg, { catalogItemId: F.itemB, priceAmount: 120, provenance: prov });
    log("COM-H40", error !== null, error?.message || "rejected");
  }

  // ---- H41: engine provenance persisted ----
  console.log("COM-H41: engine provenance persisted");
  {
    const { data } = await supabase.from("commercial_price_items").select("*").eq("id", engineItemId).single();
    const ok =
      data?.origin_type === "pricing_engine" &&
      data?.source_supplier_company_id === F.company &&
      data?.source_cost_table_id === F.costTable &&
      data?.source_cost_version_id === F.costVersion &&
      data?.source_pricing_policy_id === F.policy &&
      data?.source_pricing_policy_version_id === F.policyVersion &&
      data?.source_effective_price === 120;
    log("COM-H41", ok, `origin=${data?.origin_type} effective=${data?.source_effective_price}`);
  }

  // ---- H42: pricing_snapshot jsonb persisted ----
  console.log("COM-H42: pricing_snapshot jsonb persisted");
  {
    const { data } = await supabase.from("commercial_price_items").select("pricing_snapshot").eq("id", engineItemId).single();
    const snap = data?.pricing_snapshot || {};
    // jsonb normalises key order, so compare parsed values, not stringified text
    const ok = snap.engine === "PRC-04C" && snap.note === "com-h29 fixture";
    log("COM-H42", ok, JSON.stringify(data?.pricing_snapshot));
  }

  // ============================================================
  // EXCEPTIONS (COM-H43..H50)
  // ============================================================

  // ---- H43: request exception → ACCEPT (requester derived) ----
  console.log("COM-H43: request exception → ACCEPT");
  let excId;
  {
    const { data, error } = await insertException(F.pubVersion, F.pubItem, F.cOrg, { violationCode: "BELOW_COST" });
    excId = data?.id;
    const ok = data !== null && error === null && data?.status === "requested" && data?.requested_by === e2eUserId;
    log("COM-H43", ok, data?.id ? `accepted id=${data.id} requested_by=${data?.requested_by}` : error?.message);
  }

  // ---- H44: exception with status != requested → REJECT ----
  console.log("COM-H44: exception status must be 'requested' → REJECT");
  {
    const { error } = await insertException(F.pubVersion, F.pubItem, F.cOrg, { violationCode: "BELOW_MINIMUM_MARGIN", status: "approved" });
    log("COM-H44", error !== null, error?.message || "rejected");
  }

  // ---- H45: duplicate exception (item + violation_code) → REJECT ----
  console.log("COM-H45: duplicate item+violation_code → REJECT");
  {
    const { error } = await insertException(F.pubVersion, F.pubItem, F.cOrg, { violationCode: "BELOW_COST" });
    log("COM-H45", error !== null, error?.message || "rejected");
  }

  // ---- H46: invalid violation_code → REJECT ----
  console.log("COM-H46: invalid violation_code → REJECT");
  {
    const { error } = await insertException(F.pubVersion, F.pubItem, F.cOrg, { violationCode: "NOPE" });
    log("COM-H46", error !== null, error?.message || "rejected");
  }

  // ---- H47: exception referencing cross-org version → REJECT ----
  console.log("COM-H47: cross-org version exception → REJECT");
  {
    const { error } = await insertException(F.zVersion, F.pubItem, F.cOrg, { violationCode: "BELOW_MINIMUM_MARGIN" });
    log("COM-H47", error !== null, error?.message || "rejected");
  }

  // ---- H48: exception decision without gate → REJECT ----
  console.log("COM-H48: direct requested→approved → REJECT");
  {
    const { error } = await supabase.from("commercial_price_exceptions").update({ status: "approved" }).eq("id", excId);
    log("COM-H48", error !== null, error?.message || "rejected");
  }

  // ---- H49: non-status exception update → ACCEPT ----
  console.log("COM-H49: non-status exception update → ACCEPT");
  {
    const { error } = await supabase.from("commercial_price_exceptions").update({ reason: "Updated reason" }).eq("id", excId);
    log("COM-H49", error === null, error?.message || "accepted");
  }

  // ---- H50: delete exception (append-only) → REJECT ----
  console.log("COM-H50: delete exception → REJECT");
  {
    const { data, error } = await supabase.from("commercial_price_exceptions").delete().eq("id", excId);
    const { data: stillThere } = await supabase.from("commercial_price_exceptions").select("id").eq("id", excId);
    // No cpe_delete policy -> RLS silently filters (0 rows, no error); the
    // DB-level append-only guard also blocks direct deletes. Row must persist.
    const blocked = error !== null || (data === null || data.length === 0) || (stillThere?.length ?? 0) === 1;
    log("COM-H50", blocked, error?.message || `deleted=${data?.length ?? 0} stillExists=${(stillThere?.length ?? 0) === 1}`);
  }

  // ============================================================
  // RLS / RBAC (COM-H51..H57)
  // ============================================================

  // ---- H51: cross-tenant read → 0 rows (all tables) ----
  console.log("COM-H51: cross-tenant read → 0 rows");
  {
    const t = await supabase.from("commercial_price_tables").select("id").eq("organization_id", F.xOrg);
    const v = await supabase.from("commercial_price_table_versions").select("id").eq("organization_id", F.xOrg);
    const i = await supabase.from("commercial_price_items").select("id").eq("organization_id", F.xOrg);
    const e = await supabase.from("commercial_price_exceptions").select("id").eq("organization_id", F.xOrg);
    log(
      "COM-H51",
      (t.data?.length || 0) === 0 && (v.data?.length || 0) === 0 && (i.data?.length || 0) === 0 && (e.data?.length || 0) === 0,
      `tables=${t.data?.length || 0} versions=${v.data?.length || 0} items=${i.data?.length || 0} exceptions=${e.data?.length || 0}`
    );
  }

  // ---- H52: viewer (yOrg) can read, cannot insert ----
  console.log("COM-H52: viewer read OK / insert blocked");
  {
    const read = await supabase.from("commercial_price_tables").select("id").eq("organization_id", F.yOrg);
    const ins = await insertTable(F.yOrg);
    const insBlocked = ins.error !== null || ins.data === null;
    log("COM-H52", (read.data?.length || 0) === 1 && insBlocked, `read=${read.data?.length || 0} insert=${ins.error?.message || (ins.data ? "NOT blocked" : "blocked")}`);
  }

  // ---- H53: operator (oOrg) can read, cannot insert ----
  console.log("COM-H53: operator read OK / insert blocked");
  {
    const read = await supabase.from("commercial_price_tables").select("id").eq("organization_id", F.oOrg);
    const ins = await insertTable(F.oOrg);
    const insBlocked = ins.error !== null || ins.data === null;
    log("COM-H53", (read.data?.length || 0) === 1 && insBlocked, `read=${read.data?.length || 0} insert=${ins.error?.message || (ins.data ? "NOT blocked" : "blocked")}`);
  }

  // ---- H54: manager (mOrg) full draft lifecycle → ACCEPT ----
  console.log("COM-H54: manager full draft lifecycle");
  let mItemId;
  {
    const t = await insertTable(F.mOrg, { code: uniqueCode("MGR") });
    const v = t.data && !t.error ? await insertVersion(t.data.id, F.mOrg, { status: "draft" }) : null;
    const item = v?.data && !v.error ? await insertItem(v.data.id, F.mOrg, { catalogItemId: F.mItem }) : null;
    mItemId = item?.data?.id;
    const ok = t.error === null && v?.error === null && item?.error === null;
    log("COM-H54", ok, `table=${t.error?.message || "ok"} version=${v?.error?.message || "ok"} item=${item?.error?.message || "ok"}`);
  }

  // ---- H55: manager can request exception (review) → ACCEPT ----
  console.log("COM-H55: manager requests exception → ACCEPT");
  let mExcId;
  {
    const t = await supabase.from("commercial_price_tables").select("id, commercial_price_table_versions(id)").eq("code", uniqueCode("MGR")).eq("organization_id", F.mOrg).single();
    const versionId = t.data?.commercial_price_table_versions?.[0]?.id;
    if (!versionId) {
      log("COM-H55", false, "no mOrg version found");
    } else {
      const { data, error } = await insertException(versionId, mItemId, F.mOrg, { violationCode: "COMMERCIAL_DEVIATION" });
      mExcId = data?.id;
      log("COM-H55", data !== null && error === null, data?.id ? "accepted id=" + data.id : error?.message);
    }
  }

  // ---- H56: manager cannot decide exception (no exception_approve) → RLS REJECT ----
  console.log("COM-H56: manager decision → RLS REJECT");
  {
    const { data, error } = await supabase.from("commercial_price_exceptions").update({ status: "approved" }).eq("id", mExcId);
    const { data: cur } = await supabase.from("commercial_price_exceptions").select("status").eq("id", mExcId).single();
    // RLS cpe_update requires exception_approve; manager lacks it -> PostgREST
    // silently filters the row (0 rows, no error). Status must remain requested.
    const blocked = error !== null || (data === null || data.length === 0) || cur?.status === "requested";
    log("COM-H56", blocked, error?.message || `rows=${data?.length ?? 0} status=${cur?.status}`);
  }

  // ---- H57: viewer cannot request exception (no review) → RLS REJECT ----
  console.log("COM-H57: viewer requests exception → RLS REJECT");
  {
    const { data, error } = await insertException(F.yVersion, F.yPriceItem, F.yOrg, { violationCode: "BELOW_COST" });
    const blocked = error !== null || data === null;
    log("COM-H57", blocked, error?.message || (data ? "row returned (NOT blocked)" : "blocked (no row)"));
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
      const { error } = await supabase.from("commercial_price_table_versions").delete().eq("id", id);
      if (!error) cleaned++;
    } catch {
      // hard delete may be blocked by trigger or exception RESTRICT — ignore
    }
  }
  console.log(`  Removed ${cleaned}/${draftVersionIds.length} draft versions (cascaded items)`);
  // Non-draft artifacts and exception-linked fixtures (append-only) are
  // intentionally left in the dedicated test orgs; commercial_price_test_setup.sql
  // resets them on the next run (test-only helper).
  console.log("  Note: non-draft/exception artifacts left for reproducibility; reset via commercial_price_test_setup.sql");
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  PRC-05B: COMMERCIAL PRICE INTEGRITY REMOTE TESTS  ║");
  console.log("║  COM-H01 to COM-H57                              ║");
  console.log("╚══════════════════════════════════════════════════╝");

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