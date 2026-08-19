import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/core/useAuth";
import { fetchCatalogItemsForSelector } from "../api/policies";
import { supabase } from "@/lib/supabase";
import type { CatalogItem, SupplierWithCompany } from "@/types";

interface Props {
  onSubmit: (input: {
    catalog_item_id: string;
    supplier_company_id: string;
    reference_date: string;
    discount_rate: string;
  }) => void;
  onClear: () => void;
  loading?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-xs)",
  color: "var(--color-text-secondary)",
  marginBottom: "4px",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SimulationForm({ onSubmit, onClear, loading = false }: Props) {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  const [itemSearch, setItemSearch] = useState("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");

  const [supplierSearch, setSupplierSearch] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierWithCompany[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  const [referenceDate, setReferenceDate] = useState(todayISO());
  const [discountRate, setDiscountRate] = useState("");

  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!orgId) return;
    setItemsLoading(true);
    try {
      const data = await fetchCatalogItemsForSelector({ orgId, search: itemSearch });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, [orgId, itemSearch]);

  const loadSuppliers = useCallback(async () => {
    if (!orgId) return;
    setSuppliersLoading(true);
    try {
      let query = supabase
        .from("supplier_profiles")
        .select("*, company:companies(*)")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (supplierSearch) {
        query = query.or(
          `company->>legal_name.ilike.%${supplierSearch}%,company->>trade_name.ilike.%${supplierSearch}%`
        );
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      setSuppliers((data ?? []) as unknown as SupplierWithCompany[]);
    } catch {
      setSuppliers([]);
    } finally {
      setSuppliersLoading(false);
    }
  }, [orgId, supplierSearch]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const handleSubmit = () => {
    setError(null);

    if (!selectedItemId) {
      setError("Selecione o item do catálogo a ser simulado.");
      return;
    }

    if (!selectedSupplierId) {
      setError("Selecione o fornecedor do custo.");
      return;
    }

    if (!referenceDate) {
      setError("Informe a data de referência.");
      return;
    }

    if (discountRate.trim() !== "") {
      const parsed = parseFloat(discountRate.replace(",", "."));
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
        setError("O desconto simulado deve estar entre 0% e 100%.");
        return;
      }
    }

    onSubmit({
      catalog_item_id: selectedItemId,
      supplier_company_id: selectedSupplierId,
      reference_date: referenceDate,
      discount_rate: discountRate.trim(),
    });
  };

  return (
    <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <div>
          <label style={labelStyle}>Item do catálogo *</label>
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Buscar item..."
              style={inputStyle}
              aria-label="Buscar item do catálogo"
            />
            <button
              type="button"
              onClick={() => void loadItems()}
              style={{
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Buscar
            </button>
          </div>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            style={inputStyle}
            aria-label="Selecionar item do catálogo"
          >
            <option value="">Selecione o item...</option>
            {itemsLoading ? (
              <option disabled>Carregando...</option>
            ) : (
              items.map((i) => (
                <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
              ))
            )}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Fornecedor do custo *</label>
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <input
              type="text"
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              placeholder="Buscar fornecedor..."
              style={inputStyle}
              aria-label="Buscar fornecedor"
            />
            <button
              type="button"
              onClick={() => void loadSuppliers()}
              style={{
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Buscar
            </button>
          </div>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            style={inputStyle}
            aria-label="Selecionar fornecedor"
          >
            <option value="">Selecione o fornecedor...</option>
            {suppliersLoading ? (
              <option disabled>Carregando...</option>
            ) : (
              suppliers.map((s) => {
                const company = s.company as { legal_name?: string; trade_name?: string } | null;
                const name = company?.trade_name || company?.legal_name || "—";
                return (
                  <option key={s.company_id} value={s.company_id}>{name}</option>
                );
              })
            )}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <div>
          <label style={labelStyle}>Data de referência *</label>
          <input
            type="date"
            value={referenceDate}
            onChange={(e) => setReferenceDate(e.target.value)}
            style={inputStyle}
            aria-label="Data de referência da simulação"
          />
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginTop: "4px" }}>
            Usada para resolver custo e política vigentes.
          </p>
        </div>
        <div>
          <label style={labelStyle}>Desconto simulado (%)</label>
          <input
            type="number"
            value={discountRate}
            onChange={(e) => setDiscountRate(e.target.value)}
            min={0}
            max={100}
            step="0.01"
            placeholder="Ex.: 5"
            style={inputStyle}
            aria-label="Desconto simulado em percentual"
          />
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginTop: "4px" }}>
            Opcional. Aplicado após arredondamento; validado contra a política.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onClear}
          disabled={loading}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.5 : 1,
            fontSize: "var(--text-sm)",
          }}
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
          }}
        >
          {loading ? "Calculando..." : "Simular preço"}
        </button>
      </div>
    </div>
  );
}