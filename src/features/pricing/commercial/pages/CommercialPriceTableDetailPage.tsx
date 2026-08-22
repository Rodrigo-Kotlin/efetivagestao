import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommercialTableDetail } from "../components/CommercialTableDetail";
import { useCommercialTable } from "../hooks/useCommercial";
import {
  setCommercialTableStatus,
  updateCommercialTable,
} from "../api/commercialPrices";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { table, versions, loading, error, refetch } = useCommercialTable(id ?? null);

  if (!can("pricing.commercial.view")) {
    return (
      <PageContainer>
        <PageHeader
          title="Tabela Comercial"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Tabelas Comerciais", to: "/pricing/commercial" },
            { label: "Sem permissão" },
          ]}
        />
        <Alert tone="negative" title="Sem permissão">
          Você não tem permissão para acessar esta página.
        </Alert>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer size="wide">
        <PageHeader
          variant="entity"
          title="Tabela Comercial"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Tabelas Comerciais", to: "/pricing/commercial" },
            { label: "Carregando..." },
          ]}
        />
        <Spinner label="Carregando tabela comercial..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer size="wide">
        <PageHeader
          variant="entity"
          title="Tabela Comercial"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Tabelas Comerciais", to: "/pricing/commercial" },
            { label: "Erro" },
          ]}
        />
        <Alert tone="negative" title={error}>
          <Button variant="outlined" onClick={() => void refetch()}>Tentar novamente</Button>
        </Alert>
      </PageContainer>
    );
  }

  if (!table) {
    return (
      <PageContainer size="wide">
        <PageHeader
          variant="entity"
          title="Tabela Comercial"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Tabelas Comerciais", to: "/pricing/commercial" },
            { label: "Não encontrada" },
          ]}
        />
        <p style={{ color: "var(--md-sys-color-on-surface-variant)" }}>Tabela comercial não encontrada.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        variant="entity"
        title={table.name}
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Tabelas Comerciais", to: "/pricing/commercial" },
          { label: table.name },
        ]}
        primaryAction={
          can("pricing.commercial.create") ? (
            <Button variant="filled" onClick={() => navigate(`/pricing/commercial/${table.id}/versions/new`)}>
              Nova versão
            </Button>
          ) : undefined
        }
      />
      <CommercialTableDetail
        table={table}
        versions={versions}
        canEdit={can("pricing.commercial.edit")}
        canCreate={can("pricing.commercial.create")}
        onSaveDetails={async ({ name, description }) => {
          await updateCommercialTable({
            tableId: table.id,
            name,
            description,
          });
          await refetch();
          navigate(`/pricing/commercial/${table.id}`);
        }}
        onChangeStatus={async (status) => {
          await setCommercialTableStatus({ tableId: table.id, status });
          await refetch();
        }}
      />
    </PageContainer>
  );
}

export function CommercialPriceTableDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
