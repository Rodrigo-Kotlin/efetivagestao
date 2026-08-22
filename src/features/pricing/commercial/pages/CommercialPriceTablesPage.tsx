import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { CommercialTableList } from "../components/CommercialTableList";
import { useCommercialTables } from "../hooks/useCommercial";

function Inner() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data, loading, error, refetch } = useCommercialTables({
    search: search.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  if (!can("pricing.commercial.view")) {
    return (
      <PageContainer>
        <PageHeader
          title="Tabelas Comerciais"
          description="Preços comerciais publicados, suas versões e vigências."
        />
        <Alert tone="negative" title="Sem permissão">
          Você não tem permissão para acessar esta página.
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Tabelas Comerciais"
        description="Preços comerciais publicados, suas versões e vigências."
        actions={
          can("pricing.commercial.create") ? (
            <Button variant="filled" onClick={() => navigate("/pricing/commercial/new")}>
              Nova tabela
            </Button>
          ) : undefined
        }
      />
      <CommercialTableList
        tables={data}
        loading={loading}
        error={error}
        canCreate={can("pricing.commercial.create")}
        search={search}
        statusFilter={statusFilter}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onRetry={() => void refetch()}
      />
    </PageContainer>
  );
}

export function CommercialPriceTablesPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
