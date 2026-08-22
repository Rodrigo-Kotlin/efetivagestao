import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommercialTableForm } from "../components/CommercialTableForm";
import { createCommercialTable } from "../api/commercialPrices";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { FormAlert } from "@/components/ui/FormAlert";

function Inner() {
  const navigate = useNavigate();
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;

  if (!can("pricing.commercial.create")) {
    return (
      <PageContainer>
        <PageHeader
          variant="compact"
          title="Nova Tabela Comercial"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Tabelas Comerciais", to: "/pricing/commercial" },
            { label: "Nova tabela" },
          ]}
        />
        <FormAlert tone="error">Você não tem permissão para criar tabelas comerciais.</FormAlert>
      </PageContainer>
    );
  }

  if (!orgId) {
    return (
      <PageContainer>
        <PageHeader
          variant="compact"
          title="Nova Tabela Comercial"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Tabelas Comerciais", to: "/pricing/commercial" },
            { label: "Nova tabela" },
          ]}
        />
        <Alert tone="warning" title="Selecione uma organização ativa" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        variant="compact"
        title="Nova Tabela Comercial"
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Tabelas Comerciais", to: "/pricing/commercial" },
          { label: "Nova tabela" },
        ]}
      />
      <CommercialTableForm
        onSubmit={async (data) => {
          await createCommercialTable({
            orgId,
            code: data.code,
            name: data.name,
            description: data.description,
          });
          navigate("/pricing/commercial");
        }}
        onCancel={() => navigate("/pricing/commercial")}
      />
    </PageContainer>
  );
}

export function CommercialPriceTableNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
