import type { SimulationResult } from "../types/pricing-policy.types";
import { formatCurrency, formatPercent } from "../utils/format";
import { isCostUnknown, isFiniteNumber } from "./simulationHelpers";

interface Props {
  result: SimulationResult;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "var(--space-2) 0",
  borderBottom: "1px solid var(--color-border)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--color-text-secondary)",
};

const valueStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--color-text)",
  fontWeight: "var(--font-medium)",
  fontFamily: "var(--font-mono, monospace)",
};

function row(label: string, value: string, emphasized = false) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={{ ...valueStyle, color: emphasized ? "var(--color-primary)" : undefined, fontSize: emphasized ? "var(--text-lg)" : undefined }}>
        {value}
      </span>
    </div>
  );
}

// UI-SIM07: UNKNOWN COST is displayed as unknown (never R$ 0,00).
export function PricingBreakdown({ result }: Props) {
  const costUnknown = isCostUnknown(result);

  return (
    <div>
      <h3 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-bold)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
        Composição do cálculo
      </h3>

      {result.components && result.components.length > 0 && (
        <div style={{ marginBottom: "var(--space-2)" }}>
          {result.components.map((c) => (
            <div key={c.id} style={rowStyle}>
              <span style={labelStyle}>
                {c.name}
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginLeft: "var(--space-2)" }}>
                  {c.component_type === "fixed" ? `fixo ${formatCurrency(c.fixed_amount)}` : `${formatPercent(c.rate)} sobre custo-base`}
                </span>
              </span>
              <span style={valueStyle}>{formatCurrency(c.component_amount)}</span>
            </div>
          ))}
        </div>
      )}

      {row("Custo-base", costUnknown ? "Custo não confirmado" : formatCurrency(result.base_cost))}
      {row("Adicionais fixos", formatCurrency(result.additional_fixed_total))}
      {row("Adicionais percentuais", formatCurrency(result.additional_percentage_total))}
      {row("Custo total", costUnknown ? "Indisponível" : formatCurrency(result.total_cost))}

      {result.pricing_method && (
        row(
          result.pricing_method === "target_margin"
            ? "Margem-alvo"
            : result.pricing_method === "markup"
              ? "Markup"
              : "Preço fixo",
          result.pricing_method === "target_margin"
            ? formatPercent(result.margin_rate)
            : result.pricing_method === "markup"
              ? formatPercent(result.markup_rate)
              : formatCurrency(result.calculated_price)
        )
      )}

      {row("Preço calculado", formatCurrency(result.calculated_price))}
      {result.rounding.applied && row(
        "Arredondamento",
        `passo ${formatCurrency(result.rounding.step)}`
      )}
      {result.rounding.applied && row("Preço arredondado", formatCurrency(result.rounded_price))}

      {result.discount_rate !== null && result.discount_rate !== undefined && result.discount_rate > 0 && (
        row("Desconto simulado", `${formatPercent(result.discount_rate)} (−${formatCurrency(result.discount_amount)})`)
      )}

      {row("Preço final", formatCurrency(result.effective_price), true)}

      <div style={{ marginTop: "var(--space-3)", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
        <h4 style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-bold)", color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
          Métricas resultantes
        </h4>
        {/* UI-SIM06: never render NaN/Infinity — show "indisponível". */}
        {row("Margem resultante", isFiniteNumber(result.margin_pct) ? formatPercent(result.margin_rate) : "indisponível")}
        {row("Markup resultante", isFiniteNumber(result.markup_pct) ? formatPercent(result.markup_rate) : "indisponível")}
        {row("Lucro bruto", formatCurrency(result.gross_profit))}
      </div>
    </div>
  );
}