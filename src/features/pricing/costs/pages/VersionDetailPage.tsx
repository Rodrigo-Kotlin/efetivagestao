import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fetchCostTableVersion } from "../api/costs";
import {
  useSubmitCostVersion,
  useApproveCostVersion,
  usePublishCostVersion,
} from "../hooks/useCosts";
import { VersionDetail } from "../components/VersionDetail";
import type { CostTableVersionWithItems } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { activeOrganization, can } = useAuth();
  const navigate = useNavigate();

  const [version, setVersion] = useState<CostTableVersionWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const submit = useSubmitCostVersion();
  const approve = useApproveCostVersion();
  const publish = usePublishCostVersion();

  const orgId = activeOrganization?.id;

  const load = useCallback(async () => {
    if (!id || !orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCostTableVersion(id, orgId);
      if (!data) {
        setError("Versão não encontrada");
      } else {
        setVersion(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar versão");
    } finally {
      setLoading(false);
    }
  }, [id, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = async (action: string) => {
    if (!id || !orgId) return;

    setWorkflowError(null);

    if (action === "compare") {
      return;
    }

    let message: string | null = null;
    if (action === "submit") {
      message = await submit.mutate(id);
    } else if (action === "approve") {
      message = await approve.mutate(id);
    } else if (action === "publish") {
      message = await publish.mutate(id);
    }

    if (message) {
      setWorkflowError(message);
    } else {
      await load();
    }
  };

  const canSubmit = can("pricing.cost.create");
  const canApprove = can("pricing.cost.approve");
  const canPublish = can("pricing.cost.publish");

  if (loading) {
    return (
      <PageContainer size="wide">
        <PageHeader
          variant="entity"
          title="Versão"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Custos", to: "/pricing/costs" },
            { label: "Carregando..." },
          ]}
        />
        <Spinner label="Carregando versão..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer size="wide">
        <PageHeader
          variant="entity"
          title="Versão"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Custos", to: "/pricing/costs" },
            { label: "Erro" },
          ]}
        />
        <Alert tone="negative" title={error}>
          <Button variant="outlined" onClick={() => navigate(-1)}>Voltar</Button>
        </Alert>
      </PageContainer>
    );
  }

  if (!version) {
    return (
      <PageContainer size="wide">
        <PageHeader
          variant="entity"
          title="Versão"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Custos", to: "/pricing/costs" },
            { label: "Não encontrada" },
          ]}
        />
        <p style={{ color: "var(--md-sys-color-on-surface-variant)" }}>Versão não encontrada.</p>
      </PageContainer>
    );
  }

  const tableId = version.cost_table_id;

  return (
    <PageContainer size="wide">
      <PageHeader
        variant="entity"
        title={`Versão ${version.version_number}${version.version_label ? ` — ${version.version_label}` : ""}`}
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Custos", to: "/pricing/costs" },
          { label: version.cost_table?.name ?? "Tabela", to: tableId ? `/pricing/costs/${tableId}` : undefined },
          { label: `v${version.version_number}` },
        ]}
      />
      {workflowError ? <Alert tone="negative" title={workflowError} /> : null}
      <VersionDetail
        version={version}
        onAction={(action) => void handleAction(action)}
        permissions={{ canSubmit, canApprove, canPublish }}
      />
    </PageContainer>
  );
}

export function VersionDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
