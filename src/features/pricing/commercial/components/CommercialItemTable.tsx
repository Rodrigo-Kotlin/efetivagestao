// ============================================================
// CommercialItemTable — list of commercial price items in a version.
// Supports search, origin filter, selection (for bulk), edit/delete (draft).
// ============================================================

import { useMemo, useState } from "react";
import { CommercialOriginBadge, CommercialCodeBadge } from "./CommercialBadges";
import type {
  CommercialItemOrigin,
  CommercialPriceException,
  CommercialPriceVersionDetail,
} from "../types/commercial.types";
import { COMMERCIAL_ITEM_ORIGINS } from "../types/commercial.types";
import { formatCurrency } from "../utils/format";

interface Props {
  version: CommercialPriceVersionDetail;
  canEdit: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (itemId: string) => void;
  onToggleSelectAll: () => void;
  onEditPrice: (itemId: string, currentPrice: number) => void;
  onDelete: (itemId: string) => void;
  onRequestException: (itemId: string, code: string) => void;
  exceptions: CommercialPriceException[];
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  backgroundColor: "var(--color-surface)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "var(--space-2) var(--space-3)",
  fontSize: "var(--text-xs)",
  fontWeight: "var(--font-semibold)",
  color: "var(--color-text-secondary)",
  backgroundColor: "var(--color-surface-secondary, #F8FAFC)",
  borderBottom: "1px solid var(--color-border)",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  fontSize: "var(--text-sm)",
  borderBottom: "1px solid var(--color-border-light, #F1F5F9)",
  verticalAlign: "middle",
};

export function CommercialItemTable({
  version,
  canEdit,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEditPrice,
  onDelete,
  onRequestException,
  exceptions,
}: Props) {
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState<"all" | CommercialItemOrigin>("all");

  const items = version.items ?? [];

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (originFilter !== "all" && it.origin_type !== originFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          it.item_code_snapshot.toLowerCase().includes(q) ||
          it.item_name_snapshot.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, search, originFilter]);

  const exceptionsByItem = useMemo(() => {
    const map = new Map<string, CommercialPriceException[]>();
    for (const ex of exceptions) {
      const list = map.get(ex.commercial_price_item_id) ?? [];
      list.push(ex);
      map.set(ex.commercial_price_item_id, list);
    }
    return map;
  }, [exceptions]);

  const isDraft = version.status === "draft";

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginBottom: "var(--space-3)",
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          placeholder="Buscar por código ou nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 200px",
            padding: "var(--space-2) var(--space-3)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
          }}
          aria-label="Buscar itens"
        />
        <select
          value={originFilter}
          onChange={(e) =>
            setOriginFilter(e.target.value === "all" ? "all" : (e.target.value as CommercialItemOrigin))
          }
          aria-label="Filtrar por origem"
          style={{
            padding: "var(--space-2) var(--space-3)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
          }}
        >
          <option value="all">Todas as origens</option>
          {COMMERCIAL_ITEM_ORIGINS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 && (
        <div
          style={{
            padding: "var(--space-6)",
            textAlign: "center",
            color: "var(--color-text-secondary)",
            backgroundColor: "var(--color-surface)",
            border: "1px dashed var(--color-border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          Esta versão ainda não possui itens.
        </div>
      )}

      {items.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {isDraft && canEdit && (
                  <th style={{ ...thStyle, width: 32 }}>
                    <input
                      type="checkbox"
                      checked={
                        filtered.length > 0 &&
                        filtered.every((it) => selectedIds.has(it.id))
                      }
                      onChange={onToggleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </th>
                )}
                <th style={thStyle}>Item</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Preço</th>
                <th style={thStyle}>Origem</th>
                <th style={thStyle}>Exceções</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const itemExcs = exceptionsByItem.get(item.id) ?? [];
                const hasPending = itemExcs.some((e) => e.status === "requested");
                const lineage = item.source_commercial_price_item_id;
                return (
                  <tr key={item.id}>
                    {isDraft && canEdit && (
                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => onToggleSelect(item.id)}
                          aria-label={`Selecionar item ${item.item_code_snapshot}`}
                        />
                      </td>
                    )}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                        <CommercialCodeBadge code={item.item_code_snapshot} />
                        <strong>{item.item_name_snapshot}</strong>
                      </div>
                      {lineage && (
                        <p
                          style={{
                            margin: "var(--space-1) 0 0",
                            color: "var(--color-text-secondary)",
                            fontSize: "var(--text-xs)",
                          }}
                        >
                          Herdado da versão anterior
                        </p>
                      )}
                    </td>
                    <td style={tdStyle}>{item.item_type_snapshot}</td>
                    <td style={tdStyle}>
                      <strong>{formatCurrency(item.price_amount)}</strong>
                    </td>
                    <td style={tdStyle}>
                      <CommercialOriginBadge origin={item.origin_type} />
                    </td>
                    <td style={tdStyle}>
                      {itemExcs.length === 0 && (
                        <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-xs)" }}>
                          —
                        </span>
                      )}
                      {itemExcs.map((ex) => (
                        <div key={ex.id} style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-1)" }}>
                          <span>{ex.violation_code}</span>{" "}
                          <span style={{ color: hasPending ? "#F59E0B" : "var(--color-text-secondary)" }}>
                            ({ex.status})
                          </span>
                        </div>
                      ))}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                        {isDraft && canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditPrice(item.id, item.price_amount)}
                              style={{
                                fontSize: "var(--text-xs)",
                                color: "var(--color-primary)",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                            >
                              Editar preço
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Remover o item ${item.item_code_snapshot} desta versão?`
                                  )
                                ) {
                                  onDelete(item.id);
                                }
                              }}
                              style={{
                                fontSize: "var(--text-xs)",
                                color: "#DC2626",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                            >
                              Remover
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onRequestException(item.id, "BELOW_COST")}
                          disabled={!canEdit}
                          style={{
                            fontSize: "var(--text-xs)",
                            color: canEdit ? "#2563EB" : "var(--color-text-muted)",
                            background: "none",
                            border: "none",
                            cursor: canEdit ? "pointer" : "default",
                            textDecoration: canEdit ? "underline" : "none",
                          }}
                        >
                          Solicitar exceção
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
