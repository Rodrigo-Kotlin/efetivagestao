import type { SupplierMappingWithCatalogItem } from "@/types";
import { MAPPING_STATUSES } from "@/types";

interface Props {
  mappings: SupplierMappingWithCatalogItem[];
  onPreferred?: (id: string) => void;
  onInactivate?: (id: string) => void;
  loading?: boolean;
}

const emptyStateStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-8)",
  textAlign: "center",
};

export function MappingList({ mappings, onPreferred, onInactivate, loading }: Props) {
  if (loading) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Carregando mapeamentos...
      </div>
    );
  }

  if (mappings.length === 0) {
    return (
      <div style={emptyStateStyle}>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Nenhum mapeamento cadastrado para este fornecedor.
        </p>
      </div>
    );
  }

  const formatDate = (val: string | null) => {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("pt-BR");
  };

  return (
    <div style={{ display: "block", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
            {["Item Efetiva", "Código Externo", "Descrição Externa", "Unidade", "Preferencial", "Status", "Vigência", "Ações"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)", whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mappings.map((m) => {
            const statusInfo = MAPPING_STATUSES.find((s) => s.value === m.status);
            const validFrom = formatDate(m.valid_from);
            const validTo = formatDate(m.valid_to);
            const validity = validFrom !== "—" || validTo !== "—"
              ? `${validFrom} — ${validTo}`
              : "—";

            return (
              <tr key={m.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={{ padding: "var(--space-3)", fontWeight: "var(--font-medium)" }}>
                  {m.catalog_item?.name ?? "—"}
                </td>
                <td style={{ padding: "var(--space-3)", fontFamily: "monospace" }}>
                  {m.external_code ?? "—"}
                </td>
                <td style={{ padding: "var(--space-3)" }}>
                  {m.external_name ?? "—"}
                </td>
                <td style={{ padding: "var(--space-3)" }}>
                  {m.external_unit ?? "—"}
                </td>
                <td style={{ padding: "var(--space-3)", textAlign: "center" }}>
                  {m.is_preferred ? (
                    <span style={{ color: "#F59E0B", fontSize: "var(--text-lg)" }} title="Preferencial">
                      ★
                    </span>
                  ) : (
                    <span style={{ color: "var(--color-border)", fontSize: "var(--text-lg)" }}>☆</span>
                  )}
                </td>
                <td style={{ padding: "var(--space-3)" }}>
                  {statusInfo && (
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--font-medium)",
                      backgroundColor: `${statusInfo.color}20`,
                      color: statusInfo.color,
                    }}>
                      {statusInfo.label}
                    </span>
                  )}
                </td>
                <td style={{ padding: "var(--space-3)", whiteSpace: "nowrap" }}>
                  {validity}
                </td>
                <td style={{ padding: "var(--space-3)", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    {!m.is_preferred && m.status === "active" && onPreferred && (
                      <button
                        onClick={() => onPreferred(m.id)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "transparent",
                          color: "#F59E0B",
                          border: "1px solid #F59E0B",
                          borderRadius: "var(--radius-md)",
                          cursor: "pointer",
                          fontSize: "var(--text-xs)",
                        }}
                      >
                        Preferencial
                      </button>
                    )}
                    {m.status === "active" && onInactivate && (
                      <button
                        onClick={() => onInactivate(m.id)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "transparent",
                          color: "var(--color-text-secondary)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          cursor: "pointer",
                          fontSize: "var(--text-xs)",
                        }}
                      >
                        Inativar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
