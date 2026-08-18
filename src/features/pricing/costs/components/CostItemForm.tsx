import { useState, useEffect, useCallback } from "react";
import { COST_ITEM_STATUSES } from "@/types";
import type { CatalogItem, CostItemInsert } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/core/useAuth";

interface Props {
  supplierCompanyId: string;
  initialData?: CostItemInsert;
  onSave: (data: CostItemInsert) => void;
  onCancel: () => void;
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

export function CostItemForm({ supplierCompanyId: _supplierCompanyId, initialData, onSave, onCancel }: Props) {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState(initialData?.catalog_item_id ?? "");
  const [supplierCatalogItemId, _setSupplierCatalogItemId] = useState(initialData?.supplier_catalog_item_id ?? "");
  const [costStatus, setCostStatus] = useState(initialData?.cost_status ?? "provided");
  const [amount, setAmount] = useState(initialData?.amount?.toString() ?? "");
  const [currencyCode, setCurrencyCode] = useState(initialData?.currency_code ?? "BRL");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const showAmount = costStatus === "provided" || costStatus === "confirmed_zero";

  const loadCatalogItems = useCallback(async () => {
    if (!orgId) return;
    setCatalogLoading(true);
    try {
      let query = supabase
        .from("catalog_items")
        .select("*")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("code", { ascending: true });

      if (catalogSearch) {
        query = query.or(`name.ilike.%${catalogSearch}%,code.ilike.%${catalogSearch}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      setCatalogItems(data ?? []);
    } catch {
      setCatalogItems([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [orgId, catalogSearch]);

  useEffect(() => {
    void loadCatalogItems();
  }, [loadCatalogItems]);

  const handleSubmit = () => {
    setError(null);

    if (!selectedCatalogItemId) {
      setError("Selecione um item do catálogo");
      return;
    }

    if (showAmount && (!amount || isNaN(parseFloat(amount)))) {
      setError("Informe um valor numérico para o custo");
      return;
    }

    if (costStatus === "confirmed_zero" && parseFloat(amount) !== 0) {
      setError("Para 'Confirmado Zero', o valor deve ser 0");
      return;
    }

    const amountValue = showAmount ? parseFloat(amount) : null;

    onSave({
      catalog_item_id: selectedCatalogItemId,
      supplier_catalog_item_id: supplierCatalogItemId,
      cost_status: costStatus,
      amount: amountValue,
      currency_code: currencyCode,
      notes: notes || null,
    } as CostItemInsert);
  };

  return (
    <div style={{
      backgroundColor: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-6)",
      marginBottom: "var(--space-4)",
    }}>
      <h4 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-text)", marginBottom: "var(--space-4)" }}>
        {initialData ? "Editar Item de Custo" : "Adicionar Item de Custo"}
      </h4>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <div>
          <label style={labelStyle}>Item do Catálogo *</label>
          <input
            type="text"
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            placeholder="Buscar código ou nome..."
            style={{ ...inputStyle, marginBottom: "4px" }}
          />
          <select
            value={selectedCatalogItemId}
            onChange={(e) => setSelectedCatalogItemId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{catalogLoading ? "Carregando..." : "Selecione..."}</option>
            {catalogItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} — {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Status do Custo *</label>
          <select
            value={costStatus}
            onChange={(e) => setCostStatus(e.target.value)}
            style={inputStyle}
          >
            {COST_ITEM_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {showAmount && (
          <div>
            <label style={labelStyle}>Valor (Custo) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              style={inputStyle}
            />
          </div>
        )}

        <div>
          <label style={labelStyle}>Moeda</label>
          <select
            value={currencyCode}
            onChange={(e) => setCurrencyCode(e.target.value)}
            style={inputStyle}
          >
            <option value="BRL">BRL — Real</option>
            <option value="USD">USD — Dólar</option>
            <option value="EUR">EUR — Euro</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: "var(--space-4)" }}>
        <label style={labelStyle}>Observação</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Observações sobre este item..."
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {error && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)" }}>{error}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button
          onClick={handleSubmit}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
          }}
        >
          {initialData ? "Atualizar" : "Adicionar"}
        </button>
        <button
          onClick={onCancel}
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
          Cancelar
        </button>
      </div>
    </div>
  );
}
