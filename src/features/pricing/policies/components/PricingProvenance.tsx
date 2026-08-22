import type { SimulationResult } from "../types/pricing-policy.types";
import { formatDate } from "../utils/format";
import { DetailGrid, DetailField } from "@/components/ui/DetailGrid";
import { Section } from "@/components/layout/Section";

// UI-SIM10: full provenance of the calculation.
export function PricingProvenance({ result }: { result: SimulationResult }) {
  const { provenance } = result;
  const scopeLabel = provenance.policy?.scope_type === "default"
    ? "Padrão"
    : provenance.policy?.scope_type === "category"
      ? "Categoria"
      : provenance.policy?.scope_type === "catalog_item"
        ? "Item do catálogo"
        : null;

  return (
    <Section title="Rastreabilidade do cálculo" description="Detalhes técnicos da resolução executada pelo motor de precificação.">
      <DetailGrid columns={3}>
        {provenance.policy?.pricing_policy_name ? (
          <DetailField label="Política aplicada" value={provenance.policy.pricing_policy_name} />
        ) : null}
        {provenance.policy?.pricing_policy_code ? (
          <DetailField label="Código da política" value={provenance.policy.pricing_policy_code} mono />
        ) : null}
        {scopeLabel ? <DetailField label="Escopo" value={scopeLabel} /> : null}
        {provenance.policy?.policy_version_number !== null && provenance.policy?.policy_version_number !== undefined ? (
          <DetailField label="Versão da política" value={`v${provenance.policy.policy_version_number}`} />
        ) : null}
        {provenance.cost?.cost_version_number !== null && provenance.cost?.cost_version_number !== undefined ? (
          <DetailField label="Versão de custo" value={`v${provenance.cost.cost_version_number}`} />
        ) : null}
        {provenance.cost?.cost_valid_from ? (
          <DetailField
            label="Vigência do custo"
            value={`${formatDate(provenance.cost.cost_valid_from)} — ${formatDate(provenance.cost.cost_valid_to)}`}
            span={2}
          />
        ) : null}
        <DetailField label="Data de referência" value={formatDate(provenance.reference_date)} />
      </DetailGrid>
    </Section>
  );
}

// Silence unused warning when Section is not directly referenced
void Section;
