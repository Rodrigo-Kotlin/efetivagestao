// ============================================================
// CUI-ZERO01..04 — Zero price vs missing price tests.
// CUI-READY01..05 — Publish readiness rendering tests.
// ============================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CommercialPriceResolver } from "../components/CommercialPriceResolver";
import { PublishReadinessPanel } from "../components/PublishReadinessPanel";
import { formatCurrency } from "../utils/format";
import type {
  CommercialPriceResolverResult,
  PublishReadinessResult,
} from "../types/commercial.types";

describe("Zero price vs missing price (CUI-ZERO01..04)", () => {
  it("CUI-ZERO01: explicit price 0 renders R$ 0,00", () => {
    expect(formatCurrency(0)).toBe("R$\u00a00,00");
  });

  it("CUI-ZERO01b: resolver renders R$ 0,00 when RESOLVED with price_amount=0", () => {
    const result: CommercialPriceResolverResult = {
      status: "RESOLVED",
      organization_id: "org-1",
      reference_date: "2026-01-01",
      commercial_price_table_id: "t1",
      catalog_item_id: "c1",
      price_amount: 0,
      currency: "BRL",
    };
    render(
      <MemoryRouter>
        <CommercialPriceResolver
          result={result}
          loading={false}
          error={null}
          onRun={async () => {}}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/R\$\s*0,00/)).toBeInTheDocument();
  });

  it("CUI-ZERO02: PRICE_NOT_FOUND does not render R$ 0,00", () => {
    const result: CommercialPriceResolverResult = {
      status: "PRICE_NOT_FOUND",
      organization_id: "org-1",
      reference_date: "2026-01-01",
      commercial_price_table_id: "t1",
      catalog_item_id: "c1",
    };
    render(
      <MemoryRouter>
        <CommercialPriceResolver
          result={result}
          loading={false}
          error={null}
          onRun={async () => {}}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Item sem preço nesta versão da tabela.")).toBeInTheDocument();
    expect(screen.queryByText(/R\$\s*0,00/)).not.toBeInTheDocument();
  });

  it("CUI-ZERO03: VERSION_NOT_FOUND renders correct state", () => {
    const result: CommercialPriceResolverResult = {
      status: "VERSION_NOT_FOUND",
      organization_id: "org-1",
      reference_date: "2026-01-01",
      commercial_price_table_id: "t1",
      catalog_item_id: "c1",
    };
    render(
      <MemoryRouter>
        <CommercialPriceResolver
          result={result}
          loading={false}
          error={null}
          onRun={async () => {}}
        />
      </MemoryRouter>
    );
    expect(
      screen.getByText("Nenhuma versão válida da tabela na data de referência informada.")
    ).toBeInTheDocument();
  });

  it("CUI-ZERO04: TABLE_NOT_FOUND renders correct state", () => {
    const result: CommercialPriceResolverResult = {
      status: "TABLE_NOT_FOUND",
      organization_id: "org-1",
      reference_date: "2026-01-01",
      commercial_price_table_id: "t1",
      catalog_item_id: "c1",
    };
    render(
      <MemoryRouter>
        <CommercialPriceResolver
          result={result}
          loading={false}
          error={null}
          onRun={async () => {}}
        />
      </MemoryRouter>
    );
    expect(
      screen.getByText("Tabela comercial não encontrada nesta organização.")
    ).toBeInTheDocument();
  });
});

describe("Publish readiness (CUI-READY01..05)", () => {
  it("CUI-READY01: ready state", () => {
    const readiness: PublishReadinessResult = {
      version_id: "v1",
      organization_id: "org-1",
      status: "approved",
      ready: true,
      blockers: [],
      warnings: [],
      item_count: 5,
      pending_exception_count: 0,
      denied_exception_count: 0,
      required_exception_count: 0,
      missing_exception_codes: [],
    };
    render(
      <MemoryRouter>
        <PublishReadinessPanel readiness={readiness} status="approved" />
      </MemoryRouter>
    );
    expect(screen.getByText("Versão pronta para publicação")).toBeInTheDocument();
  });

  it("CUI-READY02: pending exception blocker", () => {
    const readiness: PublishReadinessResult = {
      version_id: "v1",
      organization_id: "org-1",
      status: "approved",
      ready: false,
      blockers: ["PENDING_EXCEPTIONS"],
      warnings: [],
      item_count: 5,
      pending_exception_count: 2,
      denied_exception_count: 0,
      required_exception_count: 0,
      missing_exception_codes: [],
    };
    render(
      <MemoryRouter>
        <PublishReadinessPanel readiness={readiness} status="approved" />
      </MemoryRouter>
    );
    expect(
      screen.getByText("Existem exceções pendentes de decisão.")
    ).toBeInTheDocument();
    expect(screen.getByText("Versão ainda não pode ser publicada")).toBeInTheDocument();
  });

  it("CUI-READY03: denied exception blocker", () => {
    const readiness: PublishReadinessResult = {
      version_id: "v1",
      organization_id: "org-1",
      status: "approved",
      ready: false,
      blockers: ["DENIED_EXCEPTIONS"],
      warnings: [],
      item_count: 5,
      pending_exception_count: 0,
      denied_exception_count: 1,
      required_exception_count: 0,
      missing_exception_codes: [],
    };
    render(
      <MemoryRouter>
        <PublishReadinessPanel readiness={readiness} status="approved" />
      </MemoryRouter>
    );
    expect(
      screen.getByText(/Existem exceções negadas/)
    ).toBeInTheDocument();
  });

  it("CUI-READY04: missing required exception blocker", () => {
    const readiness: PublishReadinessResult = {
      version_id: "v1",
      organization_id: "org-1",
      status: "approved",
      ready: false,
      blockers: ["MISSING_APPROVED_EXCEPTIONS"],
      warnings: [],
      item_count: 5,
      pending_exception_count: 0,
      denied_exception_count: 0,
      required_exception_count: 2,
      missing_exception_codes: ["BELOW_COST"],
    };
    render(
      <MemoryRouter>
        <PublishReadinessPanel readiness={readiness} status="approved" />
      </MemoryRouter>
    );
    expect(screen.getByText("Faltam exceções aprovadas obrigatórias.")).toBeInTheDocument();
    expect(screen.getByText("Preço abaixo do custo")).toBeInTheDocument();
  });

  it("CUI-READY05: version not approved blocker", () => {
    const readiness: PublishReadinessResult = {
      version_id: "v1",
      organization_id: "org-1",
      status: "under_review",
      ready: false,
      blockers: ["VERSION_NOT_APPROVED:under_review"],
      warnings: [],
      item_count: 5,
      pending_exception_count: 0,
      denied_exception_count: 0,
      required_exception_count: 0,
      missing_exception_codes: [],
    };
    render(
      <MemoryRouter>
        <PublishReadinessPanel readiness={readiness} status="under_review" />
      </MemoryRouter>
    );
    expect(screen.getByText("A versão ainda não foi aprovada.")).toBeInTheDocument();
  });
});
