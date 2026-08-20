// ============================================================
// EnginePricePreview — display only the engine preview result.
// Distinguishes recommended price from commercial price.
// ============================================================

import type { CommercialEngineSimulationResult } from "../types/commercial.types";
import { formatCurrency, formatPercent } from "../utils/format";

interface Props {
  simulation: CommercialEngineSimulationResult;
  commercialPriceInput: string;
}

const labelStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--color-text-secondary)",
};

const valueStyle: React.CSSProperties = {
  fontSize: "var(--text-base)",
  color: "var(--color-text)",
  fontWeight: "var(--font-semibold)",
};

function metaItem(label: string, value: string) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <p style={valueStyle}>{value}</p>
    </div>
  );
}

export function EnginePricePreview({ simulation, commercialPriceInput }: Props) {
  const recommended =
    typeof simulation.recommended_price === "number"
      ? simulation.recommended_price
      : typeof simulation.effective_price === "number"
        ? simulation.effective_price
        : null;

  const commercialParsed = commercialPriceInput.trim()
    ? Number(commercialPriceInput.replace(",", "."))
    : null;

  return (
    <div
      role="region"
      aria-label="Prévia do motor de precificação"
      style={{
        backgroundColor: "var(--color-surface-secondary, #F8FAFC)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3)",
      }}
    >
      <h5 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-2)" }}>
        Prévia (informativa)
      </h5>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-3)" }}>
        <div
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2)",
          }}
        >
          <p style={{ ...labelStyle, color: "#7C3AED" }}>Preço recomendado (motor)</p>
          <p style={{ ...valueStyle, color: "#7C3AED" }}>
            {recommended !== null ? formatCurrency(recommended) : "—"}
          </p>
        </div>

        <div
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2)",
          }}
        >
          <p style={{ ...labelStyle, color: "var(--color-primary)" }}>Preço comercial (tabela)</p>
          <p style={{ ...valueStyle, color: "var(--color-primary)" }}>
            {commercialParsed !== null && Number.isFinite(commercialParsed)
              ? formatCurrency(commercialParsed)
              : "—"}
          </p>
        </div>

        {typeof simulation.total_cost === "number" && metaItem("Custo total", formatCurrency(simulation.total_cost))}
        {typeof simulation.margin_rate === "number" && metaItem("Margem", formatPercent(simulation.margin_rate))}
        {typeof simulation.markup_rate === "number" && metaItem("Markup", formatPercent(simulation.markup_rate))}
        {simulation.cost_version_number !== undefined && metaItem("Versão de custo", String(simulation.cost_version_number))}
        {simulation.policy_version_number !== undefined && metaItem("Versão de política", String(simulation.policy_version_number))}
      </div>

      <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
        A proveniência final é registrada no momento do salvamento via RPC autorizado.
      </p>
    </div>
  );
}
