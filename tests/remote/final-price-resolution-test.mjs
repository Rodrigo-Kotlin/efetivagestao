#!/usr/bin/env node
/**
 * PRC-07B authoritative final-price resolver suite (FPR-H01..FPR-H40).
 *
 * The isolated runner applies client_pricing_test_setup.sql followed by
 * final_price_resolution_test_setup.sql before this read-only suite.
 */

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || process.env.PRC03A_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || process.env.PRC03A_TEST_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_EMAIL || !TEST_PASSWORD) {
  console.error(
    "Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and E2E_TEST_EMAIL/E2E_TEST_PASSWORD"
  );
  process.exit(1);
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
const memberClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);

const EXPECTED_CASES = 40;
const EXPECTED_ASSERTIONS = 203;
const CANONICAL_KEYS = [
  "catalog_item_id",
  "client_company_id",
  "client_profile_status",
  "currency",
  "organization_id",
  "price_amount",
  "reason_code",
  "reference_date",
  "source",
  "source_refs",
  "status",
  "trace",
].sort();

const F = {
  mainOrg: "66666666-6666-6666-6666-666666666661",
  crossOrg: "66666666-6666-6666-6666-666666666662",
  managerOrg: "66666666-6666-6666-6666-666666666663",
  operatorOrg: "66666666-6666-6666-6666-666666666664",
  viewerOrg: "66666666-6666-6666-6666-666666666665",
  foreignOrg: "66666666-6666-6666-6666-666666666666",
  clientOnlyOrg: "77777777-7777-7777-7777-777777777761",
  commercialOnlyOrg: "77777777-7777-7777-7777-777777777762",
  bothOrg: "77777777-7777-7777-7777-777777777763",

  itemA: "66666666-1000-0000-0000-000000000001",
  itemB: "66666666-1000-0000-0000-000000000002",
  workflowItem: "66666666-1000-0000-0000-000000000011",
  zeroItem: "66666666-1000-0000-0000-000000000012",
  missingPriceItem: "66666666-1000-0000-0000-000000000013",
  managerItem: "66666666-1000-0000-0000-000000000005",
  operatorItem: "66666666-1000-0000-0000-000000000006",
  viewerItem: "66666666-1000-0000-0000-000000000007",
  foreignItem: "66666666-1000-0000-0000-000000000008",
  unknownItem: "00000000-0000-0000-0000-000000000098",

  client: "66666666-2000-0000-0000-000000000001",
  inactiveClient: "77777777-2000-0000-0000-000000000001",
  blockedClient: "77777777-2000-0000-0000-000000000002",
  crossClient: "66666666-2000-0000-0000-000000000005",
  managerClient: "66666666-2000-0000-0000-000000000006",
  operatorClient: "66666666-2000-0000-0000-000000000007",
  viewerClient: "66666666-2000-0000-0000-000000000008",
  foreignClient: "66666666-2000-0000-0000-000000000009",
  versionlessClient: "77777777-2000-0000-0000-000000000003",
  assignmentChainClient: "66666666-2000-0000-0000-000000000024",
  overrideChainClient: "66666666-2000-0000-0000-00000000002a",
  noSourceClient: "66666666-2000-0000-0000-00000000002f",
  zeroClient: "77777777-2000-0000-0000-000000000004",
  unknownClient: "00000000-0000-0000-0000-000000000099",

  mainTable: "66666666-3000-0000-0000-000000000001",
  mainVersion: "66666666-3000-0000-0000-000000000002",
  mainPriceItem: "66666666-3000-0000-0000-000000000003",
  tableA: "66666666-3000-0000-0000-000000000011",
  tableB: "66666666-3000-0000-0000-000000000012",
  zeroFallbackTable: "77777777-3000-0000-0000-000000000002",
  versionA: "66666666-3000-0000-0000-000000000021",
  versionB: "66666666-3000-0000-0000-000000000022",
  priceA: "66666666-3000-0000-0000-000000000031",
  priceB: "66666666-3000-0000-0000-000000000033",

  mainAssignment: "66666666-4000-0000-0000-000000000001",
  chainAssignmentHistory: "66666666-4000-0000-0000-000000000011",
  chainAssignmentCurrent: "66666666-4000-0000-0000-000000000012",
  chainAssignmentFuture: "66666666-4000-0000-0000-000000000013",
  versionlessAssignment: "77777777-4000-0000-0000-000000000003",
  blockedAssignment: "77777777-4000-0000-0000-000000000002",

  provenanceOverride: "66666666-5000-0000-0000-000000000001",
  chainOverrideHistory: "66666666-5000-0000-0000-000000000011",
  chainOverrideCurrent: "66666666-5000-0000-0000-000000000012",
  chainOverrideFuture: "66666666-5000-0000-0000-000000000013",
  zeroOverride: "77777777-5000-0000-0000-000000000001",
};

const GROUPS = {
  security: "Security and permission conjunction",
  override: "Override precedence and terminal states",
  fallback: "Assigned-table fallback and absence mapping",
  contract: "Canonical output and static boundaries",
  temporal: "Current, future, historical, and client context",
  integrity: "Determinism and defensive integrity",
};

let today;
const results = [];
let migration;

function addDays(days) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function checks(entries) {
  return entries.map(([name, ok, info = ""]) => ({ name, ok: Boolean(ok), detail: info }));
}

function detail(result) {
  return result?.error?.message || "no database error";
}

function failed(result, text = null) {
  return Boolean(result?.error) && (!text || result.error.message.includes(text));
}

function exactKeys(value, expected) {
  return value && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function canonical(value) {
  return exactKeys(value, CANONICAL_KEYS) && exactKeys(value.trace, [
    "override_status",
    "assignment_status",
    "table_price_status",
  ]);
}

function containsKey(value, forbidden) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((entry) => containsKey(entry, forbidden));
  return Object.entries(value).some(
    ([key, entry]) => forbidden.has(key) || containsKey(entry, forbidden)
  );
}

async function test(group, label, title, expected, run) {
  let assertions;
  try {
    assertions = await run();
    if (!Array.isArray(assertions) || assertions.length !== expected) {
      throw new Error(`case declared ${expected} assertions but returned ${assertions?.length ?? 0}`);
    }
  } catch (error) {
    assertions = Array.from({ length: expected }, (_, index) => ({
      name: index === 0 ? "case completed" : `case assertion ${index + 1} completed`,
      ok: false,
      detail: index === 0 ? error?.message || String(error) : "case aborted",
    }));
  }
  const ok = assertions.every((assertion) => assertion.ok);
  results.push({ group, label, title, assertions, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${label} ${title}`);
  for (const assertion of assertions) {
    if (!assertion.ok) console.log(`     ${assertion.name}: ${assertion.detail}`);
  }
}

function finalArgs(organizationId, clientId, itemId, referenceDate = today) {
  return {
    p_organization_id: organizationId,
    p_client_company_id: clientId,
    p_catalog_item_id: itemId,
    p_reference_date: referenceDate,
  };
}

async function resolve(organizationId, clientId, itemId, referenceDate = today) {
  return memberClient.rpc(
    "fn_resolve_final_client_price",
    finalArgs(organizationId, clientId, itemId, referenceDate)
  );
}

async function authenticate() {
  const { data, error } = await memberClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error || !data.user) throw new Error(`Authentication failed: ${error?.message || "no user"}`);
}

async function loadDatabaseDate() {
  const result = await memberClient.rpc("fn_resolve_final_client_price", {
    p_organization_id: F.mainOrg,
    p_client_company_id: F.client,
    p_catalog_item_id: F.itemA,
  });
  if (result.error || !result.data?.reference_date) {
    throw new Error(`Could not derive PostgreSQL reference date: ${detail(result)}`);
  }
  today = result.data.reference_date;
}

async function securityCases() {
  await test("security", "FPR-H01", "anonymous RPC execution is blocked", 2, async () => {
    const result = await anonClient.rpc(
      "fn_resolve_final_client_price",
      finalArgs(F.mainOrg, F.client, F.itemA)
    );
    return checks([
      ["anonymous call rejected", Boolean(result.error), detail(result)],
      ["no business payload disclosed", result.data === null],
    ]);
  });

  await test("security", "FPR-H02", "non-member is blocked before disclosure", 2, async () => {
    const result = await resolve(F.foreignOrg, F.foreignClient, F.foreignItem);
    return checks([
      ["membership error returned", failed(result, "Not a member"), detail(result)],
      ["no foreign payload disclosed", result.data === null],
    ]);
  });

  await test("security", "FPR-H03", "client-view-only custom role is blocked", 2, async () => {
    const result = await resolve(F.clientOnlyOrg, F.unknownClient, F.unknownItem);
    return checks([
      ["commercial view required", failed(result, "pricing.commercial.view"), detail(result)],
      ["no partial client disclosure", result.data === null],
    ]);
  });

  await test("security", "FPR-H04", "commercial-view-only custom role is blocked", 2, async () => {
    const result = await resolve(F.commercialOnlyOrg, F.unknownClient, F.unknownItem);
    return checks([
      ["client view required", failed(result, "pricing.client.view"), detail(result)],
      ["no partial commercial disclosure", result.data === null],
    ]);
  });

  await test("security", "FPR-H05", "custom role with both permissions may resolve", 4, async () => {
    const result = await resolve(F.bothOrg, F.unknownClient, F.unknownItem);
    return checks([
      ["RPC accepted", !result.error, detail(result)],
      ["missing client returned only after gates", result.data?.status === "CLIENT_NOT_FOUND"],
      ["source remains null", result.data?.source === null],
      ["canonical output returned", canonical(result.data)],
    ]);
  });

  await test("security", "FPR-H06", "admin resolves through the final RPC", 3, async () => {
    const result = await resolve(F.mainOrg, F.client, F.itemA);
    return checks([
      ["admin call accepted", !result.error, detail(result)],
      ["commercial result resolved", result.data?.status === "RESOLVED"],
      ["new final-price permission not required", result.data?.source === "CLIENT_OVERRIDE"],
    ]);
  });

  await test("security", "FPR-H07", "all standard read roles may execute", 6, async () => {
    const manager = await resolve(F.managerOrg, F.managerClient, F.managerItem);
    const operator = await resolve(F.operatorOrg, F.operatorClient, F.operatorItem);
    const viewer = await resolve(F.viewerOrg, F.viewerClient, F.viewerItem);
    return checks([
      ["manager accepted", !manager.error, detail(manager)],
      ["manager receives business result", manager.data?.status === "PRICE_NOT_FOUND"],
      ["operator accepted", !operator.error, detail(operator)],
      ["operator receives business result", operator.data?.status === "PRICE_NOT_FOUND"],
      ["viewer accepted", !viewer.error, detail(viewer)],
      ["viewer receives business result", viewer.data?.status === "PRICE_NOT_FOUND"],
    ]);
  });

  await test("security", "FPR-H08", "member cross-tenant lookup reveals no foreign entity", 3, async () => {
    const result = await resolve(F.crossOrg, F.client, F.itemA);
    return checks([
      ["authorized organization request accepted", !result.error, detail(result)],
      ["foreign client appears absent", result.data?.status === "CLIENT_NOT_FOUND"],
      ["payload contains no corporate identity", !JSON.stringify(result.data).includes("PRC06B Main Client")],
    ]);
  });

  await test("security", "FPR-H09", "all explicit null inputs are rejected", 4, async () => {
    const base = finalArgs(F.mainOrg, F.client, F.itemA);
    const organization = await memberClient.rpc("fn_resolve_final_client_price", { ...base, p_organization_id: null });
    const client = await memberClient.rpc("fn_resolve_final_client_price", { ...base, p_client_company_id: null });
    const item = await memberClient.rpc("fn_resolve_final_client_price", { ...base, p_catalog_item_id: null });
    const date = await memberClient.rpc("fn_resolve_final_client_price", { ...base, p_reference_date: null });
    return checks([
      ["null organization rejected", failed(organization, "organization_id is required"), detail(organization)],
      ["null client rejected", failed(client, "client_company_id is required"), detail(client)],
      ["null item rejected", failed(item, "catalog_item_id is required"), detail(item)],
      ["null date rejected", failed(date, "Reference date is required"), detail(date)],
    ]);
  });

  await test("security", "FPR-H10", "omitted reference date uses PostgreSQL default", 3, async () => {
    const result = await memberClient.rpc("fn_resolve_final_client_price", {
      p_organization_id: F.mainOrg,
      p_client_company_id: F.client,
      p_catalog_item_id: F.itemA,
    });
    return checks([
      ["defaulted call accepted", !result.error, detail(result)],
      ["default date is current date", result.data?.reference_date === today],
      ["defaulted result remains canonical", canonical(result.data)],
    ]);
  });
}

async function overrideCases() {
  await test("override", "FPR-H11", "override wins over an available assigned-table price", 7, async () => {
    const result = await resolve(F.mainOrg, F.client, F.itemA);
    return checks([
      ["request resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["source is exact override enum", result.data?.source === "CLIENT_OVERRIDE"],
      ["negotiated price wins", Number(result.data?.price_amount) === 92],
      ["currency is BRL", result.data?.currency === "BRL"],
      ["override id returned", result.data?.source_refs?.override_id === F.provenanceOverride],
      ["assignment was not evaluated", result.data?.trace?.assignment_status === null],
      ["table price was not evaluated", result.data?.trace?.table_price_status === null],
    ]);
  });

  await test("override", "FPR-H12", "override resolves without any assignment", 6, async () => {
    const result = await resolve(F.mainOrg, F.overrideChainClient, F.workflowItem);
    return checks([
      ["request resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["override authority selected", result.data?.source === "CLIENT_OVERRIDE"],
      ["manual price exact", Number(result.data?.price_amount) === 85],
      ["current override exact", result.data?.source_refs?.override_id === F.chainOverrideCurrent],
      ["trace stops after override", result.data?.trace?.override_status === "RESOLVED"],
      ["downstream statuses null", result.data?.trace?.assignment_status === null && result.data?.trace?.table_price_status === null],
    ]);
  });

  await test("override", "FPR-H13", "explicit zero override short-circuits nonzero table", 7, async () => {
    const result = await resolve(F.mainOrg, F.zeroClient, F.zeroItem);
    const assignment = await memberClient.rpc("fn_resolve_client_table_assignment", {
      p_organization_id: F.mainOrg,
      p_client_company_id: F.zeroClient,
      p_reference_date: today,
    });
    const table = await memberClient.rpc("fn_resolve_commercial_table_price", {
      p_organization_id: F.mainOrg,
      p_commercial_price_table_id: F.zeroFallbackTable,
      p_catalog_item_id: F.zeroItem,
      p_reference_date: today,
    });
    return checks([
      ["zero result resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["source remains override", result.data?.source === "CLIENT_OVERRIDE"],
      ["numeric zero preserved", typeof result.data?.price_amount === "number" && result.data.price_amount === 0],
      ["currency remains BRL", result.data?.currency === "BRL"],
      ["nonzero fallback fixture exists", !assignment.error && assignment.data?.status === "RESOLVED" && assignment.data?.assignment?.id === "77777777-4000-0000-0000-000000000001" && assignment.data?.assignment?.commercial_price_table_id === F.zeroFallbackTable && !table.error && table.data?.status === "RESOLVED" && Number(table.data?.price_amount) === 45],
      ["assignment not evaluated", result.data?.trace?.assignment_status === null],
      ["table resolver not evaluated", result.data?.trace?.table_price_status === null],
    ]);
  });

  await test("override", "FPR-H14", "captured provenance remains evidence only", 6, async () => {
    const result = await resolve(F.mainOrg, F.client, F.itemA);
    const refs = result.data?.source_refs;
    return checks([
      ["override remains authority", result.data?.source === "CLIENT_OVERRIDE"],
      ["override reference present", refs?.override_id === F.provenanceOverride],
      ["source table reference present", refs?.source_commercial_price_table_id === F.mainTable],
      ["source version reference present", refs?.source_commercial_price_table_version_id === F.mainVersion],
      ["source item reference present", refs?.source_commercial_price_item_id === F.mainPriceItem],
      ["baseline amount is not exposed", !Object.hasOwn(refs || {}, "source_table_price_amount")],
    ]);
  });

  await test("override", "FPR-H15", "manual override exposes only override_id", 5, async () => {
    const result = await resolve(F.mainOrg, F.overrideChainClient, F.workflowItem);
    return checks([
      ["manual override resolved", !result.error && result.data?.source === "CLIENT_OVERRIDE", detail(result)],
      ["source refs object present", result.data?.source_refs !== null],
      ["source refs has one key", Object.keys(result.data?.source_refs || {}).length === 1],
      ["override id exact", result.data?.source_refs?.override_id === F.chainOverrideCurrent],
      ["no fabricated provenance", !Object.hasOwn(result.data?.source_refs || {}, "source_commercial_price_table_id")],
    ]);
  });

  await test("override", "FPR-H16", "missing client is terminal", 6, async () => {
    const result = await resolve(F.mainOrg, F.unknownClient, F.itemA);
    return checks([
      ["business response returned", !result.error, detail(result)],
      ["client status exact", result.data?.status === "CLIENT_NOT_FOUND"],
      ["client context null", result.data?.client_profile_status === null],
      ["source fields null", result.data?.source === null && result.data?.source_refs === null],
      ["price fields null", result.data?.price_amount === null && result.data?.currency === null],
      ["trace terminal", result.data?.trace?.override_status === "CLIENT_NOT_FOUND" && result.data?.trace?.assignment_status === null && result.data?.trace?.table_price_status === null],
    ]);
  });

  await test("override", "FPR-H17", "missing item is terminal", 6, async () => {
    const result = await resolve(F.mainOrg, F.client, F.unknownItem);
    return checks([
      ["business response returned", !result.error, detail(result)],
      ["item status exact", result.data?.status === "ITEM_NOT_FOUND"],
      ["valid client context preserved", result.data?.client_profile_status === "active"],
      ["source fields null", result.data?.source === null && result.data?.source_refs === null],
      ["price fields null", result.data?.price_amount === null && result.data?.currency === null],
      ["trace terminal", result.data?.trace?.override_status === "ITEM_NOT_FOUND" && result.data?.trace?.assignment_status === null && result.data?.trace?.table_price_status === null],
    ]);
  });
}

async function fallbackCases() {
  await test("fallback", "FPR-H18", "missing override falls back to assigned table", 8, async () => {
    const result = await resolve(F.mainOrg, F.assignmentChainClient, F.workflowItem);
    const refs = result.data?.source_refs;
    return checks([
      ["request resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["table source enum exact", result.data?.source === "ASSIGNED_COMMERCIAL_TABLE"],
      ["table price exact", Number(result.data?.price_amount) === 125],
      ["assignment id exact", refs?.assignment_id === F.chainAssignmentCurrent],
      ["table id exact", refs?.commercial_price_table_id === F.tableA],
      ["version id exact", refs?.commercial_price_table_version_id === F.versionA],
      ["commercial item id exact", refs?.commercial_price_item_id === F.priceA],
      ["full trace exact", result.data?.trace?.override_status === "OVERRIDE_NOT_FOUND" && result.data?.trace?.assignment_status === "RESOLVED" && result.data?.trace?.table_price_status === "RESOLVED"],
    ]);
  });

  await test("fallback", "FPR-H19", "missing assignment maps to final price absence", 7, async () => {
    const result = await resolve(F.mainOrg, F.noSourceClient, F.workflowItem);
    return checks([
      ["business response returned", !result.error, detail(result)],
      ["final status price-not-found", result.data?.status === "PRICE_NOT_FOUND"],
      ["reason exact", result.data?.reason_code === "ASSIGNMENT_NOT_FOUND"],
      ["source null", result.data?.source === null],
      ["price and currency null", result.data?.price_amount === null && result.data?.currency === null],
      ["source refs null", result.data?.source_refs === null],
      ["table was not evaluated", result.data?.trace?.override_status === "OVERRIDE_NOT_FOUND" && result.data?.trace?.assignment_status === "ASSIGNMENT_NOT_FOUND" && result.data?.trace?.table_price_status === null],
    ]);
  });

  await test("fallback", "FPR-H20", "assigned table without version maps correctly", 7, async () => {
    const result = await resolve(F.mainOrg, F.versionlessClient, F.workflowItem);
    return checks([
      ["business response returned", !result.error, detail(result)],
      ["final status price-not-found", result.data?.status === "PRICE_NOT_FOUND"],
      ["reason exact", result.data?.reason_code === "VERSION_NOT_FOUND"],
      ["source null", result.data?.source === null],
      ["price and currency null", result.data?.price_amount === null && result.data?.currency === null],
      ["source refs null", result.data?.source_refs === null],
      ["trace records table outcome", result.data?.trace?.override_status === "OVERRIDE_NOT_FOUND" && result.data?.trace?.assignment_status === "RESOLVED" && result.data?.trace?.table_price_status === "VERSION_NOT_FOUND"],
    ]);
  });

  await test("fallback", "FPR-H21", "missing table item maps to distinct reason", 7, async () => {
    const result = await resolve(F.mainOrg, F.assignmentChainClient, F.missingPriceItem);
    return checks([
      ["business response returned", !result.error, detail(result)],
      ["final status price-not-found", result.data?.status === "PRICE_NOT_FOUND"],
      ["reason normalized", result.data?.reason_code === "TABLE_PRICE_NOT_FOUND"],
      ["upstream status retained only in trace", result.data?.trace?.table_price_status === "PRICE_NOT_FOUND"],
      ["source null", result.data?.source === null],
      ["price fields null", result.data?.price_amount === null && result.data?.currency === null],
      ["no fallback source refs", result.data?.source_refs === null],
    ]);
  });

  await test("fallback", "FPR-H22", "TABLE_NOT_FOUND mapping is explicit and safe", 3, async () => {
    return checks([
      ["upstream status branch exists", migration.includes("WHEN 'TABLE_NOT_FOUND' THEN 'TABLE_NOT_FOUND'")],
      ["final absence status surrounds mapping", /'status',\s*'PRICE_NOT_FOUND'[\s\S]*WHEN 'TABLE_NOT_FOUND' THEN 'TABLE_NOT_FOUND'/.test(migration)],
      ["valid fixture state is not broken to manufacture status", !migration.includes("DISABLE TRIGGER")],
    ]);
  });
}

async function contractCases() {
  await test("contract", "FPR-H23", "every business result has the canonical shape", 6, async () => {
    const override = await resolve(F.mainOrg, F.client, F.itemA);
    const table = await resolve(F.mainOrg, F.assignmentChainClient, F.workflowItem);
    const missingAssignment = await resolve(F.mainOrg, F.noSourceClient, F.workflowItem);
    const missingVersion = await resolve(F.mainOrg, F.versionlessClient, F.workflowItem);
    const missingClient = await resolve(F.mainOrg, F.unknownClient, F.itemA);
    const missingItem = await resolve(F.mainOrg, F.client, F.unknownItem);
    return checks([
      ["override shape exact", canonical(override.data)],
      ["table shape exact", canonical(table.data)],
      ["assignment absence shape exact", canonical(missingAssignment.data)],
      ["version absence shape exact", canonical(missingVersion.data)],
      ["client absence shape exact", canonical(missingClient.data)],
      ["item absence shape exact", canonical(missingItem.data)],
    ]);
  });

  await test("contract", "FPR-H24", "minimal payload excludes PII and volatile fields", 5, async () => {
    const override = await resolve(F.mainOrg, F.client, F.itemA);
    const table = await resolve(F.mainOrg, F.assignmentChainClient, F.workflowItem);
    const forbiddenPii = new Set(["legal_name", "trade_name", "tax_id", "commercial_notes", "reason"]);
    const forbiddenVolatile = new Set(["resolved_at", "execution_uuid", "trace_id"]);
    if (override.error || !canonical(override.data) || table.error || !canonical(table.data)) {
      throw new Error(`${detail(override)} / ${detail(table)}`);
    }
    return checks([
      ["both canonical payloads returned", true],
      ["override has no PII", !containsKey(override.data, forbiddenPii)],
      ["table has no PII", !containsKey(table.data, forbiddenPii)],
      ["neither payload has volatile fields", !containsKey(override.data, forbiddenVolatile) && !containsKey(table.data, forbiddenVolatile)],
      ["component payloads are not embedded", !Object.hasOwn(override.data || {}, "override") && !Object.hasOwn(table.data || {}, "table") && !Object.hasOwn(table.data || {}, "version")],
    ]);
  });

  await test("contract", "FPR-H25", "trace contains only evaluated component statuses", 6, async () => {
    const override = await resolve(F.mainOrg, F.client, F.itemA);
    const missingAssignment = await resolve(F.mainOrg, F.noSourceClient, F.workflowItem);
    const table = await resolve(F.mainOrg, F.assignmentChainClient, F.workflowItem);
    return checks([
      ["all trace scenarios returned", !override.error && !missingAssignment.error && !table.error, `${detail(override)} / ${detail(missingAssignment)} / ${detail(table)}`],
      ["override trace exact", override.data?.trace?.override_status === "RESOLVED" && override.data?.trace?.assignment_status === null && override.data?.trace?.table_price_status === null],
      ["assignment absence trace exact", missingAssignment.data?.trace?.override_status === "OVERRIDE_NOT_FOUND" && missingAssignment.data?.trace?.assignment_status === "ASSIGNMENT_NOT_FOUND" && missingAssignment.data?.trace?.table_price_status === null],
      ["table trace keys exact", exactKeys(table.data?.trace, ["override_status", "assignment_status", "table_price_status"])],
      ["table trace statuses exact", table.data?.trace?.override_status === "OVERRIDE_NOT_FOUND" && table.data?.trace?.assignment_status === "RESOLVED" && table.data?.trace?.table_price_status === "RESOLVED"],
      ["table trace contains three strings", Object.values(table.data.trace).length === 3 && Object.values(table.data.trace).every((value) => typeof value === "string")],
    ]);
  });

  await test("contract", "FPR-H26", "source enum is closed and unresolved source is null", 5, async () => {
    const override = await resolve(F.mainOrg, F.client, F.itemA);
    const table = await resolve(F.mainOrg, F.assignmentChainClient, F.workflowItem);
    const assignmentMissing = await resolve(F.mainOrg, F.noSourceClient, F.workflowItem);
    const clientMissing = await resolve(F.mainOrg, F.unknownClient, F.itemA);
    const itemMissing = await resolve(F.mainOrg, F.client, F.unknownItem);
    return checks([
      ["override enum exact", override.data?.source === "CLIENT_OVERRIDE"],
      ["table enum exact", table.data?.source === "ASSIGNED_COMMERCIAL_TABLE"],
      ["price absence source null", assignmentMissing.data?.source === null],
      ["client absence source null", clientMissing.data?.source === null],
      ["item absence source null", itemMissing.data?.source === null],
    ]);
  });

  await test("contract", "FPR-H27", "migration contains no forbidden engine, temporal, or mutation logic", 7, async () => {
    return checks([
      ["no pricing engine references", !/fn_calculate_price|fn_simulate_price|pricing_policies|supplier_cost|pricing\.calculate/i.test(migration)],
      ["no direct override table", !/\bclient_price_overrides\b/i.test(migration)],
      ["no direct assignment table", !/\bclient_commercial_table_assignments\b/i.test(migration)],
      ["no direct version table", !/\bcommercial_price_table_versions\b/i.test(migration)],
      ["no direct commercial item table", !/\bcommercial_price_items\b/i.test(migration)],
      ["no DML statements", !/\b(INSERT|UPDATE|DELETE)\b/i.test(migration)],
      ["no sync or audit calls", !/fn_sync_|log_audit|audit_logs/i.test(migration)],
    ]);
  });
}

async function temporalCases() {
  await test("temporal", "FPR-H28", "current override resolves", 4, async () => {
    const result = await resolve(F.mainOrg, F.overrideChainClient, F.workflowItem, today);
    return checks([
      ["current result resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["current source override", result.data?.source === "CLIENT_OVERRIDE"],
      ["current override exact", result.data?.source_refs?.override_id === F.chainOverrideCurrent],
      ["current price exact", Number(result.data?.price_amount) === 85],
    ]);
  });

  await test("temporal", "FPR-H29", "future scheduled override resolves before sync", 5, async () => {
    const referenceDate = addDays(12);
    const result = await resolve(F.mainOrg, F.overrideChainClient, F.workflowItem, referenceDate);
    return checks([
      ["future result resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["future source override", result.data?.source === "CLIENT_OVERRIDE"],
      ["scheduled override exact", result.data?.source_refs?.override_id === F.chainOverrideFuture],
      ["future price exact", Number(result.data?.price_amount) === 90],
      ["reference date unchanged", result.data?.reference_date === referenceDate],
    ]);
  });

  await test("temporal", "FPR-H30", "historical superseded override resolves", 5, async () => {
    const referenceDate = addDays(-15);
    const result = await resolve(F.mainOrg, F.overrideChainClient, F.workflowItem, referenceDate);
    return checks([
      ["historical result resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["historical source override", result.data?.source === "CLIENT_OVERRIDE"],
      ["superseded override exact", result.data?.source_refs?.override_id === F.chainOverrideHistory],
      ["historical price exact", Number(result.data?.price_amount) === 80],
      ["reference date unchanged", result.data?.reference_date === referenceDate],
    ]);
  });

  await test("temporal", "FPR-H31", "current assigned-table path resolves", 4, async () => {
    const result = await resolve(F.mainOrg, F.assignmentChainClient, F.workflowItem, today);
    return checks([
      ["current table result resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["current source table", result.data?.source === "ASSIGNED_COMMERCIAL_TABLE"],
      ["current assignment exact", result.data?.source_refs?.assignment_id === F.chainAssignmentCurrent],
      ["current table price exact", Number(result.data?.price_amount) === 125],
    ]);
  });

  await test("temporal", "FPR-H32", "future assignment resolves table before sync", 5, async () => {
    const referenceDate = addDays(12);
    const result = await resolve(F.mainOrg, F.assignmentChainClient, F.workflowItem, referenceDate);
    return checks([
      ["future table result resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["future source table", result.data?.source === "ASSIGNED_COMMERCIAL_TABLE"],
      ["scheduled assignment exact", result.data?.source_refs?.assignment_id === F.chainAssignmentFuture],
      ["future table identities exact", result.data?.source_refs?.commercial_price_table_id === F.tableB && result.data?.source_refs?.commercial_price_table_version_id === F.versionB && result.data?.source_refs?.commercial_price_item_id === F.priceB],
      ["future price/date exact", Number(result.data?.price_amount) === 150 && result.data?.reference_date === referenceDate],
    ]);
  });

  await test("temporal", "FPR-H33", "historical assignment resolves historical table path", 5, async () => {
    const referenceDate = addDays(-15);
    const result = await resolve(F.mainOrg, F.assignmentChainClient, F.workflowItem, referenceDate);
    return checks([
      ["historical table result resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["historical source table", result.data?.source === "ASSIGNED_COMMERCIAL_TABLE"],
      ["superseded assignment exact", result.data?.source_refs?.assignment_id === F.chainAssignmentHistory],
      ["historical table identities exact", result.data?.source_refs?.commercial_price_table_id === F.tableA && result.data?.source_refs?.commercial_price_table_version_id === F.versionA],
      ["historical price/date exact", Number(result.data?.price_amount) === 125 && result.data?.reference_date === referenceDate],
    ]);
  });

  await test("temporal", "FPR-H34", "reference date crosses exact half-open boundary", 6, async () => {
    const beforeDate = addDays(9);
    const boundaryDate = addDays(10);
    const before = await resolve(F.mainOrg, F.assignmentChainClient, F.workflowItem, beforeDate);
    const boundary = await resolve(F.mainOrg, F.assignmentChainClient, F.workflowItem, boundaryDate);
    return checks([
      ["day before accepted", !before.error, detail(before)],
      ["day before selects predecessor", before.data?.source_refs?.assignment_id === F.chainAssignmentCurrent],
      ["day before price exact", Number(before.data?.price_amount) === 125],
      ["boundary accepted", !boundary.error, detail(boundary)],
      ["boundary selects successor", boundary.data?.source_refs?.assignment_id === F.chainAssignmentFuture],
      ["both dates echoed unchanged", before.data?.reference_date === beforeDate && boundary.data?.reference_date === boundaryDate],
    ]);
  });

  await test("temporal", "FPR-H35", "inactive and blocked client statuses remain context", 6, async () => {
    const inactive = await resolve(F.mainOrg, F.inactiveClient, F.itemB);
    const blocked = await resolve(F.mainOrg, F.blockedClient, F.itemA);
    return checks([
      ["inactive client still resolves", !inactive.error && inactive.data?.status === "RESOLVED", detail(inactive)],
      ["inactive context returned", inactive.data?.client_profile_status === "inactive"],
      ["inactive override remains authority", inactive.data?.source === "CLIENT_OVERRIDE" && Number(inactive.data?.price_amount) === 77],
      ["blocked client still resolves", !blocked.error && blocked.data?.status === "RESOLVED", detail(blocked)],
      ["blocked context returned", blocked.data?.client_profile_status === "blocked"],
      ["blocked table result valid", blocked.data?.source === "ASSIGNED_COMMERCIAL_TABLE" && Number(blocked.data?.price_amount) === 100],
    ]);
  });
}

async function integrityCases() {
  await test("integrity", "FPR-H36", "identical calls return identical semantic JSON", 4, async () => {
    const first = await resolve(F.mainOrg, F.client, F.itemA);
    const second = await resolve(F.mainOrg, F.client, F.itemA);
    const third = await resolve(F.mainOrg, F.client, F.itemA);
    if (first.error || second.error || third.error || !first.data || !second.data || !third.data) {
      throw new Error(`${detail(first)} / ${detail(second)} / ${detail(third)}`);
    }
    return checks([
      ["all calls accepted", true],
      ["first and second identical", JSON.stringify(first.data) === JSON.stringify(second.data)],
      ["second and third identical", JSON.stringify(second.data) === JSON.stringify(third.data)],
      ["no volatile field introduced", !containsKey(first.data, new Set(["resolved_at", "execution_uuid", "trace_id"]))],
    ]);
  });

  await test("integrity", "FPR-H37", "function signature and security metadata are exact", 7, async () => {
    const signature = /CREATE OR REPLACE FUNCTION public\.fn_resolve_final_client_price\(\s*p_organization_id\s+uuid,\s*p_client_company_id\s+uuid,\s*p_catalog_item_id\s+uuid,\s*p_reference_date\s+date DEFAULT current_date\s*\)/i;
    const componentStart = migration.indexOf("v_override_result := public.fn_resolve_client_price_override");
    const authIndex = migration.indexOf("auth.uid() IS NULL");
    const membershipIndex = migration.indexOf("is_member_of");
    const clientPermissionIndex = migration.indexOf("pricing.client.view");
    const commercialPermissionIndex = migration.indexOf("pricing.commercial.view");
    return checks([
      ["signature exact", signature.test(migration)],
      ["returns jsonb in plpgsql", /RETURNS jsonb AS \$\$[\s\S]*LANGUAGE plpgsql/i.test(migration)],
      ["security definer stable", /LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public/i.test(migration)],
      ["all broad execute grants revoked", /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated;/i.test(migration)],
      ["authenticated execute re-granted", /GRANT EXECUTE ON FUNCTION[\s\S]*TO authenticated;/i.test(migration)],
      ["authentication precedes component call", componentStart >= 0 && authIndex >= 0 && authIndex < componentStart],
      ["membership and both permissions precede component call", componentStart >= 0 && membershipIndex >= 0 && clientPermissionIndex >= 0 && commercialPermissionIndex >= 0 && membershipIndex < componentStart && clientPermissionIndex < componentStart && commercialPermissionIndex < componentStart],
    ]);
  });

  await test("integrity", "FPR-H38", "contradictory and unexpected component states raise", 6, async () => {
    return checks([
      ["unexpected override guarded", migration.includes("unexpected override status")],
      ["assignment client contradiction guarded", migration.includes("assignment contradicted existing client")],
      ["unexpected assignment guarded", migration.includes("unexpected assignment status")],
      ["unexpected table status guarded", migration.includes("unexpected table-price status")],
      ["partial provenance guarded", migration.includes("partial override provenance")],
      ["cross-component status mismatch guarded", migration.includes("client status mismatch between components")],
    ]);
  });

  await test("integrity", "FPR-H39", "numeric and BRL authority are preserved without volatile output", 6, async () => {
    const override = await resolve(F.mainOrg, F.client, F.itemA);
    const table = await resolve(F.mainOrg, F.assignmentChainClient, F.workflowItem);
    return checks([
      ["override JSON price numeric", typeof override.data?.price_amount === "number"],
      ["table JSON price numeric", typeof table.data?.price_amount === "number"],
      ["override currency BRL", override.data?.currency === "BRL"],
      ["table currency BRL", table.data?.currency === "BRL"],
      ["migration rejects non-BRL upstream", (migration.match(/IS DISTINCT FROM 'BRL'/g) || []).length === 2],
      ["migration has no volatile output source", !/resolved_at|current_timestamp|now\(\)|random\(/i.test(migration)],
    ]);
  });

  await test("integrity", "FPR-H40", "composition calls each canonical resolver once and in order", 5, async () => {
    const overrideCall = migration.indexOf("v_override_result := public.fn_resolve_client_price_override");
    const assignmentCall = migration.indexOf("v_assignment_result := public.fn_resolve_client_table_assignment");
    const tableCall = migration.indexOf("v_table_result := public.fn_resolve_commercial_table_price");
    return checks([
      ["override component called once", (migration.match(/public\.fn_resolve_client_price_override\(/g) || []).length === 1],
      ["assignment component called once", (migration.match(/public\.fn_resolve_client_table_assignment\(/g) || []).length === 1],
      ["table component called once", (migration.match(/public\.fn_resolve_commercial_table_price\(/g) || []).length === 1],
      ["component order exact", overrideCall >= 0 && overrideCall < assignmentCall && assignmentCall < tableCall],
      ["same reference parameter passed to all", (migration.match(/p_reference_date\s*\n\s*\);/g) || []).length === 3],
    ]);
  });
}

function report() {
  const allAssertions = results.flatMap((result) => result.assertions);
  const passedCases = results.filter((result) => result.ok).length;
  const passedAssertions = allAssertions.filter((assertion) => assertion.ok).length;

  console.log("\nGroup results (cases and assertions reported separately)");
  for (const [group, title] of Object.entries(GROUPS)) {
    const groupCases = results.filter((result) => result.group === group);
    const groupAssertions = groupCases.flatMap((result) => result.assertions);
    console.log(
      `${title}: cases ${groupCases.filter((result) => result.ok).length}/${groupCases.length}; assertions ${groupAssertions.filter((assertion) => assertion.ok).length}/${groupAssertions.length}`
    );
  }
  const passedGroups = Object.keys(GROUPS).filter((group) => {
    const groupCases = results.filter((result) => result.group === group);
    return groupCases.length > 0 && groupCases.every((result) => result.ok);
  }).length;
  console.log(`Total groups: ${passedGroups}/${Object.keys(GROUPS).length} passed`);
  console.log(`Total cases: ${passedCases}/${results.length} passed`);
  console.log(`Total assertions: ${passedAssertions}/${allAssertions.length} passed`);

  if (results.length !== EXPECTED_CASES || allAssertions.length !== EXPECTED_ASSERTIONS) {
    console.error(
      `Suite definition error: expected ${EXPECTED_CASES} cases/${EXPECTED_ASSERTIONS} assertions, recorded ${results.length}/${allAssertions.length}`
    );
    return 1;
  }
  if (passedCases !== results.length) {
    console.error(`Failed cases: ${results.filter((result) => !result.ok).map((result) => result.label).join(", ")}`);
    return 1;
  }
  return 0;
}

async function main() {
  console.log("PRC-07B final-price resolution remote tests (FPR-H01..FPR-H40)");
  migration = await readFile(
    new URL("../../supabase/migrations/041_final_price_resolver.sql", import.meta.url),
    "utf8"
  );
  await authenticate();
  await loadDatabaseDate();
  await securityCases();
  await overrideCases();
  await fallbackCases();
  await contractCases();
  await temporalCases();
  await integrityCases();
  process.exit(report());
}

main().catch((error) => {
  console.error(`Fatal suite error: ${error?.message || String(error)}`);
  process.exit(1);
});
