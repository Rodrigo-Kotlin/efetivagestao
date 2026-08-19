import type { SimulationResult } from "../types/pricing-policy.types";
import { formatDate } from "../utils/format";

interface Props {
  result: SimulationResult;
}

const labelStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--color-text-secondary)",
  marginBottom: "2px",
};

const valueStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--color-text)",
  fontWeight: "var(--font-medium)",
};

function item(label: string, value: string) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <p style={valueStyle}>{value}</p>
    </div>
  );
}

// UI-SIM10: full provenance of the calculation.
export function PricingProvenance({ result }: Props) {
  const { provenance } = result;

  return (
    <div style={{ backgroundColor: "var(--color-surface-secondary, #F9FAFB)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-4)", marginTop: "var(--space-4)" }}>
      <h4 style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-bold)", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-3)" }}>
        Proveniência do cálculo
      </h4>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
        {provenance.policy?.pricing_policy_name && item("Política aplicada", provenance.policy.pricing_policy_name)}
        {provenance.policy?.pricing_policy_code && item("Código da política", provenance.policy.pricing_policy_code)}
        {provenance.policy?.scope_type && item(
          "Escopo",
          provenance.policy.scope_type === "default" ? "Padrão" : provenance.policy.scope_type === "category" ? "Categoria" : "Item do catálogo"
        )}
        {provenance.policy?.policy_version_number !== null && provenance.policy?.policy_version_number !== undefined && (
          item("Versão da política", `v${provenance.policy.policy_version_number}`)
        )}
        {provenance.cost?.cost_version_number !== null && provenance.cost?.cost_version_number !== undefined && (
          item("Versão de custo", `v${provenance.cost.cost_version_number}`)
        )}
        {provenance.cost?.cost_valid_from && item("Vigência do custo", `${formatDate(provenance.cost.cost_valid_from)} — ${formatDate(provenance.cost.cost_valid_to)}`)}
        {item("Data de referência", formatDate(provenance.reference_date))}
      </div>
    </div>
  );
}