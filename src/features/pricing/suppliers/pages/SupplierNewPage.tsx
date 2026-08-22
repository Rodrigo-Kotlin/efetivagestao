import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createSupplier } from "../api/suppliers";
import { SupplierForm } from "../components/SupplierForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import type { CompanyFormData, SupplierProfileFormData } from "../schemas/validation";

function Inner() {
  const { activeOrganization, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;
  const userId = user?.id;

  const handleSubmit = async (data: { company: CompanyFormData; supplier: SupplierProfileFormData }) => {
    if (!orgId || !userId) {
      setGlobalError("Organização ou usuário não identificado");
      return;
    }

    setLoading(true);
    setGlobalError(null);

    try {
      await createSupplier(
        {
          legal_name: data.company.legal_name.trim(),
          trade_name: data.company.trade_name.trim() || null,
          tax_id: data.company.tax_id.trim() || null,
          organization_id: orgId,
          created_by: userId,
          updated_by: userId,
        },
        {
          supplier_category: data.supplier.supplier_category as string,
          payment_terms: data.supplier.payment_terms.trim() || null,
          contract_reference: data.supplier.contract_reference.trim() || null,
          notes: data.supplier.notes.trim() || null,
          status: "active",
        },
        orgId,
        userId
      );

      navigate("/pricing/suppliers");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Erro ao criar fornecedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Novo Fornecedor"
        description="Preencha os dados da empresa e do perfil de fornecedor."
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Fornecedores", to: "/pricing/suppliers" },
          { label: "Novo fornecedor" },
        ]}
      />
      {globalError && <Alert tone="negative">{globalError}</Alert>}
      <SupplierForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/pricing/suppliers")}
        loading={loading}
      />
    </PageContainer>
  );
}

export function SupplierNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
