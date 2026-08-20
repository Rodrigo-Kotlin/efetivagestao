// ============================================================
// CommercialItemProvenance — display engine provenance for an item.
// Reads from stored row, not from preview response.
// ============================================================

import { CommercialCodeBadge, CommercialOriginBadge } from "./CommercialBadges";
import type { CommercialPriceItem } from "../types/commercial.types";
import { formatCurrency, formatDate, formatPercent } from "../utils/format";

interface Props {
  item: CommercialPriceItem;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface-secondary, #F8FAFC)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-3)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--color-text-secondary)",
};

const valueStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--color-text)",
  fontWeight: "var(--font-medium)",
};

function metaItem(label: string, value: string) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <p style={valueStyle}>{value}</p>
    </div>
  );
}

export function CommercialItemProvenance({ item }: Props) {
  const hasEngine = item.origin_type === "pricing_engine";
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
        <CommercialCodeBadge code={item.item_code_snapshot} />
        <CommercialOriginBadge origin={item.origin_type} />
        <strong>{formatCurrency(item.price_amount)}</strong>
      </div>

      {hasEngine ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)" }}>
          {metaItem("Data de referência", formatDate(item.source_reference_date))}
          {item.source_supplier_company_id && metaItem("Fornecedor (ID)", item.source_supplier_company_id)}
          {item.source_cost_version_number !== null && metaItem("Versão de custo", String(item.source_cost_version_number))}
          {item.source_policy_version_number !== null && metaItem("Versão de política", String(item.source_policy_version_number))}
          {item.source_calculated_price !== null && metaItem("Preço calculado", formatCurrency(item.source_calculated_price))}
          {item.source_effective_price !== null && metaItem("Preço efetivo recomendado", formatCurrency(item.source_effective_price))}
          {item.source_total_cost !== null && metaItem("Custo total", formatCurrency(item.source_total_cost))}
          {item.source_margin_rate !== null && metaItem("Margem", formatPercent(item.source_margin_rate))}
          {item.source_markup_rate !== null && metaItem("Markup", formatPercent(item.source_markup_rate))}
        </div>
      ) : (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
          Item de origem manual. Nenhuma proveniência de motor registrada.
        </p>
      )}

      {item.source_commercial_price_item_id && (
        <p
          style={{
            marginTop: "var(--space-2)",
            color: "var(--color-text-secondary)",
            fontSize: "var(--text-xs)",
          }}
        >
          Herdado da versão anterior
        </p>
      )}
    </div>
  );
}
