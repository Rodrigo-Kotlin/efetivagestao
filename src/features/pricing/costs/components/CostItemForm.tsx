import { useState, useEffect, useCallback } from "react";
import { COST_ITEM_STATUSES } from "@/types";
import type { CatalogItem, CostItemInsert } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/core/useAuth";
import { FormSection } from "@/components/ui/FormSection";
import { FormActions } from "@/components/ui/FormActions";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";

interface Props {
  supplierCompanyId: string;
  initialData?: CostItemInsert;
  onSave: (data: CostItemInsert) => void;
  onCancel: () => void;
}

export function CostItemForm({ supplierCompanyId: _supplierCompanyId, initialData, onSave, onCancel }: Props) {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState(initialData?.catalog_item_id ?? "");
  const [_supplierCatalogItemId, _setSupplierCatalogItemId] = useState(initialData?.supplier_catalog_item_id ?? "");
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
      supplier_catalog_item_id: _supplierCatalogItemId,
      cost_status: costStatus,
      amount: amountValue,
      currency_code: currencyCode,
      notes: notes || null,
    } as CostItemInsert);
  };

  return (
    <FormSection
      title={initialData ? "Editar item de custo" : "Adicionar item de custo"}
    >
      <TextField
        label="Buscar item do catálogo"
        supportingText="Filtre por código ou nome."
        placeholder="Buscar código ou nome..."
        value={catalogSearch}
        onChange={(e) => setCatalogSearch(e.target.value)}
      />
      <Select
        label="Item do catálogo"
        required
        value={selectedCatalogItemId}
        onChange={(e) => setSelectedCatalogItemId(e.target.value)}
      >
        <option value="">{catalogLoading ? "Carregando..." : "Selecione..."}</option>
        {catalogItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code} — {item.name}
          </option>
        ))}
      </Select>

      <FieldGroup columns={2}>
        <Select
          label="Status do custo"
          required
          value={costStatus}
          onChange={(e) => setCostStatus(e.target.value)}
        >
          {COST_ITEM_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>

        {showAmount ? (
          <TextField
            label="Valor (Custo)"
            type="number"
            required
            placeholder="0.00"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        ) : null}

        <Select
          label="Moeda"
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value)}
        >
          <option value="BRL">BRL — Real</option>
          <option value="USD">USD — Dólar</option>
          <option value="EUR">EUR — Euro</option>
        </Select>
      </FieldGroup>

      <TextField
        label="Observação"
        placeholder="Observações sobre este item..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        multiline
        rows={2}
      />

      {error ? (
        <FormAlert tone="error">{error}</FormAlert>
      ) : null}
      {error ? <InlineError>{error}</InlineError> : null}

      <FormActions>
        <Button variant="text" onClick={onCancel}>Cancelar</Button>
        <Button variant="filled" onClick={handleSubmit}>
          {initialData ? "Atualizar" : "Adicionar"}
        </Button>
      </FormActions>
    </FormSection>
  );
}
