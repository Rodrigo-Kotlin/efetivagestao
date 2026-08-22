import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fetchCostTable, updateCostTableStatus } from "../api/costs";
import { CostTableDetail } from "../components/CostTableDetail";
import type { CostTableWithSupplier } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DropdownMenu, MenuItem } from "@/components/ui/DropdownMenu";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { activeOrganization, user, can } = useAuth();
  const navigate = useNavigate();

  const [costTable, setCostTable] = useState<CostTableWithSupplier | null>(null);
  const [loading, setLoading] = useState(true);
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
      const data = await fetchCostTable(id, orgId);
      if (!data) {
        setError("Tabela de custo não encontrada");
      } else {
        setCostTable(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar tabela de custo");
    } finally {
      setLoading(false);
    }
  }, [id, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = async (action: string) => {
    if (!id || !orgId) return;

    try {
      if (action === "new_version") {
        navigate(`/pricing/costs/${id}/versions/new`);
        return;
      }

      if (action.startsWith("version:")) {
        const versionId = action.split(":")[1];
        if (!versionId) return;
        navigate(`/pricing/costs/versions/${versionId}`);
        return;
      }

      if (action === "activate") {
        await updateCostTableStatus(id, "active", orgId, userId ?? "");
        await load();
        return;
      }

      if (action === "inactivate") {
        await updateCostTableStatus(id, "inactive", orgId, userId ?? "");
        await load();
        return;
      }

      if (action === "archive") {
        await updateCostTableStatus(id, "archived", orgId, userId ?? "");
        await load();
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao executar ação");
    }
  };

  if (loading) {
    return (
      <PageContainer size="wide">
        <PageHeader
          variant="entity"
          title="Tabela de custo"
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

  if (error) {
    return (
      <PageContainer size="wide">
        <PageHeader
          variant="entity"
          title="Tabela de custo"
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

  if (!costTable) {
    return (
      <PageContainer size="wide">
        <PageHeader
          variant="entity"
          title="Tabela de custo"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Custos", to: "/pricing/costs" },
            { label: "Não encontrada" },
          ]}
        />
        <p style={{ color: "var(--md-sys-color-on-surface-variant)" }}>Tabela de custo não encontrada.</p>
      </PageContainer>
    );
  }

  const isActive = costTable.status === "active";
  const isArchived = costTable.status === "archived";
  const canEdit = can("pricing.cost.edit");

  return (
    <PageContainer size="wide">
      <PageHeader
        variant="entity"
        title={costTable.name}
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Custos", to: "/pricing/costs" },
          { label: costTable.name },
        ]}
        meta={<span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>{costTable.code}</span>}
        primaryAction={
          canEdit ? (
            <Button variant="filled" onClick={() => handleAction("new_version")}>
              Nova versão
            </Button>
          ) : undefined
        }
        overflowActions={
          canEdit ? (
            <DropdownMenu
              label="Mais ações"
              trigger="Mais"
              align="end"
            >
              {isActive ? (
                <MenuItem onClick={() => handleAction("inactivate")}>Inativar</MenuItem>
              ) : null}
              {!isActive && !isArchived ? (
                <MenuItem onClick={() => handleAction("activate")}>Ativar</MenuItem>
              ) : null}
              {!isArchived ? (
                <MenuItem onClick={() => handleAction("archive")}>Arquivar</MenuItem>
              ) : null}
            </DropdownMenu>
          ) : undefined
        }
      />
      <CostTableDetail costTable={costTable} onAction={handleAction} />
    </PageContainer>
  );
}

export function CostDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
