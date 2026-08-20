#!/usr/bin/env node
/**
 * PRC-06B: CLP-H01..CLP-H60 remote schema, integrity, RLS and RBAC suite.
 *
 * Run tests/remote/sql/client_pricing_test_setup.sql first. Credentials are
 * read only from the canonical environment variables, with the documented
 * PRC03A fallback for the E2E account.
 */

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || process.env.PRC03A_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || process.env.PRC03A_TEST_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error(
    "Missing E2E_TEST_EMAIL/E2E_TEST_PASSWORD (legacy PRC03A fallback is supported)"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const F = {
  mainOrg: "66666666-6666-6666-6666-666666666661",
  crossOrg: "66666666-6666-6666-6666-666666666662",
  managerOrg: "66666666-6666-6666-6666-666666666663",
  operatorOrg: "66666666-6666-6666-6666-666666666664",
  viewerOrg: "66666666-6666-6666-6666-666666666665",
  foreignOrg: "66666666-6666-6666-6666-666666666666",

  itemA: "66666666-1000-0000-0000-000000000001",
  itemB: "66666666-1000-0000-0000-000000000002",
  inactiveItem: "66666666-1000-0000-0000-000000000003",
  crossItem: "66666666-1000-0000-0000-000000000004",
  managerItem: "66666666-1000-0000-0000-000000000005",
  operatorItem: "66666666-1000-0000-0000-000000000006",
  viewerItem: "66666666-1000-0000-0000-000000000007",

  client: "66666666-2000-0000-0000-000000000001",
  dualClient: "66666666-2000-0000-0000-000000000002",
  inactiveCompany: "66666666-2000-0000-0000-000000000003",
  blockedClient: "66666666-2000-0000-0000-000000000004",
  crossClient: "66666666-2000-0000-0000-000000000005",
  managerClient: "66666666-2000-0000-0000-000000000006",
  operatorClient: "66666666-2000-0000-0000-000000000007",
  viewerClient: "66666666-2000-0000-0000-000000000008",
  foreignClient: "66666666-2000-0000-0000-000000000009",
  profileCandidate: "66666666-2000-0000-0000-00000000000a",
  inactiveCandidate: "66666666-2000-0000-0000-00000000000b",
  managerCandidate: "66666666-2000-0000-0000-00000000000c",

  mainTable: "66666666-3000-0000-0000-000000000001",
  mainVersion: "66666666-3000-0000-0000-000000000002",
  mainPriceItem: "66666666-3000-0000-0000-000000000003",
  crossTable: "66666666-3000-0000-0000-000000000004",
  managerTable: "66666666-3000-0000-0000-000000000005",
  operatorTable: "66666666-3000-0000-0000-000000000006",
  viewerTable: "66666666-3000-0000-0000-000000000007",
  foreignTable: "66666666-3000-0000-0000-000000000008",
  inactiveTable: "66666666-3000-0000-0000-000000000009",

  activeAssignment: "66666666-4000-0000-0000-000000000001",
  gateAssignment: "66666666-4000-0000-0000-000000000002",
  scheduledAssignment: "66666666-4000-0000-0000-000000000007",
  inactiveHistoryAssignment: "66666666-4000-0000-0000-000000000009",
  provenanceOverride: "66666666-5000-0000-0000-000000000001",
  scheduledOverride: "66666666-5000-0000-0000-000000000006",
  inactiveHistoryOverride: "66666666-5000-0000-0000-000000000008",
};

const GROUPS = {
  profiles: "Profiles and company role",
  assignments: "Assignments and workflow gate",
  overrides: "Overrides and snapshots",
  provenance: "Trusted provenance",
  lifecycle: "Lifecycle, deletion and audit",
  security: "RLS and RBAC",
};

const results = [];
const runtimeProfiles = new Set();
const runtimeAssignments = new Set();
const runtimeOverrides = new Set();
let actorId;
let profileRow;
let assignmentRow;
let overrideRow;
let nullProvenanceRow;
let precisionOverrideRow;

function assertions(entries) {
  return entries.map(([name, ok, detail = ""]) => ({ name, ok: Boolean(ok), detail }));
}

async function test(group, label, title, run) {
  let checks;
  try {
    checks = await run();
    if (!Array.isArray(checks) || checks.length === 0) {
      checks = assertions([["case returned assertions", false, "no assertions returned"]]);
    }
  } catch (error) {
    checks = assertions([["case completed", false, error?.message || String(error)]]);
  }

  const ok = checks.every((check) => check.ok);
  results.push({ group, label, title, checks, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${label} ${title}`);
  for (const check of checks) {
    if (!check.ok) console.log(`     assertion: ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
  }
}

function errorDetail(result) {
  return result?.error?.message || "no database error";
}

function rows(result) {
  return Array.isArray(result?.data) ? result.data : [];
}

function insertBlocked(result) {
  return Boolean(result.error) && !result.data;
}

function profilePayload(companyId, organizationId, extra = {}) {
  return { company_id: companyId, organization_id: organizationId, ...extra };
}

function assignmentPayload(overrides = {}) {
  return {
    id: randomUUID(),
    organization_id: F.mainOrg,
    client_company_id: F.dualClient,
    commercial_price_table_id: F.mainTable,
    status: "draft",
    valid_from: "2028-01-01",
    contract_reference: "CLP remote test",
    notes: "runtime draft",
    ...overrides,
  };
}

function overridePayload(overrides = {}) {
  return {
    id: randomUUID(),
    organization_id: F.mainOrg,
    client_company_id: F.dualClient,
    catalog_item_id: F.itemB,
    price_amount: 12.5,
    currency: "BRL",
    reason: "CLP remote test",
    status: "draft",
    valid_from: "2028-01-01",
    item_code_snapshot: "CLIENT-SPOOF",
    item_name_snapshot: "CLIENT-SPOOF",
    item_type_snapshot: "CLIENT-SPOOF",
    ...overrides,
  };
}

async function insertAssignment(payload) {
  return supabase
    .from("client_commercial_table_assignments")
    .insert(payload)
    .select("*")
    .maybeSingle();
}

async function insertOverride(payload) {
  return supabase.from("client_price_overrides").insert(payload).select("*").maybeSingle();
}

async function authenticate() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error || !data.user) throw new Error(`Authentication failed: ${error?.message || "no user"}`);
  actorId = data.user.id;
  console.log("Authenticated E2E account");
}

async function profileCases() {
  await test("profiles", "CLP-H01", "seeded client profile and dual supplier role are visible", async () => {
    const profile = await supabase.from("client_profiles").select("company_id,status").eq("company_id", F.dualClient).single();
    const supplier = await supabase.from("supplier_profiles").select("company_id,status").eq("company_id", F.dualClient).single();
    return assertions([
      ["client role visible", !profile.error && profile.data?.status === "active", errorDetail(profile)],
      ["supplier role visible on same company", !supplier.error && supplier.data?.status === "active", errorDetail(supplier)],
    ]);
  });

  await test("profiles", "CLP-H02", "profile insert forces active and clears supplied status reason", async () => {
    const result = await supabase
      .from("client_profiles")
      .insert(profilePayload(F.profileCandidate, F.mainOrg, {
        status: "blocked",
        status_reason: "client supplied",
        commercial_notes: "runtime profile",
      }))
      .select("*")
      .single();
    profileRow = result.data;
    if (profileRow?.company_id) runtimeProfiles.add(profileRow.company_id);
    return assertions([
      ["insert accepted", !result.error && Boolean(profileRow), errorDetail(result)],
      ["status forced active", profileRow?.status === "active", `status=${profileRow?.status}`],
      ["status reason cleared", profileRow?.status_reason === null, `reason=${profileRow?.status_reason}`],
    ]);
  });

  await test("profiles", "CLP-H03", "profile actor and creation metadata are server-derived", async () => {
    return assertions([
      ["created_by is authenticated actor", profileRow?.created_by === actorId],
      ["updated_by is authenticated actor", profileRow?.updated_by === actorId],
      ["created_at equals initial updated_at", profileRow?.created_at === profileRow?.updated_at],
    ]);
  });

  await test("profiles", "CLP-H04", "duplicate company profile is rejected", async () => {
    const result = await supabase.from("client_profiles").insert(profilePayload(F.profileCandidate, F.mainOrg)).select().maybeSingle();
    return assertions([["duplicate rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("profiles", "CLP-H05", "profile company and organization must match", async () => {
    const result = await supabase.from("client_profiles").insert(profilePayload(F.crossClient, F.mainOrg)).select().maybeSingle();
    return assertions([["cross-organization profile rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("profiles", "CLP-H06", "new profile requires active company", async () => {
    const result = await supabase.from("client_profiles").insert(profilePayload(F.inactiveCandidate, F.mainOrg)).select().maybeSingle();
    return assertions([["inactive-company profile rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("profiles", "CLP-H07", "direct profile status transition is rejected and unchanged", async () => {
    const update = await supabase.from("client_profiles").update({ status: "blocked", status_reason: "direct" }).eq("company_id", F.profileCandidate).select("status");
    const current = await supabase.from("client_profiles").select("status").eq("company_id", F.profileCandidate).single();
    return assertions([
      ["transition blocked", Boolean(update.error) || rows(update).length === 0, errorDetail(update)],
      ["status remains active", current.data?.status === "active", errorDetail(current)],
    ]);
  });

  await test("profiles", "CLP-H08", "status reason cannot change without status", async () => {
    const update = await supabase.from("client_profiles").update({ status_reason: "standalone reason" }).eq("company_id", F.profileCandidate).select("status_reason");
    const current = await supabase.from("client_profiles").select("status_reason").eq("company_id", F.profileCandidate).single();
    return assertions([
      ["reason-only update blocked", Boolean(update.error) || rows(update).length === 0, errorDetail(update)],
      ["reason remains null", current.data?.status_reason === null, errorDetail(current)],
    ]);
  });

  await test("profiles", "CLP-H09", "editable profile notes update actor metadata", async () => {
    const update = await supabase.from("client_profiles").update({ commercial_notes: "updated by CLP-H09" }).eq("company_id", F.profileCandidate).select("commercial_notes,updated_by,updated_at").single();
    return assertions([
      ["notes update accepted", !update.error && update.data?.commercial_notes === "updated by CLP-H09", errorDetail(update)],
      ["updater derived", update.data?.updated_by === actorId],
      ["updated timestamp present", Boolean(update.data?.updated_at)],
    ]);
  });

  await test("profiles", "CLP-H10", "profile without pricing history can be deleted", async () => {
    const deletion = await supabase.from("client_profiles").delete().eq("company_id", F.profileCandidate).select("company_id");
    const current = await supabase.from("client_profiles").select("company_id").eq("company_id", F.profileCandidate);
    if (rows(current).length === 0) runtimeProfiles.delete(F.profileCandidate);
    return assertions([
      ["one profile deleted", !deletion.error && rows(deletion).length === 1, errorDetail(deletion)],
      ["profile no longer visible", !current.error && rows(current).length === 0, errorDetail(current)],
    ]);
  });
}

async function assignmentCases() {
  await test("assignments", "CLP-H11", "valid assignment draft is accepted", async () => {
    const result = await insertAssignment(assignmentPayload());
    assignmentRow = result.data;
    if (assignmentRow?.id) runtimeAssignments.add(assignmentRow.id);
    return assertions([
      ["draft accepted", !result.error && Boolean(assignmentRow), errorDetail(result)],
      ["status is draft", assignmentRow?.status === "draft", `status=${assignmentRow?.status}`],
    ]);
  });

  await test("assignments", "CLP-H12", "assignment actors and workflow metadata are server-derived", async () => {
    const payload = assignmentPayload({
      created_by: F.crossClient,
      updated_by: F.crossClient,
      submitted_by: F.crossClient,
      submitted_at: "2020-01-01T00:00:00Z",
    });
    const result = await insertAssignment(payload);
    if (result.data?.id) runtimeAssignments.add(result.data.id);
    return assertions([
      ["insert accepted", !result.error && Boolean(result.data), errorDetail(result)],
      ["created actor derived", result.data?.created_by === actorId],
      ["updated actor derived", result.data?.updated_by === actorId],
      ["submitted metadata cleared", result.data?.submitted_by === null && result.data?.submitted_at === null],
    ]);
  });

  await test("assignments", "CLP-H13", "assignment validity is a non-empty half-open range", async () => {
    const equal = await insertAssignment(assignmentPayload({ valid_from: "2028-01-01", valid_to: "2028-01-01" }));
    const reversed = await insertAssignment(assignmentPayload({ valid_from: "2028-01-02", valid_to: "2028-01-01" }));
    return assertions([
      ["equal endpoints rejected", insertBlocked(equal), errorDetail(equal)],
      ["reversed endpoints rejected", insertBlocked(reversed), errorDetail(reversed)],
    ]);
  });

  await test("assignments", "CLP-H14", "assignment client must belong to the same organization", async () => {
    const result = await insertAssignment(assignmentPayload({ client_company_id: F.crossClient }));
    return assertions([["cross-organization client rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("assignments", "CLP-H15", "assignment commercial table must belong to the same organization", async () => {
    const result = await insertAssignment(assignmentPayload({ commercial_price_table_id: F.crossTable }));
    return assertions([["cross-organization table rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("assignments", "CLP-H16", "new assignment requires active stable commercial table", async () => {
    const result = await insertAssignment(assignmentPayload({ commercial_price_table_id: F.inactiveTable }));
    return assertions([["inactive table rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("assignments", "CLP-H17", "new assignment revalidates company and profile eligibility", async () => {
    const inactiveCompany = await insertAssignment(assignmentPayload({ client_company_id: F.inactiveCompany }));
    const blockedProfile = await insertAssignment(assignmentPayload({ client_company_id: F.blockedClient }));
    const historyAssignment = await supabase.from("client_commercial_table_assignments").select("status").eq("id", F.inactiveHistoryAssignment).single();
    const historyOverride = await supabase.from("client_price_overrides").select("status,price_amount").eq("id", F.inactiveHistoryOverride).single();
    return assertions([
      ["inactive company rejected", insertBlocked(inactiveCompany), errorDetail(inactiveCompany)],
      ["blocked profile rejected", insertBlocked(blockedProfile), errorDetail(blockedProfile)],
      ["published assignment history remains readable", historyAssignment.data?.status === "active", errorDetail(historyAssignment)],
      ["published override history remains readable", historyOverride.data?.status === "active" && Number(historyOverride.data?.price_amount) === 77, errorDetail(historyOverride)],
    ]);
  });

  await test("assignments", "CLP-H18", "direct non-draft assignment insert is rejected", async () => {
    const result = await insertAssignment(assignmentPayload({ status: "under_review" }));
    return assertions([["non-draft insert rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("assignments", "CLP-H19", "direct assignment status update is rejected and unchanged", async () => {
    const update = await supabase.from("client_commercial_table_assignments").update({ status: "under_review" }).eq("id", assignmentRow?.id).select("status");
    const current = await supabase.from("client_commercial_table_assignments").select("status").eq("id", assignmentRow?.id).single();
    return assertions([
      ["status update blocked", Boolean(update.error) || rows(update).length === 0, errorDetail(update)],
      ["draft persisted", current.data?.status === "draft", errorDetail(current)],
    ]);
  });

  await test("assignments", "CLP-H20", "draft assignment business fields remain editable", async () => {
    const update = await supabase.from("client_commercial_table_assignments").update({ notes: "CLP-H20 edited", valid_to: "2029-01-01" }).eq("id", assignmentRow?.id).select("notes,valid_to,updated_by").single();
    return assertions([
      ["draft update accepted", !update.error && update.data?.notes === "CLP-H20 edited", errorDetail(update)],
      ["valid_to persisted", update.data?.valid_to === "2029-01-01"],
      ["updated actor derived", update.data?.updated_by === actorId],
    ]);
  });

  await test("assignments", "CLP-H21", "draft assignment workflow metadata cannot be spoofed", async () => {
    const update = await supabase.from("client_commercial_table_assignments").update({ approved_by: actorId, approved_at: new Date().toISOString() }).eq("id", assignmentRow?.id).select("approved_by");
    const current = await supabase.from("client_commercial_table_assignments").select("approved_by,approved_at").eq("id", assignmentRow?.id).single();
    return assertions([
      ["metadata update blocked", Boolean(update.error) || rows(update).length === 0, errorDetail(update)],
      ["approval metadata remains null", current.data?.approved_by === null && current.data?.approved_at === null],
    ]);
  });

  await test("assignments", "CLP-H22", "non-draft assignment business fields are immutable", async () => {
    const update = await supabase.from("client_commercial_table_assignments").update({ notes: "tampered" }).eq("id", F.activeAssignment).select("id");
    const current = await supabase.from("client_commercial_table_assignments").select("notes,status").eq("id", F.activeAssignment).single();
    return assertions([
      ["non-draft update blocked", Boolean(update.error) || rows(update).length === 0, errorDetail(update)],
      ["active proof unchanged", current.data?.status === "active" && current.data?.notes === "gate-created active proof"],
    ]);
  });

  await test("assignments", "CLP-H23", "gate proof carries server workflow metadata and stable table identity", async () => {
    const gate = await supabase.from("client_commercial_table_assignments").select("status,submitted_by,submitted_at,commercial_price_table_id").eq("id", F.gateAssignment).single();
    const active = await supabase.from("client_commercial_table_assignments").select("commercial_price_table_id,status,valid_to").eq("id", F.activeAssignment).single();
    const scheduled = await supabase.from("client_commercial_table_assignments").select("commercial_price_table_id,status,valid_from").eq("id", F.scheduledAssignment).single();
    return assertions([
      ["true-gate transition persisted", gate.data?.status === "under_review", errorDetail(gate)],
      ["submit actor derived", gate.data?.submitted_by === actorId && Boolean(gate.data?.submitted_at)],
      ["assignment targets stable table", active.data?.commercial_price_table_id === F.mainTable && active.data?.status === "active"],
      ["active and scheduled ranges are adjacent", scheduled.data?.status === "scheduled" && scheduled.data?.commercial_price_table_id === F.mainTable && active.data?.valid_to === scheduled.data?.valid_from, errorDetail(scheduled)],
    ]);
  });
}

async function overrideCases() {
  await test("overrides", "CLP-H24", "valid override draft is accepted", async () => {
    const result = await insertOverride(overridePayload());
    overrideRow = result.data;
    if (overrideRow?.id) runtimeOverrides.add(overrideRow.id);
    return assertions([
      ["draft accepted", !result.error && Boolean(overrideRow), errorDetail(result)],
      ["explicit amount persisted", Number(overrideRow?.price_amount) === 12.5],
    ]);
  });

  await test("overrides", "CLP-H25", "explicit zero override is accepted", async () => {
    const result = await insertOverride(overridePayload({ price_amount: 0, reason: "included service" }));
    if (result.data?.id) runtimeOverrides.add(result.data.id);
    return assertions([
      ["zero accepted", !result.error && Boolean(result.data), errorDetail(result)],
      ["zero is preserved", Number(result.data?.price_amount) === 0],
    ]);
  });

  await test("overrides", "CLP-H26", "negative override amount is rejected", async () => {
    const result = await insertOverride(overridePayload({ price_amount: -0.0001 }));
    return assertions([["negative amount rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("overrides", "CLP-H27", "non-BRL override currency is rejected", async () => {
    const result = await insertOverride(overridePayload({ currency: "USD" }));
    return assertions([["USD rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("overrides", "CLP-H28", "override reason is required and nonblank", async () => {
    const missing = await insertOverride(overridePayload({ reason: null }));
    const blank = await insertOverride(overridePayload({ reason: "   " }));
    return assertions([
      ["null reason rejected", insertBlocked(missing), errorDetail(missing)],
      ["whitespace reason rejected", insertBlocked(blank), errorDetail(blank)],
    ]);
  });

  await test("overrides", "CLP-H29", "override validity is a non-empty half-open range", async () => {
    const result = await insertOverride(overridePayload({ valid_from: "2028-01-01", valid_to: "2028-01-01" }));
    return assertions([["empty interval rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("overrides", "CLP-H30", "override client must belong to the same organization", async () => {
    const result = await insertOverride(overridePayload({ client_company_id: F.crossClient }));
    return assertions([["cross-organization client rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("overrides", "CLP-H31", "override catalog item must belong to the same organization", async () => {
    const result = await insertOverride(overridePayload({ catalog_item_id: F.crossItem }));
    return assertions([["cross-organization item rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("overrides", "CLP-H32", "new override requires active catalog item", async () => {
    const result = await insertOverride(overridePayload({ catalog_item_id: F.inactiveItem }));
    return assertions([["inactive item rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("overrides", "CLP-H33", "direct non-draft override insert is rejected", async () => {
    const result = await insertOverride(overridePayload({ status: "active" }));
    return assertions([["non-draft insert rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("overrides", "CLP-H34", "direct override status update is rejected and unchanged", async () => {
    const update = await supabase.from("client_price_overrides").update({ status: "under_review" }).eq("id", overrideRow?.id).select("status");
    const current = await supabase.from("client_price_overrides").select("status").eq("id", overrideRow?.id).single();
    return assertions([
      ["status update blocked", Boolean(update.error) || rows(update).length === 0, errorDetail(update)],
      ["draft persisted", current.data?.status === "draft", errorDetail(current)],
    ]);
  });

  await test("overrides", "CLP-H35", "item snapshots are derived rather than trusted", async () => {
    return assertions([
      ["code snapshot derived", overrideRow?.item_code_snapshot === "PRC06B-ITEM-B"],
      ["name snapshot derived", overrideRow?.item_name_snapshot === "PRC06B Item B"],
      ["type snapshot derived", overrideRow?.item_type_snapshot === "other_service"],
    ]);
  });

  await test("overrides", "CLP-H36", "draft snapshot spoofing is ignored on update", async () => {
    const update = await supabase.from("client_price_overrides").update({ item_code_snapshot: "TAMPER", item_name_snapshot: "TAMPER", item_type_snapshot: "TAMPER", reason: "edited draft reason" }).eq("id", overrideRow?.id).select("item_code_snapshot,item_name_snapshot,item_type_snapshot,reason").single();
    return assertions([
      ["business edit accepted", !update.error && update.data?.reason === "edited draft reason", errorDetail(update)],
      ["snapshots preserved", update.data?.item_code_snapshot === "PRC06B-ITEM-B" && update.data?.item_name_snapshot === "PRC06B Item B" && update.data?.item_type_snapshot === "other_service"],
    ]);
  });

  await test("overrides", "CLP-H37", "override actors and workflow metadata are server-derived", async () => {
    const result = await insertOverride(overridePayload({
      created_by: F.crossClient,
      updated_by: F.crossClient,
      submitted_by: F.crossClient,
      submitted_at: "2020-01-01T00:00:00Z",
    }));
    if (result.data?.id) runtimeOverrides.add(result.data.id);
    return assertions([
      ["insert accepted", !result.error && Boolean(result.data), errorDetail(result)],
      ["actors derived", result.data?.created_by === actorId && result.data?.updated_by === actorId],
      ["workflow metadata cleared", result.data?.submitted_by === null && result.data?.submitted_at === null],
    ]);
  });

  await test("overrides", "CLP-H38", "override can exist without a table assignment", async () => {
    const assignmentCount = await supabase.from("client_commercial_table_assignments").select("id", { count: "exact", head: true }).eq("organization_id", F.managerOrg).eq("client_company_id", F.managerClient);
    const result = await insertOverride(overridePayload({
      organization_id: F.managerOrg,
      client_company_id: F.managerClient,
      catalog_item_id: F.managerItem,
      reason: "independent manager override",
    }));
    if (result.data?.id) runtimeOverrides.add(result.data.id);
    return assertions([
      ["no assignment exists", !assignmentCount.error && assignmentCount.count === 0, errorDetail(assignmentCount)],
      ["independent override accepted", !result.error && Boolean(result.data), errorDetail(result)],
    ]);
  });

  await test("overrides", "CLP-H39", "numeric(14,4) amount has deterministic four-decimal scale", async () => {
    const result = await insertOverride(overridePayload({ price_amount: 12.34567, reason: "scale proof" }));
    precisionOverrideRow = result.data;
    if (precisionOverrideRow?.id) runtimeOverrides.add(precisionOverrideRow.id);
    return assertions([
      ["scaled amount accepted", !result.error && Boolean(result.data), errorDetail(result)],
      ["amount rounded to four decimals", Number(result.data?.price_amount) === 12.3457, `amount=${result.data?.price_amount}`],
    ]);
  });
}

async function provenanceCases() {
  await test("provenance", "CLP-H40", "all-null optional provenance is accepted", async () => {
    const result = await insertOverride(overridePayload({ reason: "no baseline" }));
    nullProvenanceRow = result.data;
    if (nullProvenanceRow?.id) runtimeOverrides.add(nullProvenanceRow.id);
    const sourceValues = result.data
      ? [
          result.data.source_reference_date,
          result.data.source_commercial_price_table_id,
          result.data.source_commercial_price_table_version_id,
          result.data.source_commercial_price_item_id,
          result.data.source_table_price_amount,
        ]
      : [];
    return assertions([
      ["override accepted", !result.error && Boolean(result.data), errorDetail(result)],
      ["all provenance fields null", sourceValues.length === 5 && sourceValues.every((value) => value === null)],
    ]);
  });

  await test("provenance", "CLP-H41", "partial provenance is rejected by all-or-none integrity", async () => {
    const result = await insertOverride(overridePayload({ source_reference_date: "2026-01-01" }));
    return assertions([["partial provenance rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("provenance", "CLP-H42", "full provenance is rejected on direct insert", async () => {
    const result = await insertOverride(overridePayload({
      catalog_item_id: F.itemA,
      source_reference_date: new Date().toISOString().slice(0, 10),
      source_commercial_price_table_id: F.mainTable,
      source_commercial_price_table_version_id: F.mainVersion,
      source_commercial_price_item_id: F.mainPriceItem,
      source_table_price_amount: 100,
    }));
    return assertions([["direct trusted-shape insert rejected", insertBlocked(result), errorDetail(result)]]);
  });

  await test("provenance", "CLP-H43", "provenance cannot be added by direct draft update", async () => {
    const update = await supabase.from("client_price_overrides").update({
      source_reference_date: new Date().toISOString().slice(0, 10),
      source_commercial_price_table_id: F.mainTable,
      source_commercial_price_table_version_id: F.mainVersion,
      source_commercial_price_item_id: F.mainPriceItem,
      source_table_price_amount: 100,
    }).eq("id", nullProvenanceRow?.id).select("id");
    const current = await supabase.from("client_price_overrides").select("source_reference_date,source_commercial_price_table_id").eq("id", nullProvenanceRow?.id).single();
    return assertions([
      ["direct provenance update blocked", Boolean(update.error) || rows(update).length === 0, errorDetail(update)],
      ["provenance remains null", current.data?.source_reference_date === null && current.data?.source_commercial_price_table_id === null],
    ]);
  });

  await test("provenance", "CLP-H44", "trusted SQL-gate provenance persists as one complete group", async () => {
    const result = await supabase.from("client_price_overrides").select("source_reference_date,source_commercial_price_table_id,source_commercial_price_table_version_id,source_commercial_price_item_id,source_table_price_amount").eq("id", F.provenanceOverride).single();
    return assertions([
      ["trusted proof visible", !result.error && Boolean(result.data), errorDetail(result)],
      ["source table matches", result.data?.source_commercial_price_table_id === F.mainTable],
      ["source version matches", result.data?.source_commercial_price_table_version_id === F.mainVersion],
      ["source item and amount match", result.data?.source_commercial_price_item_id === F.mainPriceItem && Number(result.data?.source_table_price_amount) === 100],
      ["reference date persisted", Boolean(result.data?.source_reference_date)],
    ]);
  });

  await test("provenance", "CLP-H45", "trusted provenance row still uses server-derived item snapshots", async () => {
    const result = await supabase.from("client_price_overrides").select("item_code_snapshot,item_name_snapshot,item_type_snapshot,created_by").eq("id", F.provenanceOverride).single();
    return assertions([
      ["catalog snapshots derived", result.data?.item_code_snapshot === "PRC06B-ITEM-A" && result.data?.item_name_snapshot === "PRC06B Item A" && result.data?.item_type_snapshot === "other_service", errorDetail(result)],
      ["actor derived", result.data?.created_by === actorId],
    ]);
  });

  await test("provenance", "CLP-H46", "provenance chain is structurally and temporally consistent", async () => {
    const proof = await supabase.from("client_price_overrides").select("source_reference_date,source_table_price_amount").eq("id", F.provenanceOverride).single();
    const assignment = await supabase.from("client_commercial_table_assignments").select("commercial_price_table_id,valid_from,valid_to,status").eq("id", F.activeAssignment).single();
    const version = await supabase.from("commercial_price_table_versions").select("commercial_price_table_id,valid_from,valid_to,status").eq("id", F.mainVersion).single();
    const item = await supabase.from("commercial_price_items").select("commercial_price_table_version_id,catalog_item_id,price_amount").eq("id", F.mainPriceItem).single();
    const date = proof.data?.source_reference_date;
    return assertions([
      ["assignment resolves source table", assignment.data?.commercial_price_table_id === F.mainTable && ["active", "scheduled", "superseded"].includes(assignment.data?.status)],
      ["assignment contains reference date", Boolean(date) && assignment.data?.valid_from <= date && (!assignment.data?.valid_to || assignment.data.valid_to > date)],
      ["version belongs to table and contains date", version.data?.commercial_price_table_id === F.mainTable && version.data?.valid_from <= date && (!version.data?.valid_to || version.data.valid_to > date)],
      ["commercial item matches version, catalog and amount", item.data?.commercial_price_table_version_id === F.mainVersion && item.data?.catalog_item_id === F.itemA && Number(item.data?.price_amount) === Number(proof.data?.source_table_price_amount)],
    ]);
  });

  await test("provenance", "CLP-H47", "published trusted provenance is frozen", async () => {
    const update = await supabase.from("client_price_overrides").update({ source_table_price_amount: 99 }).eq("id", F.provenanceOverride).select("id");
    const current = await supabase.from("client_price_overrides").select("status,source_table_price_amount,valid_to").eq("id", F.provenanceOverride).single();
    const scheduled = await supabase.from("client_price_overrides").select("status,valid_from").eq("id", F.scheduledOverride).single();
    return assertions([
      ["provenance mutation blocked", Boolean(update.error) || rows(update).length === 0, errorDetail(update)],
      ["published source amount unchanged", current.data?.status === "active" && Number(current.data?.source_table_price_amount) === 100],
      ["active and scheduled override ranges are adjacent", scheduled.data?.status === "scheduled" && current.data?.valid_to === scheduled.data?.valid_from, errorDetail(scheduled)],
    ]);
  });
}

async function lifecycleCases() {
  await test("lifecycle", "CLP-H48", "draft assignment can be hard-deleted", async () => {
    const deletion = await supabase.from("client_commercial_table_assignments").delete().eq("id", assignmentRow?.id).select("id");
    const current = await supabase.from("client_commercial_table_assignments").select("id").eq("id", assignmentRow?.id);
    if (rows(current).length === 0) runtimeAssignments.delete(assignmentRow?.id);
    return assertions([
      ["draft delete returned one row", !deletion.error && rows(deletion).length === 1, errorDetail(deletion)],
      ["draft is absent", !current.error && rows(current).length === 0, errorDetail(current)],
    ]);
  });

  await test("lifecycle", "CLP-H49", "draft override can be hard-deleted", async () => {
    const deletion = await supabase.from("client_price_overrides").delete().eq("id", overrideRow?.id).select("id");
    const current = await supabase.from("client_price_overrides").select("id").eq("id", overrideRow?.id);
    if (rows(current).length === 0) runtimeOverrides.delete(overrideRow?.id);
    return assertions([
      ["draft delete returned one row", !deletion.error && rows(deletion).length === 1, errorDetail(deletion)],
      ["draft is absent", !current.error && rows(current).length === 0, errorDetail(current)],
    ]);
  });

  await test("lifecycle", "CLP-H50", "non-draft assignment hard-delete is blocked", async () => {
    const deletion = await supabase.from("client_commercial_table_assignments").delete().eq("id", F.activeAssignment).select("id");
    const current = await supabase.from("client_commercial_table_assignments").select("id,status").eq("id", F.activeAssignment).single();
    return assertions([
      ["delete blocked or silently filtered", Boolean(deletion.error) || rows(deletion).length === 0, errorDetail(deletion)],
      ["active assignment persists", !current.error && current.data?.status === "active", errorDetail(current)],
    ]);
  });

  await test("lifecycle", "CLP-H51", "non-draft override hard-delete is blocked", async () => {
    const deletion = await supabase.from("client_price_overrides").delete().eq("id", F.provenanceOverride).select("id");
    const current = await supabase.from("client_price_overrides").select("id,status").eq("id", F.provenanceOverride).single();
    return assertions([
      ["delete blocked or silently filtered", Boolean(deletion.error) || rows(deletion).length === 0, errorDetail(deletion)],
      ["active override persists", !current.error && current.data?.status === "active", errorDetail(current)],
    ]);
  });

  await test("lifecycle", "CLP-H52", "client profile with pricing history cannot be hard-deleted", async () => {
    const deletion = await supabase.from("client_profiles").delete().eq("company_id", F.client).select("company_id");
    const current = await supabase.from("client_profiles").select("company_id,status").eq("company_id", F.client).single();
    return assertions([
      ["history profile delete blocked", Boolean(deletion.error) || rows(deletion).length === 0, errorDetail(deletion)],
      ["profile persists", !current.error && current.data?.company_id === F.client, errorDetail(current)],
    ]);
  });

  await test("lifecycle", "CLP-H53", "mutations emit append-only audit events with derived actor", async () => {
    const profileAudit = await supabase.from("audit_logs").select("id,action,actor_user_id").eq("organization_id", F.mainOrg).eq("entity_type", "client_profile").eq("entity_id", F.profileCandidate).in("action", ["pricing.client.profile.created", "pricing.client.profile.updated", "pricing.client.profile.deleted"]);
    const assignmentAudit = await supabase.from("audit_logs").select("id,action,actor_user_id").eq("organization_id", F.mainOrg).eq("entity_type", "client_commercial_table_assignment").eq("entity_id", F.activeAssignment);
    const actions = new Set(rows(profileAudit).map((row) => row.action));
    const auditId = rows(profileAudit)[0]?.id;
    const updateAudit = auditId ? await supabase.from("audit_logs").update({ action: "tampered" }).eq("id", auditId).select("id") : { data: null, error: new Error("audit fixture missing") };
    const deleteAudit = auditId ? await supabase.from("audit_logs").delete().eq("id", auditId).select("id") : { data: null, error: new Error("audit fixture missing") };
    const persistedAudit = auditId ? await supabase.from("audit_logs").select("id,action").eq("id", auditId).single() : { data: null, error: new Error("audit fixture missing") };
    return assertions([
      ["profile create/update/delete audited", ["pricing.client.profile.created", "pricing.client.profile.updated", "pricing.client.profile.deleted"].every((action) => actions.has(action)), errorDetail(profileAudit)],
      ["assignment lifecycle audited", rows(assignmentAudit).some((row) => row.action === "pricing.client.assignment.published"), errorDetail(assignmentAudit)],
      ["audit actors derived", [...rows(profileAudit), ...rows(assignmentAudit)].length > 0 && [...rows(profileAudit), ...rows(assignmentAudit)].every((row) => row.actor_user_id === actorId)],
      ["audit update blocked", Boolean(updateAudit.error) || rows(updateAudit).length === 0, errorDetail(updateAudit)],
      ["audit delete blocked and row persisted", (Boolean(deleteAudit.error) || rows(deleteAudit).length === 0) && persistedAudit.data?.id === auditId, errorDetail(deleteAudit)],
    ]);
  });
}

async function securityCases() {
  await test("security", "CLP-H54", "foreign no-membership rows are silently filtered from all client tables", async () => {
    const profiles = await supabase.from("client_profiles").select("company_id").eq("organization_id", F.foreignOrg);
    const assignments = await supabase.from("client_commercial_table_assignments").select("id").eq("organization_id", F.foreignOrg);
    const overrides = await supabase.from("client_price_overrides").select("id").eq("organization_id", F.foreignOrg);
    return assertions([
      ["profile read filtered", !profiles.error && rows(profiles).length === 0, errorDetail(profiles)],
      ["assignment read filtered", !assignments.error && rows(assignments).length === 0, errorDetail(assignments)],
      ["override read filtered", !overrides.error && rows(overrides).length === 0, errorDetail(overrides)],
    ]);
  });

  await test("security", "CLP-H55", "foreign no-membership mutation is rejected", async () => {
    const result = await insertAssignment(assignmentPayload({
      organization_id: F.foreignOrg,
      client_company_id: F.foreignClient,
      commercial_price_table_id: F.foreignTable,
    }));
    const visible = await supabase.from("client_commercial_table_assignments").select("id").eq("id", result.data?.id || "00000000-0000-0000-0000-000000000000");
    return assertions([
      ["foreign insert blocked", insertBlocked(result), errorDetail(result)],
      ["no inserted row visible", rows(visible).length === 0, errorDetail(visible)],
    ]);
  });

  await test("security", "CLP-H56", "viewer can read all client-pricing entities", async () => {
    const profiles = await supabase.from("client_profiles").select("company_id").eq("organization_id", F.viewerOrg);
    const assignments = await supabase.from("client_commercial_table_assignments").select("id").eq("organization_id", F.viewerOrg);
    const overrides = await supabase.from("client_price_overrides").select("id").eq("organization_id", F.viewerOrg);
    return assertions([
      ["viewer profile read", !profiles.error && rows(profiles).length === 1, errorDetail(profiles)],
      ["viewer assignment read", !assignments.error && rows(assignments).length === 1, errorDetail(assignments)],
      ["viewer override read", !overrides.error && rows(overrides).length === 1, errorDetail(overrides)],
    ]);
  });

  await test("security", "CLP-H57", "viewer cannot create, edit or delete client pricing", async () => {
    const assignment = await insertAssignment(assignmentPayload({ organization_id: F.viewerOrg, client_company_id: F.viewerClient, commercial_price_table_id: F.viewerTable }));
    const override = await insertOverride(overridePayload({ organization_id: F.viewerOrg, client_company_id: F.viewerClient, catalog_item_id: F.viewerItem }));
    const update = await supabase.from("client_profiles").update({ commercial_notes: "viewer tamper" }).eq("company_id", F.viewerClient).select("company_id");
    const deleteAssignment = await supabase.from("client_commercial_table_assignments").delete().eq("organization_id", F.viewerOrg).select("id");
    const deleteOverride = await supabase.from("client_price_overrides").delete().eq("organization_id", F.viewerOrg).select("id");
    const current = await supabase.from("client_profiles").select("commercial_notes").eq("company_id", F.viewerClient).single();
    return assertions([
      ["viewer assignment create blocked", insertBlocked(assignment), errorDetail(assignment)],
      ["viewer override create blocked", insertBlocked(override), errorDetail(override)],
      ["viewer profile update filtered", Boolean(update.error) || rows(update).length === 0, errorDetail(update)],
      ["viewer deletes filtered", (Boolean(deleteAssignment.error) || rows(deleteAssignment).length === 0) && (Boolean(deleteOverride.error) || rows(deleteOverride).length === 0)],
      ["viewer fixture unchanged", current.data?.commercial_notes === "viewer fixture", errorDetail(current)],
    ]);
  });

  await test("security", "CLP-H58", "operator is also strictly view-only", async () => {
    const profiles = await supabase.from("client_profiles").select("company_id").eq("organization_id", F.operatorOrg);
    const assignments = await supabase.from("client_commercial_table_assignments").select("id").eq("organization_id", F.operatorOrg);
    const overrides = await supabase.from("client_price_overrides").select("id").eq("organization_id", F.operatorOrg);
    const assignment = await insertAssignment(assignmentPayload({ organization_id: F.operatorOrg, client_company_id: F.operatorClient, commercial_price_table_id: F.operatorTable }));
    const override = await insertOverride(overridePayload({ organization_id: F.operatorOrg, client_company_id: F.operatorClient, catalog_item_id: F.operatorItem }));
    const update = await supabase.from("client_profiles").update({ commercial_notes: "operator tamper" }).eq("company_id", F.operatorClient).select("company_id");
    const deletion = await supabase.from("client_commercial_table_assignments").delete().eq("organization_id", F.operatorOrg).select("id");
    return assertions([
      ["operator profile read", !profiles.error && rows(profiles).length === 1, errorDetail(profiles)],
      ["operator assignment and override read", !assignments.error && rows(assignments).length === 1 && !overrides.error && rows(overrides).length === 1],
      ["operator assignment create blocked", insertBlocked(assignment), errorDetail(assignment)],
      ["operator override create blocked", insertBlocked(override), errorDetail(override)],
      ["operator update/delete filtered", (Boolean(update.error) || rows(update).length === 0) && (Boolean(deletion.error) || rows(deletion).length === 0)],
    ]);
  });

  await test("security", "CLP-H59", "manager can create, edit and delete profile and drafts", async () => {
    const canApprove = await supabase.rpc("has_permission", { permission_code: "pricing.client.approve", org_id: F.managerOrg });
    const canPublish = await supabase.rpc("has_permission", { permission_code: "pricing.client.publish", org_id: F.managerOrg });
    const profile = await supabase.from("client_profiles").insert(profilePayload(F.managerCandidate, F.managerOrg, { commercial_notes: "manager runtime" })).select("*").single();
    if (profile.data?.company_id) runtimeProfiles.add(profile.data.company_id);
    const assignment = await insertAssignment(assignmentPayload({ organization_id: F.managerOrg, client_company_id: F.managerCandidate, commercial_price_table_id: F.managerTable }));
    if (assignment.data?.id) runtimeAssignments.add(assignment.data.id);
    const override = await insertOverride(overridePayload({ organization_id: F.managerOrg, client_company_id: F.managerCandidate, catalog_item_id: F.managerItem }));
    if (override.data?.id) runtimeOverrides.add(override.data.id);
    const edit = await supabase.from("client_profiles").update({ commercial_notes: "manager edited" }).eq("company_id", F.managerCandidate).select("commercial_notes").single();
    const deleteOverride = override.data?.id ? await supabase.from("client_price_overrides").delete().eq("id", override.data.id).select("id") : { data: null, error: new Error("override missing") };
    const deleteAssignment = assignment.data?.id ? await supabase.from("client_commercial_table_assignments").delete().eq("id", assignment.data.id).select("id") : { data: null, error: new Error("assignment missing") };
    const deleteProfile = profile.data?.company_id ? await supabase.from("client_profiles").delete().eq("company_id", profile.data.company_id).select("company_id") : { data: null, error: new Error("profile missing") };
    if (rows(deleteOverride).length === 1) runtimeOverrides.delete(override.data.id);
    if (rows(deleteAssignment).length === 1) runtimeAssignments.delete(assignment.data.id);
    if (rows(deleteProfile).length === 1) runtimeProfiles.delete(profile.data.company_id);
    return assertions([
      ["manager profile created", !profile.error && Boolean(profile.data), errorDetail(profile)],
      ["manager drafts created", !assignment.error && Boolean(assignment.data) && !override.error && Boolean(override.data)],
      ["manager profile edited", !edit.error && edit.data?.commercial_notes === "manager edited", errorDetail(edit)],
      ["manager has approve but not publish", canApprove.data === true && canPublish.data === false, `${errorDetail(canApprove)} / ${errorDetail(canPublish)}`],
      ["manager drafts deleted", !deleteOverride.error && rows(deleteOverride).length === 1 && !deleteAssignment.error && rows(deleteAssignment).length === 1],
      ["manager profile deleted", !deleteProfile.error && rows(deleteProfile).length === 1, errorDetail(deleteProfile)],
    ]);
  });

  await test("security", "CLP-H60", "cross-tenant admin scope is visible but relational mixing is rejected", async () => {
    const profiles = await supabase.from("client_profiles").select("company_id").eq("organization_id", F.crossOrg);
    const assignments = await supabase.from("client_commercial_table_assignments").select("id").eq("organization_id", F.crossOrg);
    const overrides = await supabase.from("client_price_overrides").select("id").eq("organization_id", F.crossOrg);
    const mixed = await insertAssignment(assignmentPayload({ organization_id: F.mainOrg, client_company_id: F.crossClient, commercial_price_table_id: F.mainTable }));
    return assertions([
      ["cross admin profile visible", !profiles.error && rows(profiles).length === 1, errorDetail(profiles)],
      ["cross admin assignment visible", !assignments.error && rows(assignments).length === 1, errorDetail(assignments)],
      ["cross admin override visible", !overrides.error && rows(overrides).length === 1, errorDetail(overrides)],
      ["cross-tenant relation rejected despite both memberships", insertBlocked(mixed), errorDetail(mixed)],
    ]);
  });
}

async function cleanup() {
  console.log("\nCleanup runtime drafts");
  let removed = 0;

  for (const id of runtimeOverrides) {
    const current = await supabase.from("client_price_overrides").select("status").eq("id", id).maybeSingle();
    if (current.data?.status === "draft") {
      const deletion = await supabase.from("client_price_overrides").delete().eq("id", id).select("id");
      if (!deletion.error && rows(deletion).length === 1) removed++;
    }
  }
  for (const id of runtimeAssignments) {
    const current = await supabase.from("client_commercial_table_assignments").select("status").eq("id", id).maybeSingle();
    if (current.data?.status === "draft") {
      const deletion = await supabase.from("client_commercial_table_assignments").delete().eq("id", id).select("id");
      if (!deletion.error && rows(deletion).length === 1) removed++;
    }
  }
  for (const companyId of runtimeProfiles) {
    const deletion = await supabase.from("client_profiles").delete().eq("company_id", companyId).select("company_id");
    if (!deletion.error && rows(deletion).length === 1) removed++;
  }
  console.log(`Removed ${removed} runtime draft/profile rows`);
}

function report() {
  const casePassed = results.filter((result) => result.ok).length;
  const caseFailed = results.length - casePassed;
  const allChecks = results.flatMap((result) => result.checks);
  const assertionPassed = allChecks.filter((check) => check.ok).length;
  const assertionFailed = allChecks.length - assertionPassed;

  console.log("\nGroup results (cases and assertions reported separately)");
  for (const [group, title] of Object.entries(GROUPS)) {
    const groupCases = results.filter((result) => result.group === group);
    const groupChecks = groupCases.flatMap((result) => result.checks);
    console.log(
      `${title}: cases ${groupCases.filter((result) => result.ok).length}/${groupCases.length}; assertions ${groupChecks.filter((check) => check.ok).length}/${groupChecks.length}`
    );
  }
  console.log(`Total cases: ${casePassed}/${results.length} passed, ${caseFailed} failed`);
  console.log(`Total assertions: ${assertionPassed}/${allChecks.length} passed, ${assertionFailed} failed`);

  if (results.length !== 60) {
    console.error(`Suite definition error: expected exactly 60 cases, recorded ${results.length}`);
    return 1;
  }
  if (caseFailed > 0) {
    console.error(`Failed cases: ${results.filter((result) => !result.ok).map((result) => result.label).join(", ")}`);
    return 1;
  }
  return 0;
}

async function main() {
  console.log("PRC-06B client pricing integrity remote tests (CLP-H01..CLP-H60)");
  let fatal = null;
  try {
    await authenticate();
    await profileCases();
    await assignmentCases();
    await overrideCases();
    await provenanceCases();
    await lifecycleCases();
    await securityCases();
  } catch (error) {
    fatal = error;
    console.error(`Fatal suite error: ${error?.message || String(error)}`);
  } finally {
    try {
      await cleanup();
    } catch (error) {
      console.error(`Cleanup error: ${error?.message || String(error)}`);
      fatal ||= error;
    }
  }

  const status = report();
  process.exit(fatal ? 1 : status);
}

main();
