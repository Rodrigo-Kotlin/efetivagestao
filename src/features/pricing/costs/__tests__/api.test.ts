import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchCostTable,
  fetchCostTables,
  fetchCostTableVersion,
} from "../api/costs";

const h = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => h.from(...args),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

const supplierRelationship =
  "supplier:companies!supplier_cost_tables_supplier_company_id_fkey(*, supplier_profile:supplier_profiles!supplier_profiles_company_id_fkey(*))";

const supplier = {
  id: "supplier-1",
  legal_name: "Fornecedor Teste",
  supplier_profile: { company_id: "supplier-1", status: "active" },
};

const costTable = { id: "table-1", supplier };
const version = { id: "version-1", cost_table: costTable, items: [] };

function queryBuilder(table: string) {
  const result = table === "supplier_cost_table_versions" ? version : costTable;
  const builder = {
    select: vi.fn((...args: unknown[]) => {
      h.select(...args);
      return builder;
    }),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => Promise.resolve({ data: [result], error: null, count: 1 })),
    single: vi.fn(() => Promise.resolve({ data: result, error: null })),
  };
  return builder;
}

beforeEach(() => {
  h.from.mockReset();
  h.select.mockReset();
  h.from.mockImplementation((table: string) => queryBuilder(table));
});

describe("Cost Tables PostgREST relationships", () => {
  it("COST-API01: list embeds supplier company before supplier profile", async () => {
    const result = await fetchCostTables({ orgId: "org-1" });

    expect(h.from).toHaveBeenCalledWith("supplier_cost_tables");
    expect(h.select).toHaveBeenCalledWith(`*, ${supplierRelationship}`, {
      count: "exact",
    });
    expect(result.data[0]?.supplier?.legal_name).toBe("Fornecedor Teste");
    expect(result.data[0]?.supplier?.supplier_profile?.company_id).toBe("supplier-1");
  });

  it("COST-API02: detail uses the same company relationship", async () => {
    const result = await fetchCostTable("table-1", "org-1");

    expect(h.select).toHaveBeenCalledWith(
      `*, ${supplierRelationship}, versions:supplier_cost_table_versions(*)`
    );
    expect(result?.supplier?.legal_name).toBe("Fornecedor Teste");
  });

  it("COST-API03: version nests the company relationship under its cost table", async () => {
    const result = await fetchCostTableVersion("version-1", "org-1");

    expect(h.select).toHaveBeenCalledWith(
      `*, cost_table:supplier_cost_tables(*, ${supplierRelationship}), items:supplier_cost_items(*)`
    );
    expect(result?.cost_table.supplier?.supplier_profile?.status).toBe("active");
  });
});
