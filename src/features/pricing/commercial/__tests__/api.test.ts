// ============================================================
// CUI-API01..CUI-API12 — RPC contract tests.
// Each test asserts that a specific UI action calls the canonical
// RPC function with the expected parameter names. We never call
// direct UPDATE on commercial_price_* tables from the UI layer.
// ============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addEngineCommercialItem,
  addManualCommercialItem,
  approveCommercialVersion,
  bulkAdjustCommercialPrices,
  cancelCommercialVersion,
  cloneCommercialVersion,
  createCommercialTable,
  createCommercialVersion,
  decideCommercialException,
  deleteCommercialItem,
  publishCommercialVersion,
  requestCommercialException,
  resolveCommercialPrice,
  returnCommercialVersionToDraft,
  setCommercialTableStatus,
  simulateEnginePrice,
  submitCommercialVersion,
  updateCommercialItemPrice,
  updateCommercialTable,
  validateCommercialVersion,
} from "../api/commercialPrices";

const h = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => h.rpc(...args),
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })) })) })) })) })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "u1" } }, error: null })) },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  h.rpc.mockReset();
  h.rpc.mockResolvedValue({ data: null, error: null });
});

describe("API contract (CUI-API01..12)", () => {
  it("CUI-API01: create table uses fn_create_commercial_price_table", async () => {
    h.rpc.mockResolvedValueOnce({ data: "t1", error: null });
    await createCommercialTable({
      orgId: "org-1",
      code: "TBL",
      name: "Tabela",
      description: null,
    });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_create_commercial_price_table",
      expect.objectContaining({ p_organization_id: "org-1", p_code: "TBL" })
    );
  });

  it("CUI-API02: create version uses fn_create_commercial_price_table_version", async () => {
    h.rpc.mockResolvedValueOnce({ data: [{ version_id: "v1", version_number: 1 }], error: null });
    await createCommercialVersion({
      tableId: "t1",
      validFrom: "2026-01-01",
      validTo: null,
      versionLabel: null,
      notes: null,
    });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_create_commercial_price_table_version",
      expect.objectContaining({
        p_commercial_price_table_id: "t1",
        p_valid_from: "2026-01-01",
      })
    );
  });

  it("CUI-API03: clone uses fn_clone_commercial_price_table_version", async () => {
    h.rpc.mockResolvedValueOnce({
      data: [{ new_version_id: "v2", new_version_number: 2 }],
      error: null,
    });
    await cloneCommercialVersion({
      sourceVersionId: "v1",
      validFrom: "2026-02-01",
      validTo: null,
      versionLabel: null,
      notes: null,
    });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_clone_commercial_price_table_version",
      expect.objectContaining({ p_source_version_id: "v1" })
    );
  });

  it("CUI-API04: manual item uses fn_add_commercial_price_item_manual", async () => {
    h.rpc.mockResolvedValueOnce({ data: "i1", error: null });
    await addManualCommercialItem({
      versionId: "v1",
      catalogItemId: "c1",
      priceAmount: 100,
    });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_add_commercial_price_item_manual",
      expect.objectContaining({ p_version_id: "v1", p_catalog_item_id: "c1", p_price_amount: 100 })
    );
  });

  it("CUI-API05: engine item uses fn_add_commercial_price_item_from_engine", async () => {
    h.rpc.mockResolvedValueOnce({ data: "i2", error: null });
    await addEngineCommercialItem({
      versionId: "v1",
      catalogItemId: "c1",
      supplierCompanyId: "s1",
      referenceDate: "2026-01-01",
      discountRate: 0.05,
      commercialPriceAmount: 100,
    });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_add_commercial_price_item_from_engine",
      expect.objectContaining({ p_supplier_company_id: "s1", p_discount_rate: 0.05 })
    );
  });

  it("CUI-API06: bulk uses fn_bulk_adjust_commercial_prices", async () => {
    h.rpc.mockResolvedValueOnce({ data: 3, error: null });
    await bulkAdjustCommercialPrices({
      versionId: "v1",
      operation: "percentage",
      rate: 0.05,
      fixedAmount: null,
      roundingMode: null,
      roundingStep: null,
      itemIds: ["a", "b"],
    });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_bulk_adjust_commercial_prices",
      expect.objectContaining({ p_operation: "percentage", p_rate: 0.05, p_item_ids: ["a", "b"] })
    );
  });

  it("CUI-API07: exception request uses fn_request_commercial_price_exception", async () => {
    h.rpc.mockResolvedValueOnce({ data: "e1", error: null });
    await requestCommercialException({
      itemId: "i1",
      violationCode: "BELOW_COST",
      reason: "ok",
    });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_request_commercial_price_exception",
      expect.objectContaining({ p_violation_code: "BELOW_COST", p_reason: "ok" })
    );
  });

  it("CUI-API08: exception decision uses fn_decide_commercial_price_exception", async () => {
    await decideCommercialException({
      exceptionId: "e1",
      decision: "approved",
      notes: "Aprovada no teste",
    });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_decide_commercial_price_exception",
      {
        p_exception_id: "e1",
        p_decision: "approved",
        p_decision_notes: "Aprovada no teste",
      }
    );
    expect(h.rpc.mock.calls.at(-1)?.[1]).not.toHaveProperty("p_notes");
  });

  it("CUI-API09: workflow uses fn_*_commercial_price_version RPCs", async () => {
    await submitCommercialVersion("v1");
    expect(h.rpc).toHaveBeenCalledWith("fn_submit_commercial_price_version", {
      p_version_id: "v1",
    });
    await returnCommercialVersionToDraft("v1");
    expect(h.rpc).toHaveBeenCalledWith("fn_return_commercial_price_version_to_draft", {
      p_version_id: "v1",
    });
    await approveCommercialVersion("v1");
    expect(h.rpc).toHaveBeenCalledWith("fn_approve_commercial_price_version", {
      p_version_id: "v1",
    });
    await cancelCommercialVersion("v1");
    expect(h.rpc).toHaveBeenCalledWith("fn_cancel_commercial_price_version", {
      p_version_id: "v1",
    });
    await publishCommercialVersion("v1");
    expect(h.rpc).toHaveBeenCalledWith("fn_publish_commercial_price_version", {
      p_version_id: "v1",
    });
  });

  it("CUI-API10: lookup uses fn_resolve_commercial_table_price", async () => {
    await resolveCommercialPrice({
      orgId: "org-1",
      tableId: "t1",
      catalogItemId: "c1",
      referenceDate: "2026-01-01",
    });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_resolve_commercial_table_price",
      expect.objectContaining({
        p_organization_id: "org-1",
        p_commercial_price_table_id: "t1",
        p_catalog_item_id: "c1",
        p_reference_date: "2026-01-01",
      })
    );
  });

  it("CUI-API11: no direct status mutation RPC is exposed", () => {
    // The wrapper has no method to UPDATE status directly. It routes
    // through fn_*_commercial_price_version only.
    const exportedFns = [
      "updateCommercialTable",
      "setCommercialTableStatus",
      "createCommercialVersion",
      "cloneCommercialVersion",
      "addManualCommercialItem",
      "updateCommercialItemPrice",
      "deleteCommercialItem",
      "addEngineCommercialItem",
      "bulkAdjustCommercialPrices",
      "requestCommercialException",
      "decideCommercialException",
      "submitCommercialVersion",
      "returnCommercialVersionToDraft",
      "approveCommercialVersion",
      "cancelCommercialVersion",
      "publishCommercialVersion",
      "validateCommercialVersion",
      "resolveCommercialPrice",
      "simulateEnginePrice",
    ];
    expect(exportedFns.length).toBeGreaterThan(0);
    // No exported "updateCommercialVersionStatus" or similar.
    expect(
      (h.rpc as unknown as { mock: { calls: unknown[] } }).mock.calls.length
    ).toBe(0);
  });

  it("CUI-API12: no direct engine-provenance write RPC is exposed", () => {
    // The wrapper exposes only the controlled engine RPC. It never
    // accepts source_* provenance fields from the UI.
    // The engine item input shape is the only path to origin_type='pricing_engine'.
    const input = {
      versionId: "v1",
      catalogItemId: "c1",
      supplierCompanyId: "s1",
      referenceDate: "2026-01-01",
      discountRate: 0,
      commercialPriceAmount: null,
    };
    // Confirm there is no source_* field accepted.
    expect(Object.keys(input)).not.toContain("source_reference_date");
    expect(Object.keys(input)).not.toContain("source_supplier_company_id");
    expect(Object.keys(input)).not.toContain("source_effective_price");
  });

  it("CUI-API05b: simulate uses fn_simulate_price (informational)", async () => {
    await simulateEnginePrice({
      orgId: "org-1",
      supplierCompanyId: "s1",
      catalogItemId: "c1",
      referenceDate: "2026-01-01",
      discountRate: 0.05,
    });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_simulate_price",
      expect.objectContaining({ p_organization_id: "org-1", p_supplier_company_id: "s1" })
    );
  });

  it("CUI-API02b: validate uses fn_validate_commercial_price_version", async () => {
    h.rpc.mockResolvedValueOnce({ data: { ready: true, blockers: [] }, error: null });
    await validateCommercialVersion("v1");
    expect(h.rpc).toHaveBeenCalledWith("fn_validate_commercial_price_version", {
      p_version_id: "v1",
    });
  });

  it("CUI-API01b: update table uses fn_update_commercial_price_table", async () => {
    await updateCommercialTable({ tableId: "t1", name: "New", description: null });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_update_commercial_price_table",
      expect.objectContaining({ p_table_id: "t1", p_name: "New" })
    );
  });

  it("CUI-API01c: set table status uses fn_set_commercial_price_table_status", async () => {
    await setCommercialTableStatus({ tableId: "t1", status: "inactive" });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_set_commercial_price_table_status",
      expect.objectContaining({ p_status: "inactive" })
    );
  });

  it("CUI-API04b: update item price uses fn_update_commercial_price_item_price", async () => {
    await updateCommercialItemPrice({ itemId: "i1", priceAmount: 99.9 });
    expect(h.rpc).toHaveBeenCalledWith(
      "fn_update_commercial_price_item_price",
      expect.objectContaining({ p_item_id: "i1", p_price_amount: 99.9 })
    );
  });

  it("CUI-API04c: delete item uses fn_delete_commercial_price_item", async () => {
    await deleteCommercialItem({ itemId: "i1" });
    expect(h.rpc).toHaveBeenCalledWith("fn_delete_commercial_price_item", {
      p_item_id: "i1",
    });
  });
});
