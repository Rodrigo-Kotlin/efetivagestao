import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fetchSupplier, updateSupplier } from "../api/suppliers";
import { SupplierForm } from "../components/SupplierForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { SupplierWithCompany } from "@/types";
import type { CompanyFormData, SupplierProfileFormData } from "../schemas/validation";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { activeOrganization, user } = useAuth();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<SupplierWithCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!id || !orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchSupplier(id, orgId);
      if (!data) {
        setError("Fornecedor não encontrado");
      } else {
        setSupplier(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar fornecedor");
    } finally {
      setLoading(false);
    }
  }, [id, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (data: { company: CompanyFormData; supplier: SupplierProfileFormData }) => {
    if (!id || !orgId || !userId) return;

    setSubmitting(true);
    setError(null);

    try {
      await updateSupplier(
        id,
        {
          legal_name: data.company.legal_name.trim(),
          trade_name: data.company.trade_name.trim() || null,
          tax_id: data.company.tax_id.trim() || null,
        },
        {
          supplier_category: data.supplier.supplier_category as string,
          payment_terms: data.supplier.payment_terms.trim() || null,
          contract_reference: data.supplier.contract_reference.trim() || null,
          notes: data.supplier.notes.trim() || null,
        },
        orgId,
        userId
      );

      navigate(`/pricing/suppliers/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar fornecedor");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader
          title="Editar Fornecedor"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Fornecedores", to: "/pricing/suppliers" },
            { label: "Editar" },
          ]}
        />
        <Spinner label="Carregando fornecedor..." />
      </PageContainer>
    );
  }

  if (error && !supplier) {
    return (
      <PageContainer>
        <PageHeader
          title="Editar Fornecedor"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Fornecedores", to: "/pricing/suppliers" },
            { label: "Erro" },
          ]}
        />
        <Alert tone="negative" title={error}>
          <Button variant="outlined" onClick={() => navigate("/pricing/suppliers")}>
            Voltar
          </Button>
        </Alert>
      </PageContainer>
    );
  }

  if (!supplier) {
    return (
      <PageContainer>
        <PageHeader
          title="Editar Fornecedor"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Fornecedores", to: "/pricing/suppliers" },
            { label: "Não encontrado" },
          ]}
        />
        <p style={{ color: "var(--color-text-secondary)" }}>Fornecedor não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Editar Fornecedor"
        description={supplier.company?.legal_name}
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Fornecedores", to: "/pricing/suppliers" },
          { label: supplier.company?.legal_name ?? "Detalhe", to: `/pricing/suppliers/${id}` },
          { label: "Editar" },
        ]}
      />
      {error && <Alert tone="negative">{error}</Alert>}
      <SupplierForm
        initialCompany={{
          legal_name: supplier.company?.legal_name ?? "",
          trade_name: supplier.company?.trade_name ?? "",
          tax_id: supplier.company?.tax_id ?? "",
        }}
        initialSupplier={{
          supplier_category: supplier.supplier_category as SupplierProfileFormData["supplier_category"],
          payment_terms: supplier.payment_terms ?? "",
          contract_reference: supplier.contract_reference ?? "",
          notes: supplier.notes ?? "",
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/pricing/suppliers/${id}`)}
        loading={submitting}
      />
    </PageContainer>
  );
}

export function SupplierEditPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
