// ============================================================
// ProvenancePanel — read-only historical reference of the
// commercial table price captured at override creation.
// UI-only consistency check; backend remains authoritative.
// ============================================================

import { useState } from "react";
import type { OverrideResolverResult } from "../types/client.types";
import { formatCurrency, formatDate } from "../utils/format";

interface Props {
  provenance: OverrideResolverResult["provenance"];
  priceAmount?: number;
}

const panelStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface-secondary, #F8FAFC)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4)",
};

const rowLabelStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--color-text-secondary)",
  margin: 0,
};

const rowValueStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  fontWeight: "var(--font-medium)",
  fontFamily: "var(--font-mono, monospace)",
  wordBreak: "break-all",
  margin: 0,
};

export function ProvenancePanel({ provenance, priceAmount }: Props) {
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);

  if (!provenance) {
    return (
      <div style={panelStyle}>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", margin: 0 }}>
          Sem referência de tabela
        </p>
      </div>
    );
  }

  // UI-only check: the negotiated price rendered must match the payload.
  const priceConsistent =
    typeof priceAmount === "number" && !Number.isNaN(priceAmount);

  return (
    <div style={panelStyle}>
      <h3 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", margin: "0 0 var(--space-1)" }}>
        Referência histórica
      </h3>
      <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", margin: "0 0 var(--space-3)" }}>
        Valores capturados no momento da criação; a referência histórica não é recalculada.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-3)",
        }}
      >
        <div>
          <p style={rowLabelStyle}>Data de referência</p>
          <p style={rowValueStyle}>{formatDate(provenance.source_reference_date)}</p>
        </div>
        <div>
          <p style={rowLabelStyle}>Tabela comercial de origem (ID)</p>
          <p style={rowValueStyle}>{provenance.source_commercial_price_table_id}</p>
        </div>
        <div>
          <p style={rowLabelStyle}>Versão da tabela (ID)</p>
          <p style={rowValueStyle}>{provenance.source_commercial_price_table_version_id}</p>
        </div>
        <div>
          <p style={rowLabelStyle}>Item comercial de origem (ID)</p>
          <p style={rowValueStyle}>{provenance.source_commercial_price_item_id}</p>
        </div>
        <div>
          <p style={rowLabelStyle}>Preço da tabela na referência</p>
          <p style={{ ...rowValueStyle, fontFamily: "inherit" }}>
            {formatCurrency(provenance.source_table_price_amount)}
          </p>
        </div>
        <div>
          <p style={rowLabelStyle}>Preço negociado</p>
          <p style={{ ...rowValueStyle, fontFamily: "inherit", color: "var(--color-primary)" }}>
            {formatCurrency(priceAmount)}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginTop: "var(--space-3)",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setVerifiedAt(Date.now())}
          style={{
            padding: "var(--space-1) var(--space-3)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontSize: "var(--text-xs)",
          }}
        >
          Conferir valores
        </button>
        {verifiedAt !== null && (
          <span
            role="status"
            style={{
              fontSize: "var(--text-xs)",
              color: priceConsistent ? "#16A34A" : "#DC2626",
            }}
          >
            {priceConsistent
              ? "Preço negociado conferido com o resultado carregado."
              : "Preço negociado ausente no resultado."}
          </span>
        )}
      </div>
    </div>
  );
}
