// ============================================================
// CUI-NPRC07-01..04 — Regression tests ensuring the client
// lookup implements ONLY component resolvers (PRC-06D) and does
// NOT implement PRC-07 final-price composition:
//   · no fn_resolve_final_client_price / final resolver calls
//   · no assignment+override combination into a single price
//   · no "preço final"/"preço vencedor" result labels
//   · no fallback from OVERRIDE_NOT_FOUND to table price
// ============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ClientLookupPage } from "../pages/ClientLookupPage";
import * as clientPricesApi from "../api/clientPrices";
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

const PROFILE_ROW = {
  company_id: "company-1",
  organization_id: "org-1",
  status: "active",
  commercial_notes: null,
  status_reason: null,
  created_by: "u1",
  created_at: "2026-01-01T00:00:00Z",
  updated_by: "u1",
  updated_at: "2026-01-10T12:00:00Z",
};

const CATALOG_ITEM = {
  id: "item-1",
  code: "ITM-001",
  name: "Teclado Mecânico",
  item_type: "product",
  status: "active",
};

function assignmentNotFound(): AssignmentResolverResult {
  return {
    status: "ASSIGNMENT_NOT_FOUND",
    organization_id: "org-1",
    client_company_id: "company-1",
    reference_date: "2026-01-15",
  };
}

function assignmentResolved(): AssignmentResolverResult {
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
  };
}

function overrideNotFound(): OverrideResolverResult {
  return {
    status: "OVERRIDE_NOT_FOUND",
    organization_id: "org-1",
    client_company_id: "company-1",
    catalog_item_id: "item-1",
    reference_date: "2026-01-15",
  };
}

function overrideResolved(): OverrideResolverResult {
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
  };
}

/** Renders the lookup page, selects client + catalog item, runs both consults. */
async function renderLookupAndRunBothConsults() {
  const utils = render(
    <MemoryRouter>
      <ClientLookupPage />
    </MemoryRouter>
  );

  // Wait until the client select is populated from the mocked profiles read.
  const clientSelect = (await screen.findByLabelText(
    "Cliente"
  )) as HTMLSelectElement;
  await waitFor(() => {
    expect(clientSelect.options.length).toBeGreaterThan(1);
  });
  fireEvent.change(clientSelect, { target: { value: "company-1" } });

  // Pick a catalog item so the override consult becomes available.
  fireEvent.click(await screen.findByRole("option", { name: /ITM-001/ }));

  fireEvent.click(screen.getByText("Consultar atribuição"));
  fireEvent.click(screen.getByText("Consultar override"));

  return utils;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.rpc.mockReset();
  h.rpc.mockResolvedValue({ data: null, error: null });
  // Profiles read (range-terminated) returns one client; catalog items
  // (order-terminated) and count queries share the generic list result.
  // Profiles read (.range-terminated) returns one client; catalog items
  // (.order-terminated) and count queries share the generic list result.
  h.state.range = { data: [PROFILE_ROW], error: null, count: 1 };
  h.state.list = { data: [CATALOG_ITEM], error: null, count: 1 };
  h.state.single = { data: null, error: null };
  canMock = () => true;
});

describe("No PRC-07 implementation in the lookup page (CUI-NPRC07-01..04)", () => {
  it("CUI-NPRC07-01: lookup page does not call fn_resolve_final_client_price or any final resolver", async () => {
    h.rpc.mockResolvedValue({ data: assignmentNotFound(), error: null });
    await renderLookupAndRunBothConsults();

    await screen.findAllByText("ASSIGNMENT_NOT_FOUND");

    // Static layer: the API module exports no final-price resolver at all.
    const apiKeys = Object.keys(clientPricesApi);
    expect(apiKeys.filter((k) => /final/i.test(k))).toEqual([]);

    // Dynamic: every RPC issued by the page is one of the two component
    // resolvers — never a final/composed price resolver.
    const calledFns = h.rpc.mock.calls.map((call) => String(call[0]));
    expect(calledFns.length).toBeGreaterThanOrEqual(1);
    for (const fnName of calledFns) {
      expect([
        "fn_resolve_client_table_assignment",
        "fn_resolve_client_price_override",
      ]).toContain(fnName);
    }
    expect(calledFns.some((fnName) => fnName.includes("final"))).toBe(false);
    expect(calledFns).not.toContain("fn_resolve_final_client_price");
  });

  it("CUI-NPRC07-02: lookup page does not combine assignment + override into one price", async () => {
    h.rpc.mockImplementation((fnName: unknown) => {
      if (fnName === "fn_resolve_client_table_assignment") {
        return Promise.resolve({ data: assignmentResolved(), error: null });
      }
      return Promise.resolve({ data: overrideResolved(), error: null });
    });
    const { container } = await renderLookupAndRunBothConsults();
    await screen.findAllByText("RESOLVED");

    // Two independent resolver cards — never a merged price block.
    expect(screen.getAllByText("Status:")).toHaveLength(2);
    expect(screen.queryByText(/vencedor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Preço final:?$/i)).not.toBeInTheDocument();
    // The page explicitly disclaims final-price composition.
    expect(container.textContent).toMatch(/ainda não é calculado nesta fase/);
  });

  it("CUI-NPRC07-03: lookup page does not label either result as 'preço final' or 'preço vencedor'", async () => {
    h.rpc.mockImplementation((fnName: unknown) => {
      if (fnName === "fn_resolve_client_table_assignment") {
        return Promise.resolve({ data: assignmentResolved(), error: null });
      }
      return Promise.resolve({ data: overrideResolved(), error: null });
    });
    const { container } = await renderLookupAndRunBothConsults();
    await screen.findAllByText("RESOLVED");

    expect(screen.queryByText(/preço vencedor/i)).not.toBeInTheDocument();

    // Every "preço final" mention must be an explicit deferral/disclaimer
    // (not computed here), never a result label.
    const text = container.textContent ?? "";
    const occurrences = text.match(/pre[çc]o final[^.]*/gi) ?? [];
    expect(occurrences.length).toBeGreaterThan(0);
    for (const occurrence of occurrences) {
      expect(occurrence).toMatch(/não é calculado|será definido pelo motor/i);
    }
  });

  it("CUI-NPRC07-04: lookup page does not fallback from OVERRIDE_NOT_FOUND to commercial table price", async () => {
    h.rpc.mockImplementation((fnName: unknown) => {
      if (fnName === "fn_resolve_client_table_assignment") {
        return Promise.resolve({ data: assignmentResolved(), error: null });
      }
      return Promise.resolve({ data: overrideNotFound(), error: null });
    });
    const { container } = await renderLookupAndRunBothConsults();
    await screen.findByText("OVERRIDE_NOT_FOUND");

    // The override card shows the explicit NOT_FOUND copy…
    expect(
      screen.getByText(
        "Nenhum preço específico vigente para este item na data informada."
      )
    ).toBeInTheDocument();
    // …even though a table assignment IS known (tbl-9 displayed above)…
    expect(screen.getByText("tbl-9")).toBeInTheDocument();
    // …no currency value is rendered anywhere: no silent table fallback.
    expect(container.textContent).not.toMatch(/R\$/);
  });
});
