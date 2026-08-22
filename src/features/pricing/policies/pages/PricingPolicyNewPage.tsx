import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createPricingPolicy } from "../api/policies";
import { PolicyForm } from "../components/PolicyForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { FormAlert } from "@/components/ui/FormAlert";

function Inner() {
  const navigate = useNavigate();
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!can("pricing.policy.create")) {
    return (
      <PageContainer>
        <PageHeader
          variant="compact"
          title="Nova Política de Preço"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Políticas", to: "/pricing/policies" },
            { label: "Nova política" },
          ]}
        />
        <FormAlert tone="error">Você não tem permissão para criar políticas de preço.</FormAlert>
      </PageContainer>
    );
  }

  const handleSubmit = async (data: {
    code: string;
    name: string;
    description: string;
    scopeType: string;
    catalogCategoryId?: string;
    catalogItemId?: string;
  }) => {
    if (!orgId) return;

    setError(null);
    setSaving(true);

    try {
      const id = await createPricingPolicy({
        orgId,
        code: data.code,
        name: data.name,
        description: data.description,
        scopeType: data.scopeType as "default" | "category" | "catalog_item",
        catalogCategoryId: data.catalogCategoryId,
        catalogItemId: data.catalogItemId,
      });
      navigate(`/pricing/policies/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar a política");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        variant="compact"
        title="Nova Política de Preço"
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Políticas", to: "/pricing/policies" },
          { label: "Nova política" },
        ]}
      />
      {error ? <FormAlert tone="error">{error}</FormAlert> : null}
      <PolicyForm
        onSubmit={(data) => void handleSubmit(data)}
        onCancel={() => navigate("/pricing/policies")}
        submitLabel={saving ? "Criando..." : "Criar Política"}
      />
    </PageContainer>
  );
}

export function PricingPolicyNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
