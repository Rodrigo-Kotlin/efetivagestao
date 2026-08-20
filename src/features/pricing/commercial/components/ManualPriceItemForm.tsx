// ============================================================
// ManualPriceItemForm — add a manual item to a draft version.
// Uses fn_add_commercial_price_item_manual.
// ============================================================

import { useEffect, useState } from "react";
import { fetchActiveCatalogItems, filterCatalogOptions } from "../api/commercialPrices";
import type { CatalogItemOption } from "../types/commercial.types";
import { formatCurrency } from "../utils/format";

interface Props {
  orgId: string;
  onSubmit: (data: { catalogItemId: string; priceAmount: number }) => Promise<void>;
  onCancel: () => void;
}

export function ManualPriceItemForm({ orgId, onSubmit, onCancel }: Props) {
  const [options, setOptions] = useState<CatalogItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catalogItemId, setCatalogItemId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchActiveCatalogItems(orgId)
      .then((items) => {
        if (!cancelled) setOptions(items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const filtered = filterCatalogOptions(options, search);
  const selected = options.find((o) => o.id === catalogItemId) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogItemId) {
      setError("Selecione um item do catálogo.");
      return;
    }
    const parsed = Number(priceInput.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Informe um preço válido (>= 0).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ catalogItemId, priceAmount: parsed });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
      }}
    >
      <h4 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-3)" }}>
        Adicionar preço manual
      </h4>

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2) var(--space-3)",
            marginBottom: "var(--space-3)",
          }}
        >
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        <div>
          <label
            htmlFor="mpif-catalog-search"
            style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
          >
            Item do catálogo
          </label>
          <input
            id="mpif-catalog-search"
            type="search"
            placeholder="Buscar código ou nome"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              marginBottom: "var(--space-2)",
            }}
          />
          <select
            aria-label="Selecionar item do catálogo"
            value={catalogItemId ?? ""}
            onChange={(e) => setCatalogItemId(e.target.value || null)}
            disabled={loading}
            style={{
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
            }}
            size={Math.min(8, filtered.length || 1)}
          >
            {loading && <option>Carregando itens...</option>}
            {!loading && filtered.length === 0 && (
              <option value="">Nenhum item ativo encontrado</option>
            )}
            {!loading &&
              filtered.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.code} · {opt.name}
                </option>
              ))}
          </select>
          {selected && (
            <p
              style={{
                marginTop: "var(--space-1)",
                fontSize: "var(--text-xs)",
                color: "var(--color-text-secondary)",
              }}
            >
              Selecionado: {selected.code} · {selected.name}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="mpif-price"
            style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
          >
            Preço comercial (R$)
          </label>
          <input
            id="mpif-price"
            type="text"
            inputMode="decimal"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="0,00"
            style={{
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
            }}
          />
          {priceInput && Number.isFinite(Number(priceInput.replace(",", "."))) && (
            <p
              style={{
                marginTop: "var(--space-1)",
                fontSize: "var(--text-xs)",
                color: "var(--color-text-secondary)",
              }}
            >
              Prévia: {formatCurrency(Number(priceInput.replace(",", ".")))}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-text-inverse)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Adicionando..." : "Adicionar item"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            cursor: submitting ? "default" : "pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
