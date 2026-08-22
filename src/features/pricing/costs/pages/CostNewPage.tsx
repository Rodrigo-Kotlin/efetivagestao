import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createCostTable } from "../api/costs";
import { supabase } from "@/lib/supabase";
import type { SupplierWithCompany } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { FormSection } from "@/components/ui/FormSection";
import { FormActions } from "@/components/ui/FormActions";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { InlineError } from "@/components/ui/InlineError";
import { Button } from "@/components/ui/Button";

function Inner() {
  const navigate = useNavigate();
  const { activeOrganization, user } = useAuth();
  const orgId = activeOrganization?.id;
  const userId = user?.id;

  const [supplierSearch, setSupplierSearch] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierWithCompany[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    void loadSuppliers();
  }, [loadSuppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !userId) return;

    setError(null);
    const errs: Record<string, string> = {};
    if (!selectedSupplierId) errs.supplier = "Selecione um fornecedor";
    if (!code.trim()) errs.code = "Informe o código da tabela";
    if (!name.trim()) errs.name = "Informe o nome da tabela";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const result = await createCostTable(
        {
          supplier_company_id: selectedSupplierId,
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || null,
        },
        orgId,
        userId
      );
      navigate(`/pricing/costs/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar tabela de custo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        variant="compact"
        title="Nova Tabela de Custo"
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Custos", to: "/pricing/costs" },
          { label: "Nova tabela" },
        ]}
      />
      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <FormSection title="Dados da tabela">
          <Select
            label="Buscar fornecedor"
            supportingText="Filtre pelo nome ou razão social."
            value={supplierSearch}
            onChange={(e) => setSupplierSearch(e.target.value)}
          >
            <option value="">Digite para buscar...</option>
          </Select>
          <Select
            label="Fornecedor"
            required
            error={fieldErrors.supplier}
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
          >
            <option value="">{suppliersLoading ? "Carregando..." : "Selecione o fornecedor..."}</option>
            {suppliers.map((s) => (
              <option key={s.company_id} value={s.company_id}>
                {s.company?.legal_name ?? s.company?.trade_name ?? "—"}
              </option>
            ))}
          </Select>
          <TextField
            label="Código"
            required
            placeholder="Ex: TAB-LAB-001"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={fieldErrors.code}
          />
          <TextField
            label="Nome"
            required
            placeholder="Ex: Tabela Laboratório 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
          />
          <TextField
            label="Descrição"
            placeholder="Descrição opcional da tabela de custo..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
          />
        </FormSection>

        {error ? <FormAlert tone="error">{error}</FormAlert> : null}

        <FormActions>
          <Button variant="text" onClick={() => navigate("/pricing/costs")} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="filled" disabled={saving} loading={saving}>
            {saving ? "Salvando..." : "Criar Tabela"}
          </Button>
        </FormActions>
        {Object.keys(fieldErrors).length > 0 ? (
          <InlineError>Verifique os campos obrigatórios acima.</InlineError>
        ) : null}
      </form>
    </PageContainer>
  );
}

export function CostNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
