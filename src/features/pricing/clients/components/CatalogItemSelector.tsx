// ============================================================
// CatalogItemSelector — searchable picker of active catalog items.
// Options come from fetchCatalogItemOptions (status = active).
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { fetchCatalogItemOptions } from "../api/clientPrices";
import type { CatalogItemOption } from "../types/client.types";

interface Props {
  orgId: string;
  value: string | null;
  onChange: (itemId: string) => void;
  disabled?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
};

export function CatalogItemSelector({
  orgId,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [options, setOptions] = useState<CatalogItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCatalogItemOptions(orgId)
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (i) =>
        i.code.toLowerCase().includes(term) ||
        i.name.toLowerCase().includes(term)
    );
  }, [options, search]);

  return (
    <div>
      <input
        type="search"
        placeholder="Buscar por código ou nome do item"
        value={search}
        disabled={disabled || loading}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputStyle, marginBottom: "var(--space-2)" }}
        aria-label="Buscar itens de catálogo"
      />

      {loading && (
        <p role="status" aria-label="Carregando itens de catálogo" style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
          Carregando itens de catálogo...
        </p>
      )}

      {error && !loading && (
        <div role="alert" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p role="status" style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
          Nenhum item de catálogo encontrado.
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div
          role="listbox"
          aria-label="Itens de catálogo"
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            maxHeight: "240px",
            overflowY: "auto",
          }}
        >
          {filtered.map((i) => {
            const selected = value === i.id;
            return (
              <button
                key={i.id}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onClick={() => onChange(i.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-2)",
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  backgroundColor: selected ? "var(--color-surface-secondary, #EFF6FF)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--color-border-light, #F1F5F9)",
                  cursor: disabled ? "default" : "pointer",
                  textAlign: "left",
                  fontSize: "var(--text-sm)",
                }}
              >
                <span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: "var(--text-xs)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {i.code}
                  </span>
                  <strong style={{ marginLeft: "var(--space-2)" }}>{i.name}</strong>
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-medium)",
                    backgroundColor: "var(--color-surface-secondary, #F3F4F6)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {i.item_type}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
