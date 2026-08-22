import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/core/useAuth";
import { fetchCatalogItemsForSelector } from "../api/policies";
import { supabase } from "@/lib/supabase";
import type { CatalogItem, SupplierWithCompany } from "@/types";
import { FormSection } from "@/components/ui/FormSection";
import { FormActions } from "@/components/ui/FormActions";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { Button } from "@/components/ui/Button";

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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      noValidate
    >
      <FormSection title="Item e fornecedor" description="Selecione o item do catálogo e o fornecedor do custo.">
        <TextField
          label="Buscar item do catálogo"
          supportingText="Filtre por código ou nome."
          placeholder="Buscar item..."
          value={itemSearch}
          onChange={(e) => setItemSearch(e.target.value)}
        />
        <Select
          label="Item do catálogo"
          required
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
        >
          <option value="">Selecione o item...</option>
          {itemsLoading ? (
            <option disabled>Carregando...</option>
          ) : (
            items.map((i) => (
              <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
            ))
          )}
        </Select>

        <TextField
          label="Buscar fornecedor"
          supportingText="Filtre por razão social ou nome fantasia."
          placeholder="Buscar fornecedor..."
          value={supplierSearch}
          onChange={(e) => setSupplierSearch(e.target.value)}
        />
        <Select
          label="Fornecedor do custo"
          required
          value={selectedSupplierId}
          onChange={(e) => setSelectedSupplierId(e.target.value)}
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
        </Select>
      </FormSection>

      <FormSection title="Parâmetros da simulação">
        <FieldGroup columns={2}>
          <TextField
            label="Data de referência"
            type="date"
            required
            value={referenceDate}
            onChange={(e) => setReferenceDate(e.target.value)}
            supportingText="Usada para resolver custo e política vigentes."
          />
          <TextField
            label="Desconto simulado (%)"
            type="number"
            min={0}
            max={100}
            step="0.01"
            placeholder="Ex.: 5"
            value={discountRate}
            onChange={(e) => setDiscountRate(e.target.value)}
            supportingText="Opcional. Aplicado após arredondamento; validado contra a política."
          />
        </FieldGroup>
      </FormSection>

      {error ? <FormAlert tone="error">{error}</FormAlert> : null}

      <FormActions>
        <Button variant="text" type="button" onClick={onClear} disabled={loading}>
          Limpar
        </Button>
        <Button variant="filled" type="submit" disabled={loading} loading={loading}>
          {loading ? "Calculando..." : "Simular preço"}
        </Button>
      </FormActions>
    </form>
  );
}
