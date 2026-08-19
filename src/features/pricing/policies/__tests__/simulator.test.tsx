import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SimulationResultView } from "../components/SimulationResult";
import { formatCurrency, formatPercent } from "../utils/format";
import type { SimulationResult } from "../types/pricing-policy.types";

function makeResult(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    status: "OK",
    reason: null,
    base_cost: 80,
    additional_fixed_total: 10,
    additional_percentage_total: 4,
    additional_cost_total: 14,
    total_cost: 94,
    pricing_method: "target_margin",
    calculated_price: 117.5,
    rounded_price: 117.5,
    discount_rate: null,
    discount_amount: null,
    effective_price: 117.5,
    gross_profit: 23.5,
    margin_rate: 0.2,
    markup_rate: 0.25,
    margin_pct: 20,
    markup_pct: 25,
    components: [
      {
        id: "comp-1",
        name: "Taxa de coleta",
        component_type: "fixed",
        fixed_amount: 10,
        rate: null,
        component_amount: 10,
      },
      {
        id: "comp-2",
        name: "Sobretaxa operacional",
        component_type: "percentage_of_base_cost",
        fixed_amount: null,
        rate: 0.05,
        component_amount: 4,
      },
    ],
    rounding: { mode: "none", step: null, applied: false },
    warnings: [],
    violations: [],
    provenance: {
      organization_id: "org-1",
      supplier_company_id: "supplier-1",
      catalog_item_id: "item-1",
      reference_date: "2026-01-15",
      cost: {
        cost_status: "provided",
        cost_table_id: "table-1",
        cost_version_id: "version-1",
        cost_version_number: 3,
        cost_valid_from: "2026-01-01",
        cost_valid_to: "2026-12-31",
      },
      policy: {
        pricing_policy_id: "policy-1",
        pricing_policy_code: "POL-001",
        pricing_policy_name: "Política padrão",
        scope_type: "default",
        pricing_policy_version_id: "pversion-1",
        policy_version_number: 2,
        policy_valid_from: "2026-01-01",
        policy_valid_to: null,
      },
    },
    ...overrides,
  };
}

describe("Simulator result rendering (UI-SIM01..11)", () => {
  it("UI-SIM01: OK result renders header and final price", () => {
    render(<SimulationResultView result={makeResult()} />);

    expect(screen.getAllByText("Preço calculado").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s*117,50/).length).toBeGreaterThan(0);
    expect(screen.getByText("Composição do cálculo")).toBeInTheDocument();
  });

  it("UI-SIM02: VIOLATIONS renders translated violation labels", () => {
    const result = makeResult({
      status: "VIOLATIONS",
      violations: ["BELOW_COST", "DISCOUNT_EXCEEDS_LIMIT"],
    });

    render(<SimulationResultView result={result} />);

    expect(screen.getByText("Preço calculado com violações")).toBeInTheDocument();
    expect(screen.getByText("Preço abaixo do custo total")).toBeInTheDocument();
    expect(screen.getByText("Desconto acima do limite permitido")).toBeInTheDocument();
  });

  it("UI-SIM03: PRICE_NOT_CALCULABLE with COST_NOT_CONFIRMED shows cost message", () => {
    const result = makeResult({
      status: "PRICE_NOT_CALCULABLE",
      reason: "COST_NOT_CONFIRMED",
    });

    render(<SimulationResultView result={result} />);

    expect(screen.getByText("Preço não calculável")).toBeInTheDocument();
    expect(screen.getByText(/custo deste item não está confirmado/)).toBeInTheDocument();
  });

  it("UI-SIM04: POLICY_NOT_FOUND shows guidance", () => {
    const result = makeResult({ status: "POLICY_NOT_FOUND", reason: "No pricing policy resolved" });

    render(<SimulationResultView result={result} />);

    expect(screen.getByText("Nenhuma política aplicável")).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma política de preço ativa/)).toBeInTheDocument();
  });

  it("UI-SIM05: VALIDATION_FAILED shows the reason", () => {
    const result = makeResult({
      status: "VALIDATION_FAILED",
      reason: "Insufficient permissions (requires pricing.calculate)",
    });

    render(<SimulationResultView result={result} />);

    expect(screen.getByText("Falha de validação")).toBeInTheDocument();
    expect(screen.getByText("Insufficient permissions (requires pricing.calculate)")).toBeInTheDocument();
  });

  it("UI-SIM06: ZERO_COST_DENOMINATOR warning renders 'indisponível' — never NaN/Infinity", () => {
    const result = makeResult({
      status: "OK",
      base_cost: 0,
      total_cost: 0,
      calculated_price: 0,
      effective_price: 0,
      markup_rate: null,
      markup_pct: null,
      margin_rate: 0,
      margin_pct: 0,
      warnings: ["ZERO_COST_DENOMINATOR"],
    });

    render(<SimulationResultView result={result} />);

    expect(screen.getByText("Custo zero: markup indisponível")).toBeInTheDocument();
    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
    expect(screen.queryByText("Infinity")).not.toBeInTheDocument();
    expect(screen.getAllByText("indisponível").length).toBeGreaterThanOrEqual(1);
  });

  it("UI-SIM07: UNKNOWN COST (null base_cost) shows 'Custo não confirmado', never R$ 0,00", () => {
    const result = makeResult({
      base_cost: null,
      total_cost: null,
      calculated_price: null,
      effective_price: null,
    });

    render(<SimulationResultView result={result} />);

    expect(screen.getByText("Custo não confirmado")).toBeInTheDocument();
    expect(screen.getByText("Indisponível")).toBeInTheDocument();
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
  });

  it("UI-SIM08: confirmed zero shows R$ 0,00", () => {
    const base = makeResult({
      base_cost: 0,
      total_cost: 0,
      calculated_price: 0,
      effective_price: 0,
    });
    const result = {
      ...base,
      provenance: {
        ...base.provenance,
        cost: { ...base.provenance.cost, cost_status: "confirmed_zero" },
      },
    };

    render(<SimulationResultView result={result} />);

    expect(screen.getAllByText(/R\$\s*0,00/).length).toBeGreaterThan(0);
  });

  it("UI-SIM09: currency formats with pt-BR BRL locale", () => {
    expect(formatCurrency(1234.5)).toBe(`R$\u00A01.234,50`);
    expect(formatCurrency(117.5)).toBe(`R$\u00A0117,50`);
  });

  it("UI-SIM09b: percent formats fractions as pt-BR percentages", () => {
    expect(formatPercent(0.2)).toBe("20%");
    expect(formatPercent(0.05)).toBe("5%");
  });

  it("UI-SIM10: provenance section is rendered with policy and cost version", () => {
    render(<SimulationResultView result={makeResult()} />);

    expect(screen.getByText("Proveniência do cálculo")).toBeInTheDocument();
    expect(screen.getByText("Política padrão")).toBeInTheDocument();
    expect(screen.getByText("POL-001")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("v3")).toBeInTheDocument();
  });

  it("UI-SIM11: components breakdown lists each component with amount", () => {
    render(<SimulationResultView result={makeResult()} />);

    expect(screen.getByText("Taxa de coleta")).toBeInTheDocument();
    expect(screen.getByText("Sobretaxa operacional")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*10,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s*4,00/).length).toBeGreaterThan(0);
  });
});