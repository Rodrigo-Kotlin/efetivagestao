import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createCostTableVersion, createCostItems, fetchCostTable } from "../api/costs";
import { CostItemForm } from "../components/CostItemForm";
import type { CostTableWithSupplier, CostItemInsert } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { FormSection } from "@/components/ui/FormSection";
import { FormActions } from "@/components/ui/FormActions";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "../utils/format";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { activeOrganization, user } = useAuth();
  const navigate = useNavigate();

  const [costTable, setCostTable] = useState<CostTableWithSupplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [label, setLabel] = useState("");
  const [sourceDate, setSourceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<CostItemInsert[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const orgId = activeOrganization?.id;
  const userId = user?.id;

  useEffect(() => {
    if (!id || !orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchCostTable(id, orgId)
      .then((data) => {
        if (!cancelled) {
          if (!data) {
            setError("Tabela de custo não encontrada");
          } else {
            setCostTable(data);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar tabela");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, orgId]);

  const handleAddItem = (data: CostItemInsert) => {
    setItems((prev) => [...prev, data]);
    setShowItemForm(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !orgId || !userId) return;

    setError(null);

    if (!validFrom) {
      setError("Informe a data de início da vigência");
      return;
    }
    if (!validTo) {
      setError("Informe a data de término da vigência");
      return;
    }

    setSaving(true);
    try {
      const latestVersion = costTable?.versions?.length
        ? Math.max(...costTable.versions.map((v) => v.version_number))
        : 0;

      const version = await createCostTableVersion(
        {
          cost_table_id: id,
          version_number: latestVersion + 1,
          version_label: label.trim() || null,
          valid_from: validFrom,
          valid_to: validTo || null,
          source_date: sourceDate || null,
          notes: notes.trim() || null,
        },
        orgId,
        userId
      );

      if (items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          ...item,
          cost_table_version_id: version.id,
        }));
        await createCostItems(itemsToInsert, orgId, userId);
      }

      navigate(`/pricing/costs/versions/${version.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar versão");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader
          variant="compact"
          title="Nova versão"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Custos", to: "/pricing/costs" },
            { label: "Carregando..." },
          ]}
        />
        <Spinner label="Carregando tabela de custo..." />
      </PageContainer>
    );
  }

  if (error && !costTable) {
    return (
      <PageContainer>
        <PageHeader
          variant="compact"
          title="Nova versão"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Custos", to: "/pricing/costs" },
            { label: "Erro" },
          ]}
        />
        <Alert tone="negative" title={error}>
          <Button variant="outlined" onClick={() => navigate("/pricing/costs")}>Voltar</Button>
        </Alert>
      </PageContainer>
    );
  }

  const nextVersion = costTable?.versions?.length
    ? Math.max(...costTable.versions.map((v) => v.version_number)) + 1
    : 1;

  return (
    <PageContainer>
      <PageHeader
        variant="compact"
        title={`Nova versão — ${costTable?.name ?? ""}`}
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Custos", to: "/pricing/costs" },
          { label: costTable?.name ?? "Tabela", to: costTable ? `/pricing/costs/${id}` : undefined },
          { label: `Versão ${nextVersion}` },
        ]}
      />

      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <FormSection title="Dados da versão" description={`Versão ${nextVersion} — ${costTable?.code ?? ""}`}>
          <FieldGroup columns={2}>
            <TextField
              label="Vigência início"
              type="date"
              required
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
            <TextField
              label="Vigência fim"
              type="date"
              required
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
            />
            <TextField
              label="Rótulo da versão"
              placeholder="Ex: Reajuste Jan/2026"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <TextField
              label="Data de origem"
              type="date"
              value={sourceDate}
              onChange={(e) => setSourceDate(e.target.value)}
              supportingText="Data do documento ou planilha de origem."
            />
          </FieldGroup>
          <TextField
            label="Observações"
            placeholder="Observações sobre esta versão..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
          />
        </FormSection>

        <FormSection
          title={`Itens (${items.length})`}
          description="Adicione itens do catálogo com seus respectivos custos."
          actions={
            !showItemForm ? (
              <Button variant="filled" size="compact" onClick={() => setShowItemForm(true)}>
                Adicionar item
              </Button>
            ) : undefined
          }
        >
          {showItemForm && costTable?.supplier_company_id ? (
            <CostItemForm
              supplierCompanyId={costTable.supplier_company_id}
              onSave={handleAddItem}
              onCancel={() => setShowItemForm(false)}
            />
          ) : null}

          {items.length > 0 ? (
            <Table caption="Itens adicionados" captionHidden>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Item Catálogo</th>
                  <th style={{ textAlign: "left" }}>Status</th>
                  <th style={{ textAlign: "right" }}>Custo</th>
                  <th style={{ textAlign: "left" }}>Moeda</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--md-sys-typescale-body-medium-size)" }}>
                      {item.catalog_item_id.slice(0, 8)}
                    </td>
                    <td>{item.cost_status}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                      {item.amount !== null && item.amount !== undefined ? formatCurrency(item.amount, item.currency_code) : "—"}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{item.currency_code}</td>
                    <td style={{ textAlign: "right" }}>
                      <Button variant="text" size="compact" onClick={() => handleRemoveItem(index)}>
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            !showItemForm ? (
              <EmptyState
                title="Nenhum item adicionado"
                description='Clique em "Adicionar item" para começar.'
              />
            ) : null
          )}
        </FormSection>

        {error ? <FormAlert tone="error">{error}</FormAlert> : null}

        <FormActions>
          <Button variant="text" onClick={() => navigate(`/pricing/costs/${id}`)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="filled" disabled={saving} loading={saving}>
            {saving ? "Salvando..." : "Criar versão"}
          </Button>
        </FormActions>
      </form>
    </PageContainer>
  );
}

export function VersionNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
