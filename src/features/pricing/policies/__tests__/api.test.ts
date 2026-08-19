import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

const h = vi.hoisted(() => {
  const rpc = vi.fn();
  const from = vi.fn();
  const authGetUser = vi.fn();
  const insert = vi.fn();
  const chain = vi.fn(() => chainProxy);
  const calls: string[] = [];

  const chainProxy = {
    select: vi.fn(() => chainProxy),
    eq: vi.fn(() => chainProxy),
    or: vi.fn(() => chainProxy),
    order: vi.fn(() => chainProxy),
    limit: vi.fn(() => chainProxy),
    range: vi.fn(() => chainProxy),
    update: vi.fn(() => chainProxy),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    insert: vi.fn(() => chainProxy),
    then: undefined,
  };

  return { rpc, from, authGetUser, insert, chain, chainProxy, calls };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => h.rpc(...args),
    from: (table: string) => {
      h.from(table);
      return h.chainProxy;
    },
    auth: {
      getUser: () => h.authGetUser(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

import {
  fetchPricingPolicies,
  createPricingPolicy,
  createPricingPolicyVersion,
  addPricingPolicyComponent,
  updatePricingPolicyComponent,
  deletePricingPolicyComponent,
  runPricingPolicyWorkflowAction,
  simulatePrice,
  updateDraftPricingPolicyVersion,
  mapPricingPolicyError,
  fetchCatalogCategoriesForSelector,
} from "../api/policies";

beforeEach(() => {
  vi.clearAllMocks();
  h.authGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  h.rpc.mockResolvedValue({ data: null, error: null });
});

describe("Pricing policies API (UI-API01..08)", () => {
  it("UI-API01: fetchPricingPolicies filters by org and orders by created_at desc", async () => {
    h.chainProxy.select.mockReturnValue(h.chainProxy);
    h.chainProxy.eq.mockReturnValue(h.chainProxy);
    h.chainProxy.order.mockReturnValue(h.chainProxy);
    (h.chainProxy.range as Mock).mockResolvedValue({ data: [], error: null, count: 0 });

    await fetchPricingPolicies({ orgId: "org-1", page: 2, pageSize: 25 });

    expect(h.from).toHaveBeenCalledWith("pricing_policies");
    expect(h.chainProxy.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(h.chainProxy.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(h.chainProxy.range).toHaveBeenCalledWith(25, 49);
  });

  it("UI-API02: fetchPricingPolicies applies search, scope and status filters", async () => {
    h.chainProxy.select.mockReturnValue(h.chainProxy);
    h.chainProxy.eq.mockReturnValue(h.chainProxy);
    h.chainProxy.order.mockReturnValue(h.chainProxy);
    (h.chainProxy.range as Mock).mockResolvedValue({ data: [], error: null, count: 0 });

    await fetchPricingPolicies({
      orgId: "org-1",
      search: "teste",
      scopeType: "category",
      status: "active",
    });

    expect(h.chainProxy.or).toHaveBeenCalledWith("code.ilike.%teste%,name.ilike.%teste%");
    expect(h.chainProxy.eq).toHaveBeenCalledWith("scope_type", "category");
    expect(h.chainProxy.eq).toHaveBeenCalledWith("status", "active");
  });

  it("UI-API03: createPricingPolicy calls the workflow RPC with mapped fields", async () => {
    h.rpc.mockResolvedValue({ data: "policy-1", error: null });

    const id = await createPricingPolicy({
      orgId: "org-1",
      code: "POL-001",
      name: "Política padrão",
      scopeType: "default",
    });

    expect(id).toBe("policy-1");
    expect(h.rpc).toHaveBeenCalledWith("fn_create_pricing_policy", {
      p_organization_id: "org-1",
      p_code: "POL-001",
      p_name: "Política padrão",
      p_description: null,
      p_scope_type: "default",
      p_catalog_category_id: null,
      p_catalog_item_id: null,
    });
  });

  it("UI-API04: createPricingPolicyVersion sends method-dependent nulls (target_margin)", async () => {
    h.rpc.mockResolvedValue({ data: "version-1", error: null });

    await createPricingPolicyVersion({
      policyId: "policy-1",
      orgId: "org-1",
      validFrom: "2026-01-01",
      pricingMethod: "target_margin",
      targetMarginRate: 0.2,
      markupRate: null,
      fixedPrice: null,
      roundingMode: "none",
    });

    expect(h.rpc).toHaveBeenCalledWith("fn_create_pricing_policy_version", expect.objectContaining({
      p_policy_id: "policy-1",
      p_pricing_method: "target_margin",
      p_target_margin_rate: 0.2,
      p_markup_rate: null,
      p_fixed_price: null,
      p_rounding_mode: "none",
    }));
  });

  it("UI-API05: addPricingPolicyComponent enforces type integrity (fixed → rate null)", async () => {
    h.rpc.mockResolvedValue({ data: "comp-1", error: null });

    await addPricingPolicyComponent({
      versionId: "version-1",
      orgId: "org-1",
      name: "Taxa de coleta",
      componentType: "fixed",
      fixedAmount: 5,
      rate: null,
    });

    expect(h.rpc).toHaveBeenCalledWith("fn_add_pricing_policy_component", {
      p_version_id: "version-1",
      p_name: "Taxa de coleta",
      p_component_type: "fixed",
      p_fixed_amount: 5,
      p_rate: null,
    });
  });

  it("UI-API06: simulatePrice passes discount and org as fractions/null", async () => {
    h.rpc.mockResolvedValue({ data: { status: "OK" }, error: null });

    await simulatePrice({
      orgId: "org-1",
      supplierCompanyId: "supplier-1",
      catalogItemId: "item-1",
      referenceDate: "2026-01-01",
      discountRate: 0.05,
    });

    expect(h.rpc).toHaveBeenCalledWith("fn_simulate_price", {
      p_organization_id: "org-1",
      p_supplier_company_id: "supplier-1",
      p_catalog_item_id: "item-1",
      p_reference_date: "2026-01-01",
      p_discount_rate: 0.05,
    });
  });

  it("UI-API07: workflow actions map to the correct RPC names", async () => {
    h.rpc.mockResolvedValue({ data: null, error: null });

    const cases: Array<["submit" | "approve" | "return_to_draft" | "cancel" | "publish", string]> = [
      ["submit", "fn_submit_pricing_policy_version"],
      ["approve", "fn_approve_pricing_policy_version"],
      ["return_to_draft", "fn_return_pricing_policy_version_to_draft"],
      ["cancel", "fn_cancel_pricing_policy_version"],
      ["publish", "fn_publish_pricing_policy_version"],
    ];

    for (const [kind, fnName] of cases) {
      await runPricingPolicyWorkflowAction(kind, { versionId: "version-1", orgId: "org-1" });
      expect(h.rpc).toHaveBeenCalledWith(fnName, { p_version_id: "version-1" });
    }
  });

  it("UI-API08: updateDraftPricingPolicyVersion never sends status/organization/actor fields", async () => {
    const dirty = {
      valid_from: "2026-02-01",
      pricing_method: "markup",
      markup_rate: 0.25,
      status: "under_review" as string,
      organization_id: "other-org" as string,
      created_by: "attacker" as string,
    } as unknown as Parameters<typeof updateDraftPricingPolicyVersion>[2];
    await updateDraftPricingPolicyVersion("version-1", "org-1", dirty);

    const firstCall = h.chainProxy.update.mock.calls[0] as unknown as
      | unknown[]
      | undefined;
    const updateArg = (firstCall ?? [])[0] as Record<string, unknown> | undefined;
    expect(updateArg).toBeDefined();
    expect(updateArg).not.toHaveProperty("status");
    expect(updateArg).not.toHaveProperty("organization_id");
    expect(updateArg).not.toHaveProperty("created_by");
    expect(updateArg).not.toHaveProperty("created_at");
    expect(updateArg?.valid_from).toBe("2026-02-01");
    expect(updateArg?.pricing_method).toBe("markup");
  });

  it("UI-API08b: fetchCatalogCategoriesForSelector filters active categories only", async () => {
    h.chainProxy.select.mockReturnValue(h.chainProxy);
    h.chainProxy.eq.mockReturnValue(h.chainProxy);
    h.chainProxy.order.mockReturnValue(h.chainProxy);
    (h.chainProxy.limit as Mock).mockResolvedValue({ data: [], error: null });

    await fetchCatalogCategoriesForSelector({ orgId: "org-1" });

    expect(h.chainProxy.eq).toHaveBeenCalledWith("is_active", true);
    expect(h.chainProxy.eq).toHaveBeenCalledWith("organization_id", "org-1");
  });

  it("UI-API09: component update/delete map to the correct RPCs with null-safe payloads", async () => {
    h.rpc.mockResolvedValue({ data: null, error: null });

    await updatePricingPolicyComponent("component-1", "org-1", {
      name: "Taxa de coleta",
      fixedAmount: 12.5,
      rate: null,
      sortOrder: 1,
    });
    expect(h.rpc).toHaveBeenCalledWith("fn_update_pricing_policy_component", {
      p_component_id: "component-1",
      p_name: "Taxa de coleta",
      p_fixed_amount: 12.5,
      p_rate: null,
      p_sort_order: 1,
    });

    await deletePricingPolicyComponent("component-1", "org-1");
    expect(h.rpc).toHaveBeenCalledWith("fn_delete_pricing_policy_component", {
      p_component_id: "component-1",
    });
  });

  it("mapPricingPolicyError maps known backend messages to pt-BR", () => {
    expect(mapPricingPolicyError("Insufficient permissions (requires pricing.policy.create)"))
      .toBe("Você não tem permissão para realizar esta ação.");
    expect(mapPricingPolicyError("Only approved versions can be published"))
      .toBe("Somente versões aprovadas podem ser publicadas.");
    expect(mapPricingPolicyError("Pricing policy not found"))
      .toBe("Política de preço não encontrada.");
    expect(mapPricingPolicyError("Duplicate key value violates unique constraint"))
      .toContain("código");
  });
});