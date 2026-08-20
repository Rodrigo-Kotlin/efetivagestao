// ============================================================
// CommercialPriceResolver — UI for fn_resolve_commercial_table_price.
// Renders all 4 result states (RESOLVED, TABLE_NOT_FOUND,
// VERSION_NOT_FOUND, PRICE_NOT_FOUND) with explicit copy.
// ============================================================

import { CommercialCodeBadge, CommercialOriginBadge, CommercialTableStatusBadge, CommercialVersionStatusBadge } from "./CommercialBadges";
import type {
  CommercialPriceResolverResult,
  CommercialResolverStatus,
} from "../types/commercial.types";
import { formatCurrency, formatDate, formatPercent } from "../utils/format";

interface Props {
  result: CommercialPriceResolverResult | null;
  loading: boolean;
  error: string | null;
  onRun: () => Promise<void>;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4)",
};

export function CommercialPriceResolver({ result, loading, error, onRun }: Props) {
  return (
    <div>
      <button
        type="button"
        onClick={() => void onRun()}
        disabled={loading}
        style={{
          padding: "var(--space-2) var(--space-4)",
          backgroundColor: "var(--color-primary)",
          color: "var(--color-text-inverse)",
          border: "none",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-medium)",
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Consultando..." : "Consultar preço"}
      </button>

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)",
            marginTop: "var(--space-3)",
          }}
        >
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
        </div>
      )}

      {result && <ResolverBody result={result} />}
    </div>
  );
}

function ResolverBody({ result }: { result: CommercialPriceResolverResult }) {
  const status = result.status;
  return (
    <div style={{ ...cardStyle, marginTop: "var(--space-3)" }}>
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginBottom: "var(--space-2)" }}>
        <strong>Status:</strong>
        <span style={{ color: statusColor(status) }}>{describeStatus(status)}</span>
      </div>

      {result.table && (
        <div style={{ marginBottom: "var(--space-2)" }}>
          <CommercialCodeBadge code={result.table.code} />
          <strong style={{ marginLeft: "var(--space-2)" }}>{result.table.name}</strong>
          <CommercialTableStatusBadge status={result.table.status} />
        </div>
      )}

      {result.version && (
        <div style={{ marginBottom: "var(--space-2)" }}>
          Versão v{result.version.version_number} · Vigência {formatDate(result.version.valid_from)} — {formatDate(result.version.valid_to)}{" "}
          <CommercialVersionStatusBadge status={result.version.status} />
        </div>
      )}

      {status === "RESOLVED" && result.item && (
        <div style={{ marginBottom: "var(--space-2)" }}>
          <CommercialCodeBadge code={result.item.item_code_snapshot} />
          <strong style={{ marginLeft: "var(--space-2)" }}>{result.item.item_name_snapshot}</strong>
          {result.origin_type && <CommercialOriginBadge origin={result.origin_type} />}
        </div>
      )}

      {status === "RESOLVED" && typeof result.price_amount === "number" && (
        <p style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-primary)", margin: "var(--space-2) 0" }}>
          {formatCurrency(result.price_amount)}{" "}
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", fontWeight: "var(--font-normal)" }}>
            {result.currency}
          </span>
        </p>
      )}

      {status === "PRICE_NOT_FOUND" && (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
          Item sem preço nesta versão da tabela.
        </p>
      )}

      {status === "VERSION_NOT_FOUND" && (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
          Nenhuma versão válida da tabela na data de referência informada.
        </p>
      )}

      {status === "TABLE_NOT_FOUND" && (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
          Tabela comercial não encontrada nesta organização.
        </p>
      )}

      {status === "RESOLVED" && result.provenance && (
        <details
          style={{
            marginTop: "var(--space-3)",
            padding: "var(--space-2) var(--space-3)",
            backgroundColor: "var(--color-surface-secondary, #F8FAFC)",
            border: "1px solid var(--color-border-light, #F1F5F9)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <summary style={{ cursor: "pointer", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}>
            Proveniência
          </summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            {result.provenance.source_reference_date && <div>Data de referência: {formatDate(result.provenance.source_reference_date)}</div>}
            {result.provenance.source_cost_version_number !== null && <div>Versão de custo: v{result.provenance.source_cost_version_number}</div>}
            {result.provenance.source_policy_version_number !== null && <div>Versão de política: v{result.provenance.source_policy_version_number}</div>}
            {result.provenance.source_calculated_price !== null && <div>Preço calculado: {formatCurrency(result.provenance.source_calculated_price)}</div>}
            {result.provenance.source_effective_price !== null && <div>Preço efetivo: {formatCurrency(result.provenance.source_effective_price)}</div>}
            {result.provenance.source_total_cost !== null && <div>Custo total: {formatCurrency(result.provenance.source_total_cost)}</div>}
            {result.provenance.source_margin_rate !== null && <div>Margem: {formatPercent(result.provenance.source_margin_rate)}</div>}
            {result.provenance.source_markup_rate !== null && <div>Markup: {formatPercent(result.provenance.source_markup_rate)}</div>}
          </div>
        </details>
      )}

      {result.lineage?.source_commercial_price_item_id && (
        <p style={{ marginTop: "var(--space-2)", color: "var(--color-text-secondary)", fontSize: "var(--text-xs)" }}>
          Herdado da versão anterior
        </p>
      )}
    </div>
  );
}

function statusColor(status: CommercialResolverStatus): string {
  if (status === "RESOLVED") return "#16A34A";
  return "#DC2626";
}

function describeStatus(status: CommercialResolverStatus): string {
  switch (status) {
    case "RESOLVED":
      return "Resolvido";
    case "TABLE_NOT_FOUND":
      return "Tabela não encontrada";
    case "VERSION_NOT_FOUND":
      return "Versão não encontrada";
    case "PRICE_NOT_FOUND":
      return "Preço não encontrado";
  }
}

// Exported for testability
export function _internalZeroIsZero(text: string): string {
  return text;
}
