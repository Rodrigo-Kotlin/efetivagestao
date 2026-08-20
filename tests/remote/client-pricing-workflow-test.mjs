#!/usr/bin/env node
/**
 * PRC-06C remote workflow and resolver suite (CLW-H01..CLW-H68).
 *
 * Run tests/remote/sql/client_pricing_test_setup.sql as owner first. The setup
 * is the authoritative reset because published workflow history is immutable;
 * this suite only best-effort deletes runtime rows that remain drafts.
 */

import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
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

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const EXPECTED_CASES = 68;
const EXPECTED_ASSERTIONS = 202;

const F = {
  mainOrg: "66666666-6666-6666-6666-666666666661",
  crossOrg: "66666666-6666-6666-6666-666666666662",
  managerOrg: "66666666-6666-6666-6666-666666666663",
  operatorOrg: "66666666-6666-6666-6666-666666666664",
  viewerOrg: "66666666-6666-6666-6666-666666666665",
  foreignOrg: "66666666-6666-6666-6666-666666666666",

  item: "66666666-1000-0000-0000-000000000011",
  zeroItem: "66666666-1000-0000-0000-000000000012",
  missingItem: "66666666-1000-0000-0000-000000000013",
  eligibilityItem: "66666666-1000-0000-0000-000000000014",
  managerItem: "66666666-1000-0000-0000-000000000005",
  operatorItem: "66666666-1000-0000-0000-000000000006",
  viewerItem: "66666666-1000-0000-0000-000000000007",

  profileClient: "66666666-2000-0000-0000-000000000021",
  assignmentFlowClient: "66666666-2000-0000-0000-000000000022",
  assignmentPublishClient: "66666666-2000-0000-0000-000000000023",
  assignmentChainClient: "66666666-2000-0000-0000-000000000024",
  assignmentSyncClient: "66666666-2000-0000-0000-000000000025",
  assignmentRaceClient: "66666666-2000-0000-0000-000000000026",
  assignmentEligibilityClient: "66666666-2000-0000-0000-000000000027",
  overrideFlowClient: "66666666-2000-0000-0000-000000000028",
  overridePublishClient: "66666666-2000-0000-0000-000000000029",
  overrideChainClient: "66666666-2000-0000-0000-00000000002a",
  overrideSyncClient: "66666666-2000-0000-0000-00000000002b",
  overrideRaceClient: "66666666-2000-0000-0000-00000000002c",
  overrideEligibilityClient: "66666666-2000-0000-0000-00000000002d",
  provenanceClient: "66666666-2000-0000-0000-00000000002e",
  resolverNoneClient: "66666666-2000-0000-0000-00000000002f",
  determinismClient: "66666666-2000-0000-0000-000000000030",
  zeroClient: "66666666-2000-0000-0000-000000000031",
  managerClient: "66666666-2000-0000-0000-000000000032",
  inactiveCompany: "66666666-2000-0000-0000-000000000003",
  crossClient: "66666666-2000-0000-0000-000000000005",
  foreignClient: "66666666-2000-0000-0000-000000000009",
  operatorClient: "66666666-2000-0000-0000-000000000007",
  viewerClient: "66666666-2000-0000-0000-000000000008",

  tableA: "66666666-3000-0000-0000-000000000011",
  tableB: "66666666-3000-0000-0000-000000000012",
  missingTable: "66666666-3000-0000-0000-000000000013",
  eligibilityTable: "66666666-3000-0000-0000-000000000014",
  versionA: "66666666-3000-0000-0000-000000000021",
  priceA: "66666666-3000-0000-0000-000000000031",
  managerTable: "66666666-3000-0000-0000-000000000005",
  operatorTable: "66666666-3000-0000-0000-000000000006",
  viewerTable: "66666666-3000-0000-0000-000000000007",

  chainAssignmentHistory: "66666666-4000-0000-0000-000000000011",
  chainAssignmentCurrent: "66666666-4000-0000-0000-000000000012",
  chainAssignmentFuture: "66666666-4000-0000-0000-000000000013",
  syncAssignmentPrevious: "66666666-4000-0000-0000-000000000014",
  syncAssignmentDue: "66666666-4000-0000-0000-000000000015",
  deterministicAssignment: "66666666-4000-0000-0000-000000000017",
  eligibilityAssignment: "66666666-4000-0000-0000-000000000019",

  chainOverrideHistory: "66666666-5000-0000-0000-000000000011",
  chainOverrideCurrent: "66666666-5000-0000-0000-000000000012",
  chainOverrideFuture: "66666666-5000-0000-0000-000000000013",
  syncOverridePrevious: "66666666-5000-0000-0000-000000000014",
  syncOverrideDue: "66666666-5000-0000-0000-000000000015",
  zeroOverride: "66666666-5000-0000-0000-000000000016",
  deterministicOverride: "66666666-5000-0000-0000-000000000018",
  eligibilityOverride: "66666666-5000-0000-0000-000000000019",
};

const GROUPS = {
  profile: "Profile status",
  assignment: "Assignment workflow",
  override: "Override workflow",
  resolver: "Resolvers",
  sync: "Sync",
  provenance: "Provenance",
  security: "RBAC and exposure",
};

const today = new Date().toISOString().slice(0, 10);
const results = [];
const runtimeAssignments = new Set();
const runtimeOverrides = new Set();
let actorId;

function addDays(days) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function checks(entries) {
  return entries.map(([name, ok, detail = ""]) => ({ name, ok: Boolean(ok), detail }));
}

function detail(result) {
  return result?.error?.message || "no database error";
}

function failed(result, text = null) {
  return Boolean(result?.error) && (!text || result.error.message.includes(text));
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

async function rpc(name, args) {
  return supabase.rpc(name, args);
}

async function assignmentRow(id) {
  return supabase.from("client_commercial_table_assignments").select("*").eq("id", id).single();
}

async function overrideRow(id) {
  return supabase.from("client_price_overrides").select("*").eq("id", id).single();
}

async function createAssignment({
  organizationId = F.mainOrg,
  clientId,
  tableId = F.tableA,
  validFrom = addDays(40),
  validTo = null,
  notes = "PRC06C runtime assignment",
}) {
  const id = randomUUID();
  const result = await supabase
    .from("client_commercial_table_assignments")
    .insert({
      id,
      organization_id: organizationId,
      client_company_id: clientId,
      commercial_price_table_id: tableId,
      status: "draft",
      valid_from: validFrom,
      valid_to: validTo,
      notes,
    })
    .select("*")
    .single();
  if (!result.error) runtimeAssignments.add(id);
  return { id, ...result };
}

async function createOverride({
  organizationId = F.mainOrg,
  clientId,
  itemId = F.item,
  price = 111,
  validFrom = addDays(40),
  validTo = null,
  reason = "PRC06C runtime override",
}) {
  const id = randomUUID();
  const result = await supabase
    .from("client_price_overrides")
    .insert({
      id,
      organization_id: organizationId,
      client_company_id: clientId,
      catalog_item_id: itemId,
      price_amount: price,
      currency: "BRL",
      reason,
      status: "draft",
      valid_from: validFrom,
      valid_to: validTo,
      item_code_snapshot: "untrusted",
      item_name_snapshot: "untrusted",
      item_type_snapshot: "untrusted",
    })
    .select("*")
    .single();
  if (!result.error) runtimeOverrides.add(id);
  return { id, ...result };
}

async function approveAssignment(id) {
  const submit = await rpc("fn_submit_client_assignment", { p_assignment_id: id });
  const approve = submit.error
    ? { data: null, error: submit.error }
    : await rpc("fn_approve_client_assignment", { p_assignment_id: id });
  return { submit, approve };
}

async function approveOverride(id) {
  const submit = await rpc("fn_submit_client_price_override", { p_override_id: id });
  const approve = submit.error
    ? { data: null, error: submit.error }
    : await rpc("fn_approve_client_price_override", { p_override_id: id });
  return { submit, approve };
}

async function resolveAssignment(organizationId, clientId, referenceDate = today) {
  return rpc("fn_resolve_client_table_assignment", {
    p_organization_id: organizationId,
    p_client_company_id: clientId,
    p_reference_date: referenceDate,
  });
}

async function resolveOverride(organizationId, clientId, itemId, referenceDate = today) {
  return rpc("fn_resolve_client_price_override", {
    p_organization_id: organizationId,
    p_client_company_id: clientId,
    p_catalog_item_id: itemId,
    p_reference_date: referenceDate,
  });
}

async function authenticate() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error || !data.user) throw new Error(`Authentication failed: ${error?.message || "no user"}`);
  actorId = data.user.id;
}

async function profileCases() {
  await test("profile", "CLW-H01", "blocked status trims reason and derives actor", 3, async () => {
    const change = await rpc("fn_set_client_profile_status", {
      p_client_company_id: F.profileClient,
      p_status: "blocked",
      p_reason: "  credit hold  ",
    });
    const row = await supabase.from("client_profiles").select("status,status_reason,updated_by").eq("company_id", F.profileClient).single();
    return checks([
      ["RPC accepted", !change.error, detail(change)],
      ["status and trimmed reason persisted", row.data?.status === "blocked" && row.data?.status_reason === "credit hold", detail(row)],
      ["updated actor derived", row.data?.updated_by === actorId],
    ]);
  });

  await test("profile", "CLW-H02", "same-status request is a rejected no-op", 2, async () => {
    const before = await supabase.from("client_profiles").select("status_reason,updated_at").eq("company_id", F.profileClient).single();
    const change = await rpc("fn_set_client_profile_status", {
      p_client_company_id: F.profileClient,
      p_status: "blocked",
      p_reason: "different",
    });
    const after = await supabase.from("client_profiles").select("status_reason,updated_at").eq("company_id", F.profileClient).single();
    return checks([
      ["same status rejected", failed(change, "already in requested status"), detail(change)],
      ["row unchanged", before.data?.status_reason === after.data?.status_reason && before.data?.updated_at === after.data?.updated_at],
    ]);
  });

  await test("profile", "CLW-H03", "status change requires a nonblank reason", 2, async () => {
    const change = await rpc("fn_set_client_profile_status", {
      p_client_company_id: F.profileClient,
      p_status: "inactive",
      p_reason: "   ",
    });
    const row = await supabase.from("client_profiles").select("status").eq("company_id", F.profileClient).single();
    return checks([
      ["blank reason rejected", failed(change, "non-empty status reason"), detail(change)],
      ["blocked status retained", row.data?.status === "blocked", detail(row)],
    ]);
  });

  await test("profile", "CLW-H04", "blocked profile can be reactivated", 3, async () => {
    const change = await rpc("fn_set_client_profile_status", {
      p_client_company_id: F.profileClient,
      p_status: "active",
      p_reason: "  cleared  ",
    });
    const row = await supabase.from("client_profiles").select("status,status_reason,updated_by").eq("company_id", F.profileClient).single();
    return checks([
      ["reactivation accepted", !change.error, detail(change)],
      ["active with new reason", row.data?.status === "active" && row.data?.status_reason === "cleared", detail(row)],
      ["reactivation actor derived", row.data?.updated_by === actorId],
    ]);
  });

  await test("profile", "CLW-H05", "inactive company blocks profile reactivation", 3, async () => {
    const inactivate = await rpc("fn_set_client_profile_status", {
      p_client_company_id: F.inactiveCompany,
      p_status: "inactive",
      p_reason: "company inactive",
    });
    const reactivate = await rpc("fn_set_client_profile_status", {
      p_client_company_id: F.inactiveCompany,
      p_status: "active",
      p_reason: "not allowed",
    });
    const row = await supabase.from("client_profiles").select("status").eq("company_id", F.inactiveCompany).single();
    return checks([
      ["profile inactivated", !inactivate.error, detail(inactivate)],
      ["reactivation rejected", failed(reactivate, "requires an active company"), detail(reactivate)],
      ["inactive status retained", row.data?.status === "inactive", detail(row)],
    ]);
  });

  await test("profile", "CLW-H06", "missing and foreign profiles share not-found behavior", 2, async () => {
    const missing = await rpc("fn_set_client_profile_status", {
      p_client_company_id: randomUUID(),
      p_status: "blocked",
      p_reason: "missing",
    });
    const cross = await rpc("fn_set_client_profile_status", {
      p_client_company_id: F.foreignClient,
      p_status: "blocked",
      p_reason: "foreign tenant",
    });
    return checks([
      ["missing profile hidden", failed(missing, "Client profile not found"), detail(missing)],
      ["cross profile uses same response", failed(cross, "Client profile not found"), detail(cross)],
    ]);
  });
}

let assignmentFlowId;

async function assignmentCases() {
  await test("assignment", "CLW-H07", "assignment submit derives review metadata", 3, async () => {
    const created = await createAssignment({ clientId: F.assignmentFlowClient });
    assignmentFlowId = created.id;
    const submit = await rpc("fn_submit_client_assignment", { p_assignment_id: created.id });
    const row = await assignmentRow(created.id);
    return checks([
      ["draft created and submitted", !created.error && !submit.error, `${detail(created)} / ${detail(submit)}`],
      ["status under review", row.data?.status === "under_review", detail(row)],
      ["submit actor and timestamp derived", row.data?.submitted_by === actorId && Boolean(row.data?.submitted_at)],
    ]);
  });

  await test("assignment", "CLW-H08", "under-review assignment returns to draft", 3, async () => {
    const returned = await rpc("fn_return_client_assignment_to_draft", { p_assignment_id: assignmentFlowId });
    const row = await assignmentRow(assignmentFlowId);
    return checks([
      ["return accepted", !returned.error, detail(returned)],
      ["draft restored", row.data?.status === "draft", detail(row)],
      ["prior submission remains attributable", row.data?.submitted_by === actorId && Boolean(row.data?.submitted_at)],
    ]);
  });

  await test("assignment", "CLW-H09", "resubmitted assignment can be approved", 3, async () => {
    const flow = await approveAssignment(assignmentFlowId);
    const row = await assignmentRow(assignmentFlowId);
    return checks([
      ["submit and approve accepted", !flow.submit.error && !flow.approve.error, `${detail(flow.submit)} / ${detail(flow.approve)}`],
      ["approved status persisted", row.data?.status === "approved", detail(row)],
      ["approval actor and timestamp derived", row.data?.approved_by === actorId && Boolean(row.data?.approved_at)],
    ]);
  });

  await test("assignment", "CLW-H10", "draft assignment cancellation is terminal", 2, async () => {
    const created = await createAssignment({ clientId: F.assignmentFlowClient, validFrom: addDays(41) });
    const cancel = await rpc("fn_cancel_client_assignment", { p_assignment_id: created.id });
    const row = await assignmentRow(created.id);
    return checks([
      ["draft cancelled", !cancel.error && row.data?.status === "cancelled", detail(cancel)],
      ["cancellation metadata derived", row.data?.cancelled_by === actorId && Boolean(row.data?.cancelled_at)],
    ]);
  });

  await test("assignment", "CLW-H11", "under-review assignment can be cancelled", 2, async () => {
    const created = await createAssignment({ clientId: F.assignmentFlowClient, validFrom: addDays(42) });
    const submit = await rpc("fn_submit_client_assignment", { p_assignment_id: created.id });
    const cancel = await rpc("fn_cancel_client_assignment", { p_assignment_id: created.id });
    const row = await assignmentRow(created.id);
    return checks([
      ["review then cancel accepted", !submit.error && !cancel.error, `${detail(submit)} / ${detail(cancel)}`],
      ["cancelled with actor", row.data?.status === "cancelled" && row.data?.cancelled_by === actorId, detail(row)],
    ]);
  });

  await test("assignment", "CLW-H12", "approved assignment can be cancelled", 2, async () => {
    const cancel = await rpc("fn_cancel_client_assignment", { p_assignment_id: assignmentFlowId });
    const row = await assignmentRow(assignmentFlowId);
    return checks([
      ["approved cancellation accepted", !cancel.error, detail(cancel)],
      ["approved row became cancelled", row.data?.status === "cancelled" && row.data?.cancelled_by === actorId, detail(row)],
    ]);
  });

  await test("assignment", "CLW-H13", "cancelled assignment cannot be resubmitted", 2, async () => {
    const submit = await rpc("fn_submit_client_assignment", { p_assignment_id: assignmentFlowId });
    const row = await assignmentRow(assignmentFlowId);
    return checks([
      ["terminal resubmit rejected", failed(submit, "Only draft"), detail(submit)],
      ["cancelled status unchanged", row.data?.status === "cancelled", detail(row)],
    ]);
  });

  await test("assignment", "CLW-H14", "submit rechecks inactive table eligibility", 2, async () => {
    const submit = await rpc("fn_submit_client_assignment", { p_assignment_id: F.eligibilityAssignment });
    const row = await assignmentRow(F.eligibilityAssignment);
    return checks([
      ["inactive dependency rejected", failed(submit, "requires an active company"), detail(submit)],
      ["eligibility draft unchanged", row.data?.status === "draft", detail(row)],
    ]);
  });

  await test("assignment", "CLW-H15", "immediate assignment publication becomes active", 4, async () => {
    const created = await createAssignment({ clientId: F.assignmentPublishClient, validFrom: today });
    const flow = await approveAssignment(created.id);
    const publish = await rpc("fn_publish_client_assignment", { p_assignment_id: created.id });
    const row = await assignmentRow(created.id);
    return checks([
      ["draft approved", !created.error && !flow.submit.error && !flow.approve.error],
      ["publish accepted", !publish.error, detail(publish)],
      ["current publication active", row.data?.status === "active" && row.data?.valid_from === today, detail(row)],
      ["publisher metadata derived", row.data?.published_by === actorId && Boolean(row.data?.published_at)],
    ]);
  });

  await test("assignment", "CLW-H16", "future assignment publication becomes scheduled", 3, async () => {
    const created = await createAssignment({ clientId: F.assignmentPublishClient, tableId: F.tableB, validFrom: addDays(20) });
    const flow = await approveAssignment(created.id);
    const publish = await rpc("fn_publish_client_assignment", { p_assignment_id: created.id });
    const row = await assignmentRow(created.id);
    return checks([
      ["future flow accepted", !created.error && !flow.submit.error && !flow.approve.error && !publish.error, detail(publish)],
      ["future publication scheduled", row.data?.status === "scheduled" && row.data?.valid_from === addDays(20), detail(row)],
      ["scheduled publisher derived", row.data?.published_by === actorId && Boolean(row.data?.published_at)],
    ]);
  });

  await test("assignment", "CLW-H17", "future publication closes its active predecessor", 2, async () => {
    const rows = await supabase.from("client_commercial_table_assignments").select("status,valid_from,valid_to").eq("client_company_id", F.assignmentPublishClient).order("valid_from");
    return checks([
      ["two published timeline rows visible", !rows.error && rows.data?.length === 2, detail(rows)],
      ["predecessor closes at successor", rows.data?.[0]?.status === "active" && rows.data?.[0]?.valid_to === addDays(20) && rows.data?.[1]?.status === "scheduled"],
    ]);
  });

  await test("assignment", "CLW-H18", "assignment can be inserted between published schedules", 4, async () => {
    const created = await createAssignment({ clientId: F.assignmentChainClient, tableId: F.tableB, validFrom: addDays(5) });
    const flow = await approveAssignment(created.id);
    const publish = await rpc("fn_publish_client_assignment", { p_assignment_id: created.id });
    const inserted = await assignmentRow(created.id);
    const predecessor = await assignmentRow(F.chainAssignmentCurrent);
    return checks([
      ["middle publication accepted", !created.error && !flow.submit.error && !flow.approve.error && !publish.error, detail(publish)],
      ["middle row scheduled", inserted.data?.status === "scheduled", detail(inserted)],
      ["middle row ends at existing successor", inserted.data?.valid_to === addDays(10)],
      ["predecessor shortened to middle start", predecessor.data?.valid_to === addDays(5), detail(predecessor)],
    ]);
  });

  await test("assignment", "CLW-H19", "retroactive assignment publication is rejected", 2, async () => {
    const created = await createAssignment({ clientId: F.assignmentFlowClient, validFrom: addDays(-1) });
    const flow = await approveAssignment(created.id);
    const publish = await rpc("fn_publish_client_assignment", { p_assignment_id: created.id });
    const row = await assignmentRow(created.id);
    return checks([
      ["retroactive publish rejected", !created.error && !flow.submit.error && !flow.approve.error && failed(publish, "Retroactive"), detail(publish)],
      ["approved row retained", row.data?.status === "approved", detail(row)],
    ]);
  });

  await test("assignment", "CLW-H20", "concurrent assignment publication has one winner", 4, async () => {
    const first = await createAssignment({ clientId: F.assignmentRaceClient, validFrom: today, notes: "race A" });
    const second = await createAssignment({ clientId: F.assignmentRaceClient, tableId: F.tableB, validFrom: today, notes: "race B" });
    const [flowA, flowB] = await Promise.all([approveAssignment(first.id), approveAssignment(second.id)]);
    const publications = await Promise.all([
      rpc("fn_publish_client_assignment", { p_assignment_id: first.id }),
      rpc("fn_publish_client_assignment", { p_assignment_id: second.id }),
    ]);
    const rows = await supabase.from("client_commercial_table_assignments").select("status").eq("client_company_id", F.assignmentRaceClient);
    const winners = publications.filter((result) => !result.error).length;
    return checks([
      ["both candidates approved", !flowA.approve.error && !flowB.approve.error],
      ["exactly one publish succeeded", winners === 1, publications.map(detail).join(" / ")],
      ["exactly one active row persisted", rows.data?.filter((row) => row.status === "active").length === 1, detail(rows)],
      ["loser remains approved", rows.data?.filter((row) => row.status === "approved").length === 1],
    ]);
  });
}

let overrideFlowId;

async function overrideCases() {
  await test("override", "CLW-H21", "override submit derives review metadata", 3, async () => {
    const created = await createOverride({ clientId: F.overrideFlowClient });
    overrideFlowId = created.id;
    const submit = await rpc("fn_submit_client_price_override", { p_override_id: created.id });
    const row = await overrideRow(created.id);
    return checks([
      ["draft created and submitted", !created.error && !submit.error, `${detail(created)} / ${detail(submit)}`],
      ["status under review", row.data?.status === "under_review", detail(row)],
      ["submit metadata derived", row.data?.submitted_by === actorId && Boolean(row.data?.submitted_at)],
    ]);
  });

  await test("override", "CLW-H22", "under-review override returns to draft", 3, async () => {
    const returned = await rpc("fn_return_client_price_override_to_draft", { p_override_id: overrideFlowId });
    const row = await overrideRow(overrideFlowId);
    return checks([
      ["return accepted", !returned.error, detail(returned)],
      ["draft restored", row.data?.status === "draft", detail(row)],
      ["submission remains attributable", row.data?.submitted_by === actorId && Boolean(row.data?.submitted_at)],
    ]);
  });

  await test("override", "CLW-H23", "resubmitted override can be approved", 3, async () => {
    const flow = await approveOverride(overrideFlowId);
    const row = await overrideRow(overrideFlowId);
    return checks([
      ["submit and approve accepted", !flow.submit.error && !flow.approve.error, `${detail(flow.submit)} / ${detail(flow.approve)}`],
      ["approved status persisted", row.data?.status === "approved", detail(row)],
      ["approval metadata derived", row.data?.approved_by === actorId && Boolean(row.data?.approved_at)],
    ]);
  });

  await test("override", "CLW-H24", "draft override cancellation is terminal", 2, async () => {
    const created = await createOverride({ clientId: F.overrideFlowClient, validFrom: addDays(41) });
    const cancel = await rpc("fn_cancel_client_price_override", { p_override_id: created.id });
    const row = await overrideRow(created.id);
    return checks([
      ["draft cancelled", !cancel.error && row.data?.status === "cancelled", detail(cancel)],
      ["cancellation metadata derived", row.data?.cancelled_by === actorId && Boolean(row.data?.cancelled_at)],
    ]);
  });

  await test("override", "CLW-H25", "under-review override can be cancelled", 2, async () => {
    const created = await createOverride({ clientId: F.overrideFlowClient, validFrom: addDays(42) });
    const submit = await rpc("fn_submit_client_price_override", { p_override_id: created.id });
    const cancel = await rpc("fn_cancel_client_price_override", { p_override_id: created.id });
    const row = await overrideRow(created.id);
    return checks([
      ["review then cancel accepted", !submit.error && !cancel.error, `${detail(submit)} / ${detail(cancel)}`],
      ["cancelled with actor", row.data?.status === "cancelled" && row.data?.cancelled_by === actorId, detail(row)],
    ]);
  });

  await test("override", "CLW-H26", "approved override can be cancelled", 2, async () => {
    const cancel = await rpc("fn_cancel_client_price_override", { p_override_id: overrideFlowId });
    const row = await overrideRow(overrideFlowId);
    return checks([
      ["approved cancellation accepted", !cancel.error, detail(cancel)],
      ["approved row became cancelled", row.data?.status === "cancelled" && row.data?.cancelled_by === actorId, detail(row)],
    ]);
  });

  await test("override", "CLW-H27", "cancelled override cannot be resubmitted", 2, async () => {
    const submit = await rpc("fn_submit_client_price_override", { p_override_id: overrideFlowId });
    const row = await overrideRow(overrideFlowId);
    return checks([
      ["terminal resubmit rejected", failed(submit, "Only draft"), detail(submit)],
      ["cancelled status unchanged", row.data?.status === "cancelled", detail(row)],
    ]);
  });

  await test("override", "CLW-H28", "submit rechecks inactive item eligibility", 2, async () => {
    const submit = await rpc("fn_submit_client_price_override", { p_override_id: F.eligibilityOverride });
    const row = await overrideRow(F.eligibilityOverride);
    return checks([
      ["inactive item rejected", failed(submit, "requires an active company"), detail(submit)],
      ["eligibility draft unchanged", row.data?.status === "draft", detail(row)],
    ]);
  });

  await test("override", "CLW-H29", "immediate override publication becomes active", 4, async () => {
    const created = await createOverride({ clientId: F.overridePublishClient, validFrom: today, price: 88 });
    const flow = await approveOverride(created.id);
    const publish = await rpc("fn_publish_client_price_override", { p_override_id: created.id });
    const row = await overrideRow(created.id);
    return checks([
      ["draft approved", !created.error && !flow.submit.error && !flow.approve.error],
      ["publish accepted", !publish.error, detail(publish)],
      ["current publication active", row.data?.status === "active" && row.data?.valid_from === today, detail(row)],
      ["publisher metadata derived", row.data?.published_by === actorId && Boolean(row.data?.published_at)],
    ]);
  });

  await test("override", "CLW-H30", "future override publication becomes scheduled", 3, async () => {
    const created = await createOverride({ clientId: F.overridePublishClient, validFrom: addDays(20), price: 89 });
    const flow = await approveOverride(created.id);
    const publish = await rpc("fn_publish_client_price_override", { p_override_id: created.id });
    const row = await overrideRow(created.id);
    return checks([
      ["future flow accepted", !created.error && !flow.submit.error && !flow.approve.error && !publish.error, detail(publish)],
      ["future publication scheduled", row.data?.status === "scheduled" && row.data?.valid_from === addDays(20), detail(row)],
      ["scheduled publisher derived", row.data?.published_by === actorId && Boolean(row.data?.published_at)],
    ]);
  });

  await test("override", "CLW-H31", "future override closes its active predecessor", 2, async () => {
    const rows = await supabase.from("client_price_overrides").select("status,valid_from,valid_to").eq("client_company_id", F.overridePublishClient).eq("catalog_item_id", F.item).order("valid_from");
    return checks([
      ["two published timeline rows visible", !rows.error && rows.data?.length === 2, detail(rows)],
      ["predecessor closes at successor", rows.data?.[0]?.status === "active" && rows.data?.[0]?.valid_to === addDays(20) && rows.data?.[1]?.status === "scheduled"],
    ]);
  });

  await test("override", "CLW-H32", "override can be inserted between published schedules", 4, async () => {
    const created = await createOverride({ clientId: F.overrideChainClient, validFrom: addDays(5), price: 87 });
    const flow = await approveOverride(created.id);
    const publish = await rpc("fn_publish_client_price_override", { p_override_id: created.id });
    const inserted = await overrideRow(created.id);
    const predecessor = await overrideRow(F.chainOverrideCurrent);
    return checks([
      ["middle publication accepted", !created.error && !flow.submit.error && !flow.approve.error && !publish.error, detail(publish)],
      ["middle row scheduled", inserted.data?.status === "scheduled", detail(inserted)],
      ["middle row ends at existing successor", inserted.data?.valid_to === addDays(10)],
      ["predecessor shortened to middle start", predecessor.data?.valid_to === addDays(5), detail(predecessor)],
    ]);
  });

  await test("override", "CLW-H33", "retroactive override publication is rejected", 2, async () => {
    const created = await createOverride({ clientId: F.overrideFlowClient, validFrom: addDays(-1) });
    const flow = await approveOverride(created.id);
    const publish = await rpc("fn_publish_client_price_override", { p_override_id: created.id });
    const row = await overrideRow(created.id);
    return checks([
      ["retroactive publish rejected", !created.error && !flow.submit.error && !flow.approve.error && failed(publish, "Retroactive"), detail(publish)],
      ["approved row retained", row.data?.status === "approved", detail(row)],
    ]);
  });

  await test("override", "CLW-H34", "concurrent override publication has one winner", 4, async () => {
    const first = await createOverride({ clientId: F.overrideRaceClient, validFrom: today, price: 70, reason: "race A" });
    const second = await createOverride({ clientId: F.overrideRaceClient, validFrom: today, price: 71, reason: "race B" });
    const [flowA, flowB] = await Promise.all([approveOverride(first.id), approveOverride(second.id)]);
    const publications = await Promise.all([
      rpc("fn_publish_client_price_override", { p_override_id: first.id }),
      rpc("fn_publish_client_price_override", { p_override_id: second.id }),
    ]);
    const rows = await supabase.from("client_price_overrides").select("status").eq("client_company_id", F.overrideRaceClient).eq("catalog_item_id", F.item);
    return checks([
      ["both candidates approved", !flowA.approve.error && !flowB.approve.error],
      ["exactly one publish succeeded", publications.filter((result) => !result.error).length === 1, publications.map(detail).join(" / ")],
      ["exactly one active row persisted", rows.data?.filter((row) => row.status === "active").length === 1, detail(rows)],
      ["loser remains approved", rows.data?.filter((row) => row.status === "approved").length === 1],
    ]);
  });
}

async function resolverCases() {
  await test("resolver", "CLW-H35", "assignment resolver returns exact current component", 3, async () => {
    const result = await resolveAssignment(F.mainOrg, F.assignmentChainClient, today);
    return checks([
      ["current assignment resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["exact current row selected", result.data?.assignment?.id === F.chainAssignmentCurrent && result.data?.assignment?.status === "active"],
      ["component has no table or company names", !JSON.stringify(result.data).includes("PRC06C Workflow") && result.data?.client?.company_id === F.assignmentChainClient],
    ]);
  });

  await test("resolver", "CLW-H36", "assignment resolver returns scheduled future component", 2, async () => {
    const result = await resolveAssignment(F.mainOrg, F.assignmentChainClient, addDays(12));
    return checks([
      ["future assignment resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["future fixture selected", result.data?.assignment?.id === F.chainAssignmentFuture && result.data?.assignment?.status === "scheduled"],
    ]);
  });

  await test("resolver", "CLW-H37", "assignment resolver returns historical superseded component", 2, async () => {
    const result = await resolveAssignment(F.mainOrg, F.assignmentChainClient, addDays(-15));
    return checks([
      ["historical assignment resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["historical fixture selected", result.data?.assignment?.id === F.chainAssignmentHistory && result.data?.assignment?.status === "superseded"],
    ]);
  });

  await test("resolver", "CLW-H38", "assignment resolver distinguishes no assignment", 3, async () => {
    const result = await resolveAssignment(F.mainOrg, F.resolverNoneClient, today);
    return checks([
      ["request succeeds", !result.error, detail(result)],
      ["assignment-not-found status exact", result.data?.status === "ASSIGNMENT_NOT_FOUND"],
      ["known client status returned without names", result.data?.client?.client_profile_status === "active" && !JSON.stringify(result.data).includes("WF Resolver Empty")],
    ]);
  });

  await test("resolver", "CLW-H39", "assignment resolver distinguishes missing client", 2, async () => {
    const missingId = randomUUID();
    const result = await resolveAssignment(F.mainOrg, missingId, today);
    return checks([
      ["missing request succeeds", !result.error, detail(result)],
      ["client-not-found status exact", result.data?.status === "CLIENT_NOT_FOUND" && result.data?.client_company_id === missingId],
    ]);
  });

  await test("resolver", "CLW-H40", "assignment tie-break is deterministic", 2, async () => {
    const first = await resolveAssignment(F.mainOrg, F.determinismClient, today);
    const second = await resolveAssignment(F.mainOrg, F.determinismClient, today);
    return checks([
      ["higher UUID fixture wins exact tie", first.data?.assignment?.id === F.deterministicAssignment, detail(first)],
      ["repeat returns identical JSON", !second.error && JSON.stringify(first.data) === JSON.stringify(second.data), detail(second)],
    ]);
  });

  await test("resolver", "CLW-H41", "override resolver returns exact current component", 4, async () => {
    const result = await resolveOverride(F.mainOrg, F.overrideChainClient, F.item, today);
    return checks([
      ["current override resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["exact current row selected", result.data?.override?.id === F.chainOverrideCurrent && result.data?.override?.status === "active"],
      ["price and currency exact", Number(result.data?.price_amount) === 85 && result.data?.currency === "BRL"],
      ["component exposes snapshots but no live names", result.data?.item?.item_name_snapshot === "PRC06C Workflow Item" && !Object.hasOwn(result.data?.client || {}, "company_name")],
    ]);
  });

  await test("resolver", "CLW-H42", "override resolver returns scheduled future component", 2, async () => {
    const result = await resolveOverride(F.mainOrg, F.overrideChainClient, F.item, addDays(12));
    return checks([
      ["future override resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["future fixture selected", result.data?.override?.id === F.chainOverrideFuture && result.data?.override?.status === "scheduled"],
    ]);
  });

  await test("resolver", "CLW-H43", "override resolver returns historical superseded component", 2, async () => {
    const result = await resolveOverride(F.mainOrg, F.overrideChainClient, F.item, addDays(-15));
    return checks([
      ["historical override resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["historical fixture selected", result.data?.override?.id === F.chainOverrideHistory && result.data?.override?.status === "superseded"],
    ]);
  });

  await test("resolver", "CLW-H44", "override resolver distinguishes item and override absence", 4, async () => {
    const missingId = randomUUID();
    const missingItem = await resolveOverride(F.mainOrg, F.resolverNoneClient, missingId, today);
    const missingOverride = await resolveOverride(F.mainOrg, F.resolverNoneClient, F.item, today);
    return checks([
      ["missing item request succeeds", !missingItem.error, detail(missingItem)],
      ["item-not-found status exact", missingItem.data?.status === "ITEM_NOT_FOUND"],
      ["missing override request succeeds", !missingOverride.error, detail(missingOverride)],
      ["override-not-found status exact", missingOverride.data?.status === "OVERRIDE_NOT_FOUND" && missingOverride.data?.item?.status === "active"],
    ]);
  });

  await test("resolver", "CLW-H45", "override tie-break is deterministic", 3, async () => {
    const first = await resolveOverride(F.mainOrg, F.determinismClient, F.item, today);
    const second = await resolveOverride(F.mainOrg, F.determinismClient, F.item, today);
    return checks([
      ["higher UUID fixture wins exact tie", first.data?.override?.id === F.deterministicOverride, detail(first)],
      ["winning explicit price returned", Number(first.data?.price_amount) === 102],
      ["repeat returns identical JSON", !second.error && JSON.stringify(first.data) === JSON.stringify(second.data), detail(second)],
    ]);
  });

  await test("resolver", "CLW-H46", "explicit zero is resolved rather than treated as missing", 3, async () => {
    const result = await resolveOverride(F.mainOrg, F.zeroClient, F.zeroItem, today);
    return checks([
      ["zero override resolved", !result.error && result.data?.status === "RESOLVED", detail(result)],
      ["zero row selected", result.data?.override?.id === F.zeroOverride],
      ["numeric zero preserved", Number(result.data?.price_amount) === 0],
    ]);
  });
}

async function syncCases() {
  await test("sync", "CLW-H47", "due assignment blocks a new publication", 2, async () => {
    const created = await createAssignment({ clientId: F.assignmentSyncClient, validFrom: today });
    const flow = await approveAssignment(created.id);
    const publish = await rpc("fn_publish_client_assignment", { p_assignment_id: created.id });
    return checks([
      ["candidate reached approved", !created.error && !flow.submit.error && !flow.approve.error],
      ["due schedule blocks publish", failed(publish, "run assignment status sync"), detail(publish)],
    ]);
  });

  await test("sync", "CLW-H48", "assignment sync activates due row and supersedes predecessor", 4, async () => {
    const sync = await rpc("fn_sync_client_assignment_status", { p_reference_date: today });
    const previous = await assignmentRow(F.syncAssignmentPrevious);
    const due = await assignmentRow(F.syncAssignmentDue);
    return checks([
      ["one due assignment processed", !sync.error && sync.data === 1, `${detail(sync)} count=${sync.data}`],
      ["due assignment active", due.data?.status === "active", detail(due)],
      ["closed predecessor superseded", previous.data?.status === "superseded", detail(previous)],
      ["sync metadata attributed", due.data?.published_by === actorId && previous.data?.superseded_by === actorId],
    ]);
  });

  await test("sync", "CLW-H49", "assignment sync is idempotent", 3, async () => {
    const sync = await rpc("fn_sync_client_assignment_status", { p_reference_date: today });
    const due = await assignmentRow(F.syncAssignmentDue);
    return checks([
      ["second sync succeeds", !sync.error, detail(sync)],
      ["second sync processes zero", sync.data === 0, `count=${sync.data}`],
      ["active row remains active", due.data?.status === "active", detail(due)],
    ]);
  });

  await test("sync", "CLW-H50", "due override blocks a new publication", 2, async () => {
    const created = await createOverride({ clientId: F.overrideSyncClient, validFrom: today, price: 103 });
    const flow = await approveOverride(created.id);
    const publish = await rpc("fn_publish_client_price_override", { p_override_id: created.id });
    return checks([
      ["candidate reached approved", !created.error && !flow.submit.error && !flow.approve.error],
      ["due schedule blocks publish", failed(publish, "run override status sync"), detail(publish)],
    ]);
  });

  await test("sync", "CLW-H51", "override sync activates due row and supersedes predecessor", 4, async () => {
    const sync = await rpc("fn_sync_client_price_override_status", { p_reference_date: today });
    const previous = await overrideRow(F.syncOverridePrevious);
    const due = await overrideRow(F.syncOverrideDue);
    return checks([
      ["one due override processed", !sync.error && sync.data === 1, `${detail(sync)} count=${sync.data}`],
      ["due override active", due.data?.status === "active", detail(due)],
      ["closed predecessor superseded", previous.data?.status === "superseded", detail(previous)],
      ["sync metadata attributed", due.data?.published_by === actorId && previous.data?.superseded_by === actorId],
    ]);
  });

  await test("sync", "CLW-H52", "override sync is idempotent", 3, async () => {
    const sync = await rpc("fn_sync_client_price_override_status", { p_reference_date: today });
    const due = await overrideRow(F.syncOverrideDue);
    return checks([
      ["second sync succeeds", !sync.error, detail(sync)],
      ["second sync processes zero", sync.data === 0, `count=${sync.data}`],
      ["active row remains active", due.data?.status === "active", detail(due)],
    ]);
  });
}

let provenanceOverrideId;

async function provenanceCases() {
  await test("provenance", "CLW-H53", "draft override captures resolved table provenance", 5, async () => {
    const created = await createOverride({ clientId: F.provenanceClient, validFrom: addDays(30), price: 119 });
    provenanceOverrideId = created.id;
    const capture = await rpc("fn_capture_client_override_table_provenance", {
      p_override_id: created.id,
      p_reference_date: today,
    });
    const row = await overrideRow(created.id);
    return checks([
      ["capture accepted", !created.error && !capture.error, `${detail(created)} / ${detail(capture)}`],
      ["reference date captured", row.data?.source_reference_date === today, detail(row)],
      ["table and version captured", row.data?.source_commercial_price_table_id === F.tableA && row.data?.source_commercial_price_table_version_id === F.versionA],
      ["commercial item captured", row.data?.source_commercial_price_item_id === F.priceA],
      ["table amount captured exactly", Number(row.data?.source_table_price_amount) === 125],
    ]);
  });

  await test("provenance", "CLW-H54", "draft provenance can be recaptured", 3, async () => {
    const capture = await rpc("fn_capture_client_override_table_provenance", {
      p_override_id: provenanceOverrideId,
      p_reference_date: addDays(1),
    });
    const row = await overrideRow(provenanceOverrideId);
    return checks([
      ["recapture accepted", !capture.error, detail(capture)],
      ["new reference date persisted", row.data?.source_reference_date === addDays(1), detail(row)],
      ["resolved source remains exact", row.data?.source_commercial_price_item_id === F.priceA && Number(row.data?.source_table_price_amount) === 125],
    ]);
  });

  await test("provenance", "CLW-H55", "capture never changes negotiated override price", 2, async () => {
    const row = await overrideRow(provenanceOverrideId);
    return checks([
      ["override remains draft", row.data?.status === "draft", detail(row)],
      ["negotiated price unchanged", Number(row.data?.price_amount) === 119],
    ]);
  });

  await test("provenance", "CLW-H56", "capture fails when no assignment resolves", 2, async () => {
    const created = await createOverride({ clientId: F.resolverNoneClient, validFrom: addDays(31) });
    const capture = await rpc("fn_capture_client_override_table_provenance", {
      p_override_id: created.id,
      p_reference_date: today,
    });
    return checks([
      ["draft exists without assignment", !created.error, detail(created)],
      ["capture reports assignment status", failed(capture, "ASSIGNMENT_NOT_FOUND"), detail(capture)],
    ]);
  });

  await test("provenance", "CLW-H57", "capture distinguishes a missing assigned-table price", 3, async () => {
    const assignment = await createAssignment({ clientId: F.resolverNoneClient, tableId: F.missingTable, validFrom: today });
    const assignmentFlow = await approveAssignment(assignment.id);
    const publish = await rpc("fn_publish_client_assignment", { p_assignment_id: assignment.id });
    const override = await createOverride({ clientId: F.resolverNoneClient, itemId: F.missingItem, validFrom: addDays(32) });
    const capture = await rpc("fn_capture_client_override_table_provenance", {
      p_override_id: override.id,
      p_reference_date: today,
    });
    return checks([
      ["missing-price assignment published", !assignment.error && !assignmentFlow.approve.error && !publish.error, detail(publish)],
      ["missing-item override draft created", !override.error, detail(override)],
      ["capture reports PRICE_NOT_FOUND", failed(capture, "PRICE_NOT_FOUND"), detail(capture)],
    ]);
  });

  await test("provenance", "CLW-H58", "direct provenance spoof is rejected", 3, async () => {
    const created = await createOverride({ clientId: F.provenanceClient, validFrom: addDays(33) });
    const spoof = await supabase.from("client_price_overrides").update({
      source_reference_date: today,
      source_commercial_price_table_id: F.tableA,
      source_commercial_price_table_version_id: F.versionA,
      source_commercial_price_item_id: F.priceA,
      source_table_price_amount: 125,
    }).eq("id", created.id).select("id");
    const row = await overrideRow(created.id);
    return checks([
      ["spoof update rejected", Boolean(spoof.error) || spoof.data?.length === 0, detail(spoof)],
      ["source remains null", row.data?.source_reference_date === null && row.data?.source_commercial_price_item_id === null, detail(row)],
      ["override price retained", Number(row.data?.price_amount) === 111],
    ]);
  });

  await test("provenance", "CLW-H59", "captured provenance freezes outside draft", 4, async () => {
    const flow = await approveOverride(provenanceOverrideId);
    const capture = await rpc("fn_capture_client_override_table_provenance", {
      p_override_id: provenanceOverrideId,
      p_reference_date: today,
    });
    const direct = await supabase.from("client_price_overrides").update({ source_table_price_amount: 124 }).eq("id", provenanceOverrideId).select("id");
    const row = await overrideRow(provenanceOverrideId);
    return checks([
      ["captured override approved", !flow.submit.error && !flow.approve.error, `${detail(flow.submit)} / ${detail(flow.approve)}`],
      ["capture RPC rejects non-draft", failed(capture, "only for a draft"), detail(capture)],
      ["direct source mutation rejected", Boolean(direct.error) || direct.data?.length === 0, detail(direct)],
      ["captured source frozen", row.data?.source_reference_date === addDays(1) && Number(row.data?.source_table_price_amount) === 125],
    ]);
  });

  await test("provenance", "CLW-H60", "resolver exposes complete frozen provenance", 5, async () => {
    const publish = await rpc("fn_publish_client_price_override", { p_override_id: provenanceOverrideId });
    const resolved = await resolveOverride(F.mainOrg, F.provenanceClient, F.item, addDays(30));
    const source = resolved.data?.provenance;
    return checks([
      ["future captured override published", !publish.error, detail(publish)],
      ["published override resolves", !resolved.error && resolved.data?.status === "RESOLVED", detail(resolved)],
      ["reference date exposed", source?.source_reference_date === addDays(1)],
      ["source identities exposed", source?.source_commercial_price_table_id === F.tableA && source?.source_commercial_price_table_version_id === F.versionA && source?.source_commercial_price_item_id === F.priceA],
      ["frozen baseline exposed", Number(source?.source_table_price_amount) === 125 && Number(resolved.data?.price_amount) === 119],
    ]);
  });
}

async function securityCases() {
  await test("security", "CLW-H61", "manager can approve assignment but cannot publish", 4, async () => {
    const created = await createAssignment({ organizationId: F.managerOrg, clientId: F.managerClient, tableId: F.managerTable, validFrom: today });
    const flow = await approveAssignment(created.id);
    const publish = await rpc("fn_publish_client_assignment", { p_assignment_id: created.id });
    const row = await assignmentRow(created.id);
    return checks([
      ["manager draft created", !created.error, detail(created)],
      ["manager submit and approve accepted", !flow.submit.error && !flow.approve.error, `${detail(flow.submit)} / ${detail(flow.approve)}`],
      ["manager publish denied", failed(publish, "pricing.client.publish"), detail(publish)],
      ["assignment remains approved", row.data?.status === "approved" && row.data?.approved_by === actorId, detail(row)],
    ]);
  });

  await test("security", "CLW-H62", "manager can approve override but cannot publish", 4, async () => {
    const created = await createOverride({ organizationId: F.managerOrg, clientId: F.managerClient, itemId: F.managerItem, validFrom: today });
    const flow = await approveOverride(created.id);
    const publish = await rpc("fn_publish_client_price_override", { p_override_id: created.id });
    const row = await overrideRow(created.id);
    return checks([
      ["manager override created", !created.error, detail(created)],
      ["manager submit and approve accepted", !flow.submit.error && !flow.approve.error, `${detail(flow.submit)} / ${detail(flow.approve)}`],
      ["manager override publish denied", failed(publish, "pricing.client.publish"), detail(publish)],
      ["override remains approved", row.data?.status === "approved" && row.data?.approved_by === actorId, detail(row)],
    ]);
  });

  await test("security", "CLW-H63", "operator resolvers execute but mutations remain read-only", 4, async () => {
    const assignment = await resolveAssignment(F.operatorOrg, F.operatorClient, today);
    const override = await resolveOverride(F.operatorOrg, F.operatorClient, F.operatorItem, today);
    const submitAssignment = await rpc("fn_submit_client_assignment", { p_assignment_id: "66666666-4000-0000-0000-000000000003" });
    const submitOverride = await rpc("fn_submit_client_price_override", { p_override_id: "66666666-5000-0000-0000-000000000002" });
    return checks([
      ["assignment resolver readable", !assignment.error && assignment.data?.status === "ASSIGNMENT_NOT_FOUND", detail(assignment)],
      ["override resolver readable", !override.error && override.data?.status === "OVERRIDE_NOT_FOUND", detail(override)],
      ["assignment mutation denied", failed(submitAssignment, "pricing.client.review"), detail(submitAssignment)],
      ["override mutation denied", failed(submitOverride, "pricing.client.review"), detail(submitOverride)],
    ]);
  });

  await test("security", "CLW-H64", "viewer resolvers execute but mutations remain read-only", 4, async () => {
    const assignment = await resolveAssignment(F.viewerOrg, F.viewerClient, today);
    const override = await resolveOverride(F.viewerOrg, F.viewerClient, F.viewerItem, today);
    const submitAssignment = await rpc("fn_submit_client_assignment", { p_assignment_id: "66666666-4000-0000-0000-000000000004" });
    const submitOverride = await rpc("fn_submit_client_price_override", { p_override_id: "66666666-5000-0000-0000-000000000003" });
    return checks([
      ["assignment resolver readable", !assignment.error && assignment.data?.status === "ASSIGNMENT_NOT_FOUND", detail(assignment)],
      ["override resolver readable", !override.error && override.data?.status === "OVERRIDE_NOT_FOUND", detail(override)],
      ["assignment mutation denied", failed(submitAssignment, "pricing.client.review"), detail(submitAssignment)],
      ["override mutation denied", failed(submitOverride, "pricing.client.review"), detail(submitOverride)],
    ]);
  });

  await test("security", "CLW-H65", "cross-tenant resolvers do not leak foreign entities", 4, async () => {
    const foreignAssignment = await resolveAssignment(F.foreignOrg, F.assignmentChainClient, today);
    const foreignOverride = await resolveOverride(F.foreignOrg, F.overrideChainClient, F.item, today);
    const mixedAssignment = await resolveAssignment(F.crossOrg, F.assignmentChainClient, today);
    const mixedOverride = await resolveOverride(F.crossOrg, F.overrideChainClient, F.item, today);
    return checks([
      ["no-membership assignment denied generically", failed(foreignAssignment, "Not a member"), detail(foreignAssignment)],
      ["no-membership override denied generically", failed(foreignOverride, "Not a member"), detail(foreignOverride)],
      ["cross-org client appears absent", !mixedAssignment.error && mixedAssignment.data?.status === "CLIENT_NOT_FOUND" && !JSON.stringify(mixedAssignment.data).includes("Workflow")],
      ["cross-org override client appears absent", !mixedOverride.error && mixedOverride.data?.status === "CLIENT_NOT_FOUND" && !JSON.stringify(mixedOverride.data).includes("Workflow")],
    ]);
  });

  await test("security", "CLW-H66", "sync rejects future and null reference dates", 4, async () => {
    const assignmentFuture = await rpc("fn_sync_client_assignment_status", { p_reference_date: addDays(1) });
    const assignmentNull = await rpc("fn_sync_client_assignment_status", { p_reference_date: null });
    const overrideFuture = await rpc("fn_sync_client_price_override_status", { p_reference_date: addDays(1) });
    const overrideNull = await rpc("fn_sync_client_price_override_status", { p_reference_date: null });
    return checks([
      ["assignment future rejected", failed(assignmentFuture, "Future reference dates"), detail(assignmentFuture)],
      ["assignment null rejected", failed(assignmentNull, "Reference date is required"), detail(assignmentNull)],
      ["override future rejected", failed(overrideFuture, "Future reference dates"), detail(overrideFuture)],
      ["override null rejected", failed(overrideNull, "Reference date is required"), detail(overrideNull)],
    ]);
  });

  await test("security", "CLW-H67", "migration signatures and grants are exact", 5, async () => {
    const migration039 = await readFile(new URL("../../supabase/migrations/039_client_pricing_workflow.sql", import.meta.url), "utf8");
    const migration040 = await readFile(new URL("../../supabase/migrations/040_client_pricing_resolvers.sql", import.meta.url), "utf8");
    const grants = `${migration039}\n${migration040}`.match(/GRANT EXECUTE ON FUNCTION public\.fn_/g) || [];
    return checks([
      ["workflow migration has fourteen authenticated grants", (migration039.match(/GRANT EXECUTE ON FUNCTION public\.fn_/g) || []).length === 14],
      ["resolver migration has two authenticated grants", (migration040.match(/GRANT EXECUTE ON FUNCTION public\.fn_/g) || []).length === 2],
      ["all sixteen application functions granted", grants.length === 16],
      ["resolver parameter names exact", /p_organization_id\s+uuid,[\s\S]*p_client_company_id uuid,[\s\S]*p_reference_date\s+date/.test(migration040) && /p_catalog_item_id\s+uuid/.test(migration040)],
      ["PUBLIC and anon revoked before authenticated grants", migration039.includes("FROM PUBLIC, anon, authenticated") && migration040.includes("FROM PUBLIC, anon, authenticated")],
    ]);
  });

  await test("security", "CLW-H68", "runtime permissions match the static role map", 5, async () => {
    const adminPublish = await rpc("has_permission", { permission_code: "pricing.client.publish", org_id: F.mainOrg });
    const managerApprove = await rpc("has_permission", { permission_code: "pricing.client.approve", org_id: F.managerOrg });
    const managerPublish = await rpc("has_permission", { permission_code: "pricing.client.publish", org_id: F.managerOrg });
    const operatorView = await rpc("has_permission", { permission_code: "pricing.client.view", org_id: F.operatorOrg });
    const viewerEdit = await rpc("has_permission", { permission_code: "pricing.client.edit", org_id: F.viewerOrg });
    return checks([
      ["admin publish true", !adminPublish.error && adminPublish.data === true, detail(adminPublish)],
      ["manager approve true", !managerApprove.error && managerApprove.data === true, detail(managerApprove)],
      ["manager publish false", !managerPublish.error && managerPublish.data === false, detail(managerPublish)],
      ["operator view true", !operatorView.error && operatorView.data === true, detail(operatorView)],
      ["viewer edit false", !viewerEdit.error && viewerEdit.data === false, detail(viewerEdit)],
    ]);
  });
}

async function cleanup() {
  let removed = 0;
  for (const id of runtimeOverrides) {
    const current = await overrideRow(id);
    if (current.data?.status === "draft") {
      const deletion = await supabase.from("client_price_overrides").delete().eq("id", id).select("id");
      if (!deletion.error && deletion.data?.length === 1) removed++;
    }
  }
  for (const id of runtimeAssignments) {
    const current = await assignmentRow(id);
    if (current.data?.status === "draft") {
      const deletion = await supabase.from("client_commercial_table_assignments").delete().eq("id", id).select("id");
      if (!deletion.error && deletion.data?.length === 1) removed++;
    }
  }
  console.log(`Best-effort cleanup removed ${removed} runtime drafts; owner setup remains authoritative`);
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
  console.log("PRC-06C client-pricing workflow remote tests (CLW-H01..CLW-H68)");
  let fatal = null;
  try {
    await authenticate();
    await profileCases();
    await assignmentCases();
    await overrideCases();
    await resolverCases();
    await syncCases();
    await provenanceCases();
    await securityCases();
  } catch (error) {
    fatal = error;
    console.error(`Fatal suite error: ${error?.message || String(error)}`);
  } finally {
    try {
      await cleanup();
    } catch (error) {
      console.error(`Cleanup error: ${error?.message || String(error)}`);
    }
  }
  process.exit(fatal ? 1 : report());
}

main();
