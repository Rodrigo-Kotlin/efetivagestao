// ============================================================
// EnginePriceItemForm — preview + add item via pricing engine.
// Preview uses fn_simulate_price (informational). Save uses
// fn_add_commercial_price_item_from_engine (authoritative).
// ============================================================

import { useEffect, useState } from "react";
import { fetchActiveCatalogItems, filterCatalogOptions, simulateEnginePrice } from "../api/commercialPrices";
import type {
  CatalogItemOption,
  CommercialEngineSimulationResult,
} from "../types/commercial.types";
import { EnginePricePreview } from "./EnginePricePreview";
import { formatCurrency, todayIsoDate } from "../utils/format";

interface SupplierOption {
  id: string;
  name: string;
}

interface Props {
  orgId: string;
  onSubmit: (data: {
    catalogItemId: string;
    supplierCompanyId: string;
    referenceDate: string;
    discountRate: number;
    commercialPriceAmount: number | null;
  }) => Promise<void>;
  onCancel: () => void;
  suppliers: SupplierOption[];
}

export function EnginePriceItemForm({ orgId, suppliers, onSubmit, onCancel }: Props) {
  const [items, setItems] = useState<CatalogItemOption[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemSearch, setItemSearch] = useState("");
  const [catalogItemId, setCatalogItemId] = useState<string | null>(null);

  const [supplierCompanyId, setSupplierCompanyId] = useState<string | null>(
    suppliers[0]?.id ?? null
  );
  const [referenceDate, setReferenceDate] = useState(todayIsoDate());
  const [discountInput, setDiscountInput] = useState("0");
  const [commercialPriceInput, setCommercialPriceInput] = useState("");

  const [preview, setPreview] = useState<CommercialEngineSimulationResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItemsLoading(true);
    fetchActiveCatalogItems(orgId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setSubmitError(err instanceof Error ? err.message : "Erro ao carregar catálogo");
        }
      })
      .finally(() => {
        if (!cancelled) setItemsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const filtered = filterCatalogOptions(items, itemSearch);

  const handlePreview = async () => {
    if (!catalogItemId || !supplierCompanyId) {
      setPreviewError("Selecione item e fornecedor.");
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const data = await simulateEnginePrice({
        orgId,
        supplierCompanyId,
        catalogItemId,
        referenceDate,
        discountRate: Number(discountInput.replace(",", ".")) / 100,
      });
      setPreview(data);
    } catch (err) {
      setPreview(null);
      setPreviewError(err instanceof Error ? err.message : "Falha na simulação");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogItemId || !supplierCompanyId) {
      setSubmitError("Selecione item e fornecedor.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const parsedCommercial = commercialPriceInput.trim()
        ? Number(commercialPriceInput.replace(",", "."))
        : null;
      if (
        commercialPriceInput.trim() &&
        (!Number.isFinite(parsedCommercial) || (parsedCommercial as number) < 0)
      ) {
        throw new Error("Informe um preço comercial válido (>= 0) ou deixe em branco.");
      }
      await onSubmit({
        catalogItemId,
        supplierCompanyId,
        referenceDate,
        discountRate: Number(discountInput.replace(",", ".")) / 100,
        commercialPriceAmount: parsedCommercial,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Falha ao adicionar item");
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
        Adicionar item via motor de precificação
      </h4>

      {submitError && (
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
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{submitError}</p>
        </div>
      )}

      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        <div>
          <label
            htmlFor="epif-search"
            style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
          >
            Item do catálogo
          </label>
          <input
            id="epif-search"
            type="search"
            placeholder="Buscar"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
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
            aria-label="Selecionar item"
            value={catalogItemId ?? ""}
            onChange={(e) => setCatalogItemId(e.target.value || null)}
            disabled={itemsLoading}
            style={{
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
            }}
          >
            {itemsLoading && <option>Carregando...</option>}
            {!itemsLoading && filtered.length === 0 && <option value="">Sem itens</option>}
            {!itemsLoading &&
              filtered.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.code} · {opt.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="epif-supplier"
            style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
          >
            Fornecedor
          </label>
          <select
            id="epif-supplier"
            value={supplierCompanyId ?? ""}
            onChange={(e) => setSupplierCompanyId(e.target.value || null)}
            style={{
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
            }}
          >
            <option value="">Selecione</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)" }}>
          <div>
            <label
              htmlFor="epif-date"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Data de referência
            </label>
            <input
              id="epif-date"
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              style={{
                width: "100%",
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="epif-discount"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Desconto (%)
            </label>
            <input
              id="epif-discount"
              type="text"
              inputMode="decimal"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="0"
              style={{
                width: "100%",
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="epif-commercial"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Preço comercial (opcional)
            </label>
            <input
              id="epif-commercial"
              type="text"
              inputMode="decimal"
              value={commercialPriceInput}
              onChange={(e) => setCommercialPriceInput(e.target.value)}
              placeholder="Vazio = usar recomendado"
              style={{
                width: "100%",
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
              }}
            />
            {commercialPriceInput && (
              <p
                style={{
                  marginTop: "var(--space-1)",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Prévia: {formatCurrency(Number(commercialPriceInput.replace(",", ".")))}
              </p>
            )}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => void handlePreview()}
            disabled={previewLoading || itemsLoading}
            style={{
              padding: "var(--space-2) var(--space-3)",
              backgroundColor: "transparent",
              color: "var(--color-primary)",
              border: "1px solid var(--color-primary)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              cursor: previewLoading ? "default" : "pointer",
            }}
          >
            {previewLoading ? "Simulando..." : "Simular preço"}
          </button>
          {previewError && (
            <p style={{ color: "#DC2626", fontSize: "var(--text-xs)", marginTop: "var(--space-2)" }}>
              {previewError}
            </p>
          )}
        </div>

        {preview && (
          <EnginePricePreview
            simulation={preview}
            commercialPriceInput={commercialPriceInput}
          />
        )}
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
