import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fetchCostTableVersion, updateCostTableVersionStatus } from "../api/costs";
import { VersionDetail } from "../components/VersionDetail";
import type { CostTableVersionWithItems } from "@/types";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { activeOrganization, user } = useAuth();
  const navigate = useNavigate();

  const [version, setVersion] = useState<CostTableVersionWithItems | null>(null);
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

    try {
      if (action === "submit") {
        await updateCostTableVersionStatus(id, "under_review", orgId, userId ?? "");
        await load();
        return;
      }

      if (action === "approve") {
        await updateCostTableVersionStatus(id, "approved", orgId, userId ?? "");
        await load();
        return;
      }

      if (action === "publish") {
        await updateCostTableVersionStatus(id, "active", orgId, userId ?? "");
        await load();
        return;
      }

      if (action === "compare") {
        // Compare placeholder - in real implementation would open a modal or navigate
        // For now, we show the diff inline via state
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao executar ação");
    }
  };

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
      <VersionDetail version={version} onAction={handleAction} />
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
