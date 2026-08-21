// ============================================================
// CUI-ZERO01..05 — Zero vs missing semantics for the override
// resolver. An explicit price_amount=0 is a real RESOLVED price
// rendered as "R$ 0,00"; OVERRIDE_NOT_FOUND is a missing price,
// never rendered as zero and never as "Sem preço".
// ============================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ResolverResult } from "../components/ResolverResult";
import type { OverrideResolverResult } from "../types/client.types";

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

function renderOverride(result: OverrideResolverResult | null) {
  return render(
    <MemoryRouter>
      <ResolverResult type="override" result={result} loading={false} />
    </MemoryRouter>
  );
}

describe("Zero vs missing semantics (CUI-ZERO01..05)", () => {
  it("CUI-ZERO01: override resolver with price_amount=0 displays 'R$ 0,00'", () => {
    renderOverride(overrideResult({ price_amount: 0 }));
    expect(screen.getByText("RESOLVED")).toBeInTheDocument();
    expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
  });

  it("CUI-ZERO02: OVERRIDE_NOT_FOUND never displays 'R$ 0,00'", () => {
    const { container } = renderOverride(
      overrideResult({
        status: "OVERRIDE_NOT_FOUND",
        override: undefined,
        item: undefined,
        price_amount: undefined,
        reason: undefined,
      })
    );
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/R\$/);
  });

  it("CUI-ZERO03: OVERRIDE_NOT_FOUND shows 'Nenhum preço específico' or similar message", () => {
    renderOverride(
      overrideResult({
        status: "OVERRIDE_NOT_FOUND",
        override: undefined,
        item: undefined,
        price_amount: undefined,
        reason: undefined,
      })
    );
    expect(
      screen.getByText(
        "Nenhum preço específico vigente para este item na data informada."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("OVERRIDE_NOT_FOUND")).toBeInTheDocument();
  });

  it("CUI-ZERO04: zero override displays zero in currency format, not 'Sem preço'", () => {
    const { container } = renderOverride(overrideResult({ price_amount: 0 }));
    expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
    expect(screen.queryByText("Sem preço")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Sem preço/i);
  });

  it("CUI-ZERO05: missing override displays NOT_FOUND message, not zero", () => {
    renderOverride(
      overrideResult({
        status: "OVERRIDE_NOT_FOUND",
        override: undefined,
        item: undefined,
        price_amount: undefined,
        reason: undefined,
      })
    );
    expect(
      screen.getByText(
        "Nenhum preço específico vigente para este item na data informada."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
    expect(screen.getByText("OVERRIDE_NOT_FOUND")).toBeInTheDocument();
  });
});
