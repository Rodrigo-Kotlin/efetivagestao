import type { SimulationResult } from "../types/pricing-policy.types";
import { formatCurrency, formatPercent } from "../utils/format";
import { isCostUnknown, isFiniteNumber } from "./simulationHelpers";
import { DetailGrid, DetailField } from "@/components/ui/DetailGrid";
import { MetricCard } from "@/components/ui/MetricCard";
import { Section } from "@/components/layout/Section";

interface Props {
  result: SimulationResult;
}

// UI-SIM07: UNKNOWN COST is displayed as unknown (never R$ 0,00).
export function PricingBreakdown({ result }: Props) {
  const costUnknown = isCostUnknown(result);
  const hasRecommended = isFiniteNumber(result.effective_price);

  return (
    <Section title="Composição do cálculo">
      {hasRecommended ? (
        <MetricCard
          surface="tonal"
          label="Preço recomendado"
          value={formatCurrency(result.effective_price)}
        />
      ) : null}

      {result.components && result.components.length > 0 ? (
        <div style={{ marginTop: "var(--md-sys-spacing-4)" }}>
          <DetailGrid columns={2}>
            {result.components.map((c) => (
              <DetailField
                key={c.id}
                label={c.name}
                value={
                  c.component_type === "fixed"
                    ? `${formatCurrency(c.component_amount)} (fixo)`
                    : `${formatCurrency(c.component_amount)} (${formatPercent(c.rate)} sobre custo-base)`
                }
                mono
              />
            ))}
          </DetailGrid>
        </div>
      ) : null}

      <div style={{ marginTop: "var(--md-sys-spacing-4)" }}>
        <DetailGrid columns={2}>
          <DetailField label="Custo-base" value={costUnknown ? "Custo não confirmado" : formatCurrency(result.base_cost)} mono />
          <DetailField label="Adicionais fixos" value={formatCurrency(result.additional_fixed_total)} mono />
          <DetailField label="Adicionais percentuais" value={formatCurrency(result.additional_percentage_total)} mono />
          <DetailField label="Custo total" value={costUnknown ? "Indisponível" : formatCurrency(result.total_cost)} mono />
        </DetailGrid>
      </div>

      {result.pricing_method ? (
        <div style={{ marginTop: "var(--md-sys-spacing-4)" }}>
          <DetailGrid columns={2}>
            <DetailField
              label={
                result.pricing_method === "target_margin"
                  ? "Margem-alvo"
                  : result.pricing_method === "markup"
                    ? "Markup"
                    : "Preço fixo"
              }
              value={
                result.pricing_method === "target_margin"
                  ? formatPercent(result.margin_rate)
                  : result.pricing_method === "markup"
                    ? formatPercent(result.markup_rate)
                    : formatCurrency(result.calculated_price)
              }
              mono
            />
            <DetailField label="Preço calculado" value={formatCurrency(result.calculated_price)} mono />
          </DetailGrid>
        </div>
      ) : null}

      {result.rounding.applied ? (
        <div style={{ marginTop: "var(--md-sys-spacing-4)" }}>
          <DetailGrid columns={2}>
            <DetailField label="Arredondamento" value={`passo ${formatCurrency(result.rounding.step)}`} mono />
            <DetailField label="Preço arredondado" value={formatCurrency(result.rounded_price)} mono />
          </DetailGrid>
        </div>
      ) : null}

      {result.discount_rate !== null && result.discount_rate !== undefined && result.discount_rate > 0 ? (
        <div style={{ marginTop: "var(--md-sys-spacing-4)" }}>
          <DetailField
            label="Desconto simulado"
            value={`${formatPercent(result.discount_rate)} (−${formatCurrency(result.discount_amount)})`}
            mono
          />
        </div>
      ) : null}

      <div style={{ marginTop: "var(--md-sys-spacing-5)" }}>
        <h4 style={{ fontSize: "var(--md-sys-typescale-title-small-size)", color: "var(--md-sys-color-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "var(--md-sys-spacing-3)" }}>
          Métricas resultantes
        </h4>
        <DetailGrid columns={3}>
          {/* UI-SIM06: never render NaN/Infinity — show "indisponível". */}
          <DetailField
            label="Margem resultante"
            value={isFiniteNumber(result.margin_pct) ? formatPercent(result.margin_rate) : "indisponível"}
            mono
          />
          <DetailField
            label="Markup resultante"
            value={isFiniteNumber(result.markup_pct) ? formatPercent(result.markup_rate) : "indisponível"}
            mono
          />
          <DetailField label="Lucro bruto" value={formatCurrency(result.gross_profit)} mono />
        </DetailGrid>
      </div>
    </Section>
  );
}

// Silence unused warning when Section is not directly referenced
void Section;
