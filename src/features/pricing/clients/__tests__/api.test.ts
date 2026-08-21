// ============================================================
// CUI-CAPI01..CUI-CAPI19 — RPC contract tests for the client
// pricing API layer. Each test asserts that a specific UI action
// calls the canonical RPC function with the expected parameter
// names. The UI never issues direct UPDATE on status columns and
// never accepts source_* provenance fields from callers.
// ============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  approveAssignment,
  approveOverride,
  cancelAssignment,
  cancelOverride,
  captureProvenance,
  createClientProfile,
  createOverride,
  deleteAssignment,
  publishAssignment,
  publishOverride,
  resolveAssignment,
  resolveOverride,
  returnAssignmentToDraft,
  returnOverrideToDraft,
  setClientProfileStatus,
  submitAssignment,
  submitOverride,
  syncAssignmentStatus,
  syncOverrideStatus,
  updateAssignment,
  updateOverride,
} from "../api/clientPrices";
import * as clientPrices from "../api/clientPrices";

type AnyMock = ReturnType<typeof vi.fn>;
type Chain = Record<string, AnyMock>;

const h = vi.hoisted(() => {
  const rpc = vi.fn();
  const chains: Record<string, ReturnType<typeof vi.fn>>[] = [];
  const makeChain = () => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    Object.assign(c, {
      select: vi.fn(() => c),
      eq: vi.fn(() => c),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      single: vi.fn(() => Promise.resolve({ data: { id: "row-1" }, error: null })),
      in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => c),
      update: vi.fn(() => c),
      delete: vi.fn(() => c),
      ilike: vi.fn(() => c),
    });
    chains.push(c);
    return c;
  };
  return { rpc, chains, makeChain };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => h.rpc(...args),
    from: vi.fn(() => h.makeChain()),
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "u1" } }, error: null })) },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

function lastChain(): Chain {
  return h.chains[h.chains.length - 1]!;
}

beforeEach(() => {
  h.rpc.mockReset();
  h.rpc.mockResolvedValue({ data: null, error: null });
  h.chains.length = 0;
});

describe("Profile API (CUI-CAPI01, CUI-CAPI02)", () => {
  it("CUI-CAPI01: createClientProfile does direct INSERT (not RPC) to client_profiles", async () => {
    await createClientProfile({ companyId: "comp-1", orgId: "org-1" });

    const chain = lastChain();
    expect(chain.insert).toHaveBeenCalled();
    expect(chain.insert).toHaveBeenCalledWith({
      company_id: "comp-1",
      organization_id: "org-1",
    });
    // Profile creation is a plain INSERT — no RPC is involved.
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("CUI-CAPI02: setClientProfileStatus uses fn_set_client_profile_status with correct params", async () => {
    await setClientProfileStatus({
      clientCompanyId: "comp-1",
      status: "blocked",
      reason: "Risco de crédito",
    });
    expect(h.rpc).toHaveBeenCalledTimes(1);
    expect(h.rpc).toHaveBeenCalledWith("fn_set_client_profile_status", {
      p_client_company_id: "comp-1",
      p_status: "blocked",
      p_reason: "Risco de crédito",
    });
  });
});

describe("Assignment workflow RPCs (CUI-CAPI03..07)", () => {
  it("CUI-CAPI03: submitAssignment uses fn_submit_client_assignment with p_assignment_id", async () => {
    await submitAssignment("asg-1");
    expect(h.rpc).toHaveBeenCalledWith("fn_submit_client_assignment", {
      p_assignment_id: "asg-1",
    });
  });

  it("CUI-CAPI04: returnAssignmentToDraft uses fn_return_client_assignment_to_draft with p_assignment_id", async () => {
    await returnAssignmentToDraft("asg-1");
    expect(h.rpc).toHaveBeenCalledWith("fn_return_client_assignment_to_draft", {
      p_assignment_id: "asg-1",
    });
  });

  it("CUI-CAPI05: approveAssignment uses fn_approve_client_assignment with p_assignment_id", async () => {
    await approveAssignment("asg-1");
    expect(h.rpc).toHaveBeenCalledWith("fn_approve_client_assignment", {
      p_assignment_id: "asg-1",
    });
  });

  it("CUI-CAPI06: cancelAssignment uses fn_cancel_client_assignment with p_assignment_id", async () => {
    await cancelAssignment("asg-1");
    expect(h.rpc).toHaveBeenCalledWith("fn_cancel_client_assignment", {
      p_assignment_id: "asg-1",
    });
  });

  it("CUI-CAPI07: publishAssignment uses fn_publish_client_assignment with p_assignment_id", async () => {
    await publishAssignment("asg-1");
    expect(h.rpc).toHaveBeenCalledWith("fn_publish_client_assignment", {
      p_assignment_id: "asg-1",
    });
  });
});

describe("Override workflow RPCs (CUI-CAPI08..12)", () => {
  it("CUI-CAPI08: submitOverride uses fn_submit_client_price_override with p_override_id", async () => {
    await submitOverride("ovr-1");
    expect(h.rpc).toHaveBeenCalledWith("fn_submit_client_price_override", {
      p_override_id: "ovr-1",
    });
  });

  it("CUI-CAPI09: returnOverrideToDraft uses fn_return_client_price_override_to_draft with p_override_id", async () => {
    await returnOverrideToDraft("ovr-1");
    expect(h.rpc).toHaveBeenCalledWith("fn_return_client_price_override_to_draft", {
      p_override_id: "ovr-1",
    });
  });

  it("CUI-CAPI10: approveOverride uses fn_approve_client_price_override with p_override_id", async () => {
    await approveOverride("ovr-1");
    expect(h.rpc).toHaveBeenCalledWith("fn_approve_client_price_override", {
      p_override_id: "ovr-1",
    });
  });

  it("CUI-CAPI11: cancelOverride uses fn_cancel_client_price_override with p_override_id", async () => {
    await cancelOverride("ovr-1");
    expect(h.rpc).toHaveBeenCalledWith("fn_cancel_client_price_override", {
      p_override_id: "ovr-1",
    });
  });

  it("CUI-CAPI12: publishOverride uses fn_publish_client_price_override with p_override_id", async () => {
    await publishOverride("ovr-1");
    expect(h.rpc).toHaveBeenCalledWith("fn_publish_client_price_override", {
      p_override_id: "ovr-1",
    });
  });
});

describe("Provenance + resolvers + sync (CUI-CAPI13..17)", () => {
  it("CUI-CAPI13: captureProvenance uses fn_capture_client_override_table_provenance with p_override_id and p_reference_date", async () => {
    await captureProvenance({ overrideId: "ovr-1", referenceDate: "2026-01-10" });
    expect(h.rpc).toHaveBeenCalledWith("fn_capture_client_override_table_provenance", {
      p_override_id: "ovr-1",
      p_reference_date: "2026-01-10",
    });
  });

  it("CUI-CAPI14: resolveAssignment uses fn_resolve_client_table_assignment with p_organization_id, p_client_company_id, p_reference_date", async () => {
    h.rpc.mockResolvedValueOnce({
      data: { status: "ASSIGNMENT_NOT_FOUND" },
      error: null,
    });
    await resolveAssignment({
      orgId: "org-1",
      clientCompanyId: "comp-1",
      referenceDate: "2026-01-15",
    });
    expect(h.rpc).toHaveBeenCalledWith("fn_resolve_client_table_assignment", {
      p_organization_id: "org-1",
      p_client_company_id: "comp-1",
      p_reference_date: "2026-01-15",
    });
  });

  it("CUI-CAPI15: resolveOverride uses fn_resolve_client_price_override with p_organization_id, p_client_company_id, p_catalog_item_id, p_reference_date", async () => {
    h.rpc.mockResolvedValueOnce({
      data: { status: "OVERRIDE_NOT_FOUND" },
      error: null,
    });
    await resolveOverride({
      orgId: "org-1",
      clientCompanyId: "comp-1",
      catalogItemId: "item-1",
      referenceDate: "2026-01-15",
    });
    expect(h.rpc).toHaveBeenCalledWith("fn_resolve_client_price_override", {
      p_organization_id: "org-1",
      p_client_company_id: "comp-1",
      p_catalog_item_id: "item-1",
      p_reference_date: "2026-01-15",
    });
  });

  it("CUI-CAPI16: syncAssignmentStatus uses fn_sync_client_assignment_status with p_reference_date", async () => {
    h.rpc.mockResolvedValueOnce({ data: 3, error: null });
    const count = await syncAssignmentStatus("2026-06-01");
    expect(count).toBe(3);
    expect(h.rpc).toHaveBeenCalledWith("fn_sync_client_assignment_status", {
      p_reference_date: "2026-06-01",
    });
  });

  it("CUI-CAPI17: syncOverrideStatus uses fn_sync_client_price_override_status with p_reference_date", async () => {
    h.rpc.mockResolvedValueOnce({ data: 2, error: null });
    const count = await syncOverrideStatus("2026-06-01");
    expect(count).toBe(2);
    expect(h.rpc).toHaveBeenCalledWith("fn_sync_client_price_override_status", {
      p_reference_date: "2026-06-01",
    });
  });
});

describe("Guardrails (CUI-CAPI18, CUI-CAPI19)", () => {
  it("CUI-CAPI18: no direct status UPDATE is exposed for assignments", async () => {
    await updateAssignment({
      assignmentId: "asg-1",
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      contractReference: "CT-01",
      notes: "ok",
    });

    const chain = lastChain();
    expect(chain.update).toHaveBeenCalled();
    const payload = chain.update!.mock.calls[0]![0] as Record<string, unknown>;
    // Draft-field edits only — the status column is never written directly.
    expect(Object.keys(payload)).not.toContain("status");
    expect(Object.keys(payload)).toEqual(
      expect.arrayContaining(["valid_from", "valid_to", "contract_reference", "notes"])
    );

    await deleteAssignment("asg-1");

    // No exported wrapper mutates assignment status outside the workflow RPCs.
    const apiKeys = Object.keys(clientPrices);
    expect(apiKeys).not.toContain("updateAssignmentStatus");
    expect(apiKeys).not.toContain("setAssignmentStatus");
    expect(apiKeys).not.toContain("setAssignmentStatusDirect");
  });

  it("CUI-CAPI19: no source_* provenance fields are accepted by createOverride or updateOverride", async () => {
    const createInput = {
      orgId: "org-1",
      clientCompanyId: "comp-1",
      catalogItemId: "item-1",
      priceAmount: 92.5,
      reason: "Desconto comercial",
      validFrom: "2026-01-01",
      validTo: null,
    };
    expect(
      Object.keys(createInput).filter((k) => k.startsWith("source_"))
    ).toEqual([]);

    await createOverride(createInput);
    const insertPayload = lastChain().insert!.mock.calls[0]![0] as Record<string, unknown>;
    expect(
      Object.keys(insertPayload).filter((k) => k.startsWith("source_"))
    ).toEqual([]);

    const updateInput = {
      overrideId: "ovr-1",
      priceAmount: 90,
      reason: "Renegociado",
      validFrom: "2026-02-01",
      validTo: null,
    };
    expect(
      Object.keys(updateInput).filter((k) => k.startsWith("source_"))
    ).toEqual([]);

    await updateOverride(updateInput);
    const updatePayload = lastChain().update!.mock.calls[0]![0] as Record<string, unknown>;
    expect(
      Object.keys(updatePayload).filter((k) => k.startsWith("source_"))
    ).toEqual([]);
  });
});
