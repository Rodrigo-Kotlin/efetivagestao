import { COST_ITEM_STATUSES, COST_VERSION_STATUSES } from "@/types";
import type { CostTableVersionWithItems } from "@/types";

interface Props {
  version: CostTableVersionWithItems;
  onAction: (action: string) => void;
  permissions?: {
    canSubmit?: boolean;
    canApprove?: boolean;
    canPublish?: boolean;
  };
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
  marginBottom: "var(--space-6)",
};

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

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
};

const formatCurrency = (amount: number | null, currency: string) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency === "BRL" ? "BRL" : currency,
  }).format(amount);
};

export function VersionDetail({ version, onAction, permissions = {} }: Props) {
  const { canSubmit = false, canApprove = false, canPublish = false } = permissions;
  const isDraft = version.status === "draft";
  const isUnderReview = version.status === "under_review";
  const isApproved = version.status === "approved";
  const isTerminal = ["scheduled", "active", "superseded", "cancelled"].includes(version.status);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
            Versão {version.version_number}
            {version.version_label && (
              <span style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-normal)", color: "var(--color-text-secondary)", marginLeft: "var(--space-2)" }}>
                — {version.version_label}
              </span>
            )}
          </h1>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {(() => {
              const statusInfo = COST_VERSION_STATUSES.find((s) => s.value === version.status);

              return statusInfo ? (
                <span style={{
                  display: "inline-block",
                  padding: "2px 10px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--font-medium)",
                  backgroundColor: `${statusInfo.color}20`,
                  color: statusInfo.color,
                }}>
                  {statusInfo.label}
                </span>
              ) : null;
            })()}
            {version.valid_from && (
              <span style={{
                display: "inline-block",
                padding: "2px 10px",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--font-medium)",
                backgroundColor: "#EFF6FF",
                color: "#1E40AF",
              }}>
                {formatDate(version.valid_from)} — {formatDate(version.valid_to)}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {isDraft && canSubmit && (
            <button
              onClick={() => onAction("submit")}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "var(--color-primary)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Enviar para Revisão
            </button>
          )}
          {isUnderReview && canApprove && (
            <button
              onClick={() => onAction("approve")}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "#8B5CF6",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Aprovar
            </button>
          )}
          {isApproved && canPublish && (
            <button
              onClick={() => onAction("publish")}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "#10B981",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Publicar
            </button>
          )}
          {!isTerminal && (
            <button
              onClick={() => onAction("compare")}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Comparar com versão anterior
            </button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", color: "var(--color-text)", marginBottom: "var(--space-4)" }}>
          Metadados
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
          <div>
            <p style={labelStyle}>Data de Origem</p>
            <p style={valueStyle}>{formatDate(version.source_date)}</p>
          </div>
          <div>
            <p style={labelStyle}>Itens</p>
            <p style={valueStyle}>{version.items?.length ?? 0}</p>
          </div>
          <div>
            <p style={labelStyle}>Criado por</p>
            <p style={valueStyle}>{version.created_by?.slice(0, 8) ?? "—"}</p>
          </div>
          <div>
            <p style={labelStyle}>Aprovado por</p>
            <p style={valueStyle}>{version.approved_by?.slice(0, 8) ?? "—"}</p>
          </div>
          <div>
            <p style={labelStyle}>Publicado por</p>
            <p style={valueStyle}>{version.published_by?.slice(0, 8) ?? "—"}</p>
          </div>
          <div>
            <p style={labelStyle}>Observações</p>
            <p style={valueStyle}>{version.notes ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", color: "var(--color-text)", marginBottom: "var(--space-4)" }}>
          Itens ({version.items.length})
        </h3>
        {version.items.length === 0 ? (
          <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "var(--space-8) 0" }}>
            Nenhum item nesta versão.
          </p>
        ) : (
          <div style={{ display: "block", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Código Efetiva</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Item</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Código Fornecedor</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Descrição Fornecedor</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Status Custo</th>
                  <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Custo</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Moeda</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Observação</th>
                </tr>
              </thead>
              <tbody>
                {version.items.map((item) => {
                  const costStatus = COST_ITEM_STATUSES.find((s) => s.value === item.cost_status);

                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "var(--space-3)", fontFamily: "monospace" }}>
                        {item.catalog_item_id?.slice(0, 8) ?? "—"}
                      </td>
                      <td style={{ padding: "var(--space-3)", fontWeight: "var(--font-medium)" }}>
                        {item.supplier_catalog_item_id?.slice(0, 8) ?? "—"}
                      </td>
                      <td style={{ padding: "var(--space-3)", fontFamily: "monospace", fontSize: "var(--text-xs)" }}>
                        {item.supplier_catalog_item_id?.slice(0, 8) ?? "—"}
                      </td>
                      <td style={{ padding: "var(--space-3)", fontSize: "var(--text-xs)" }}>
                        —
                      </td>
                      <td style={{ padding: "var(--space-3)" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-full)",
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-medium)",
                          backgroundColor: costStatus?.color ? `${costStatus.color}20` : "#E5E7EB",
                          color: costStatus?.color ?? "#6B7280",
                        }}>
                          {costStatus?.label ?? item.cost_status}
                        </span>
                      </td>
                      <td style={{ padding: "var(--space-3)", textAlign: "right", fontFamily: "monospace" }}>
                        {formatCurrency(item.amount, item.currency_code)}
                      </td>
                      <td style={{ padding: "var(--space-3)", fontFamily: "monospace" }}>
                        {item.currency_code}
                      </td>
                      <td style={{ padding: "var(--space-3)", fontSize: "var(--text-xs)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
