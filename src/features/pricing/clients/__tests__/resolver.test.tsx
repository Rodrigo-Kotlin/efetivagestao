// ============================================================
// CUI-CRES01..CUI-CRES10 — Resolver UI tests.
// ResolverResult renders every fn_resolve_client_* state with
// explicit pt-BR copy. NOT_FOUND is a result, not an error, and
// never renders as a zero price. The lookup page carries the
// PRC-07 boundary banner.
// ============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ResolverResult } from "../components/ResolverResult";
import { ClientLookupPage } from "../pages/ClientLookupPage";
import type {
  AssignmentResolverResult,
  OverrideResolverResult,
} from "../types/client.types";

const h = vi.hoisted(() => {
  const rpc = vi.fn();
  // Configurable results, read at await time:
  //   single → maybeSingle/single terminals (row lookups)
  //   range  → paginated lists terminated by .range()
  //   list   → any other directly-awaited builder (.order/.in/.eq/...)
  const state = {
    list: { data: [] as unknown[], error: null as null, count: 0 },
    range: { data: [] as unknown[], error: null as null, count: 0 },
    single: { data: null as unknown, error: null as unknown },
  };
  const makeChain = () => {
    const ops: string[] = [];
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const name of [
      "select",
      "eq",
      "order",
      "range",
      "limit",
      "in",
      "ilike",
      "insert",
      "update",
      "delete",
    ]) {
      chain[name] = vi.fn(() => {
        ops.push(name);
        return chain;
      });
    }
    chain.maybeSingle = vi.fn(() => Promise.resolve(state.single));
    chain.single = vi.fn(() => Promise.resolve(state.single));
    (chain as unknown as { then: unknown }).then = (
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => {
      const result = ops[ops.length - 1] === "range" ? state.range : state.list;
      return Promise.resolve(result).then(onFulfilled, onRejected);
    };
    return chain;
  };
  return { rpc, from: vi.fn((_table: string) => makeChain()), state };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => h.rpc(...args),
    from: (table: string) => h.from(table),
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "u1" } }, error: null })) },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

let canMock: (permission: string) => boolean;

// Stable identity across renders — mirrors AuthContext's useCallback'd can.
// A fresh arrow per render would re-trigger useClientList's effect loop.
const ORG = { id: "org-1" };
const stableCan = (permission: string) => canMock(permission);

vi.mock("@/features/core/useAuth", () => ({
  useAuth: () => ({
    activeOrganization: ORG,
    can: stableCan,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  h.rpc.mockReset();
  h.rpc.mockResolvedValue({ data: null, error: null });
  h.state.list = { data: [], error: null, count: 0 };
  h.state.range = { data: [], error: null, count: 0 };
  h.state.single = { data: null, error: null };
  canMock = () => true;
});

function assignmentResult(
  overrides: Partial<AssignmentResolverResult> = {}
): AssignmentResolverResult {
  return {
    status: "RESOLVED",
    organization_id: "org-1",
    client_company_id: "company-1",
    reference_date: "2026-01-15",
    assignment: {
      id: "asg-1",
      status: "active",
      commercial_price_table_id: "tbl-9",
      valid_from: "2026-01-15",
      valid_to: "2026-12-31",
    },
    ...overrides,
  };
}

function overrideResult(
  overrides: Partial<OverrideResolverResult> = {}
): OverrideResolverResult {
  return {
    status: "RESOLVED",
    organization_id: "org-1",
    client_company_id: "company-1",
    catalog_item_id: "item-1",
    reference_date: "2026-01-15",
    override: {
      id: "ovr-1",
      status: "active",
      valid_from: "2026-01-01",
      valid_to: null,
    },
    item: {
      catalog_item_id: "item-1",
      status: "active",
      item_code_snapshot: "ITM-001",
      item_name_snapshot: "Teclado Mecânico",
      item_type_snapshot: "product",
    },
    price_amount: 92.5,
    currency: "BRL",
    reason: "Desconto por volume",
    provenance: null,
    ...overrides,
  };
}

describe("Assignment resolver UI (CUI-CRES01..03)", () => {
  it("CUI-CRES01: assignment resolver shows RESOLVED with table ID and validity", () => {
    render(
      <MemoryRouter>
        <ResolverResult type="assignment" result={assignmentResult()} loading={false} />
      </MemoryRouter>
    );
    expect(screen.getByText("RESOLVED")).toBeInTheDocument();
    expect(screen.getByText("tbl-9")).toBeInTheDocument();
    expect(screen.getByText("asg-1")).toBeInTheDocument();
    expect(screen.getByText("15/01/2026 — 31/12/2026")).toBeInTheDocument();
  });

  it("CUI-CRES02: assignment resolver shows CLIENT_NOT_FOUND message", () => {
    render(
      <MemoryRouter>
        <ResolverResult
          type="assignment"
          result={assignmentResult({
            status: "CLIENT_NOT_FOUND",
            assignment: undefined,
          })}
          loading={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("CLIENT_NOT_FOUND")).toBeInTheDocument();
    expect(
      screen.getByText("Cliente não encontrado nesta organização.")
    ).toBeInTheDocument();
  });

  it("CUI-CRES03: assignment resolver shows ASSIGNMENT_NOT_FOUND message (not error, not zero)", () => {
    const { container } = render(
      <MemoryRouter>
        <ResolverResult
          type="assignment"
          result={assignmentResult({
            status: "ASSIGNMENT_NOT_FOUND",
            assignment: undefined,
          })}
          loading={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("ASSIGNMENT_NOT_FOUND")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Nenhuma atribuição de tabela vigente para este cliente na data informada."
      )
    ).toBeInTheDocument();
    // A missing assignment is a normal result — no alert role, no price text.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/R\$/);
  });
});

describe("Override resolver UI (CUI-CRES04..09)", () => {
  it("CUI-CRES04: override resolver shows RESOLVED with price, item snapshot, reason", () => {
    render(
      <MemoryRouter>
        <ResolverResult type="override" result={overrideResult()} loading={false} />
      </MemoryRouter>
    );
    expect(screen.getByText("RESOLVED")).toBeInTheDocument();
    expect(screen.getByText("R$ 92,50")).toBeInTheDocument();
    expect(
      screen.getByText("ITM-001 — Teclado Mecânico")
    ).toBeInTheDocument();
    expect(screen.getByText("Desconto por volume")).toBeInTheDocument();
  });

  it("CUI-CRES05: override resolver shows CLIENT_NOT_FOUND message", () => {
    render(
      <MemoryRouter>
        <ResolverResult
          type="override"
          result={overrideResult({
            status: "CLIENT_NOT_FOUND",
            override: undefined,
            item: undefined,
            price_amount: undefined,
            reason: undefined,
          })}
          loading={false}
        />
      </MemoryRouter>
    );
    expect(
      screen.getByText("Cliente não encontrado nesta organização.")
    ).toBeInTheDocument();
  });

  it("CUI-CRES06: override resolver shows ITEM_NOT_FOUND message", () => {
    render(
      <MemoryRouter>
        <ResolverResult
          type="override"
          result={overrideResult({
            status: "ITEM_NOT_FOUND",
            override: undefined,
            item: undefined,
            price_amount: undefined,
            reason: undefined,
          })}
          loading={false}
        />
      </MemoryRouter>
    );
    expect(
      screen.getByText("Item não encontrado no catálogo desta organização.")
    ).toBeInTheDocument();
  });

  it("CUI-CRES07: override resolver shows OVERRIDE_NOT_FOUND message (not R$ 0,00)", () => {
    const { container } = render(
      <MemoryRouter>
        <ResolverResult
          type="override"
          result={overrideResult({
            status: "OVERRIDE_NOT_FOUND",
            override: undefined,
            item: undefined,
            price_amount: undefined,
            reason: undefined,
          })}
          loading={false}
        />
      </MemoryRouter>
    );
    expect(
      screen.getByText(
        "Nenhum preço específico vigente para este item na data informada."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/R\$/);
  });

  it("CUI-CRES08: override resolver shows explicit zero as R$ 0,00 (RESOLVED + price_amount=0)", () => {
    render(
      <MemoryRouter>
        <ResolverResult
          type="override"
          result={overrideResult({ price_amount: 0 })}
          loading={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("RESOLVED")).toBeInTheDocument();
    expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
  });

  it("CUI-CRES09: override resolver shows provenance panel when present", () => {
    render(
      <MemoryRouter>
        <ResolverResult
          type="override"
          result={overrideResult({
            provenance: {
              source_reference_date: "2026-01-10",
              source_commercial_price_table_id: "tbl-src",
              source_commercial_price_table_version_id: "ver-src",
              source_commercial_price_item_id: "itm-src",
              source_table_price_amount: 100,
            },
          })}
          loading={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Referência histórica")).toBeInTheDocument();
    expect(screen.getByText("tbl-src")).toBeInTheDocument();
    expect(screen.getByText("ver-src")).toBeInTheDocument();
    expect(screen.getByText("itm-src")).toBeInTheDocument();
    expect(screen.getByText("R$ 100,00")).toBeInTheDocument();
    expect(screen.getByText("Conferir valores")).toBeInTheDocument();
  });

  it("CUI-CRES09b: provenance absent shows explicit no-reference copy", () => {
    render(
      <MemoryRouter>
        <ResolverResult
          type="override"
          result={overrideResult({ provenance: null })}
          loading={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Sem referência de tabela")).toBeInTheDocument();
    expect(screen.queryByText("Referência histórica")).not.toBeInTheDocument();
  });
});

describe("Lookup page boundary (CUI-CRES10)", () => {
  it("CUI-CRES10: lookup page shows PRC-07 boundary banner text", async () => {
    render(
      <MemoryRouter>
        <ClientLookupPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(
        screen.getByText("Consulta de Precificação do Cliente")
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/será definido pelo motor de resolução do PRC-07/)
    ).toBeInTheDocument();
  });
});
