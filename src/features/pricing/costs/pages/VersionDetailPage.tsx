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
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Carregando versão...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
        <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>{error}</p>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!version) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Versão não encontrada.
      </div>
    );
  }

  return (
    <div>
      {workflowError && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)" }}>{workflowError}</p>
        </div>
      )}
      <VersionDetail
        version={version}
        onAction={(action) => void handleAction(action)}
        permissions={{ canSubmit, canApprove, canPublish }}
      />
    </div>
  );
}

export function VersionDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}