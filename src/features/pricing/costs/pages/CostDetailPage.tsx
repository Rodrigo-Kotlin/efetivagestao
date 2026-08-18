import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fetchCostTable, updateCostTableStatus } from "../api/costs";
import { CostTableDetail } from "../components/CostTableDetail";
import type { CostTableWithSupplier } from "@/types";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { activeOrganization, user } = useAuth();
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
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Carregando tabela de custo...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
        <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>{error}</p>
        <button
          onClick={() => navigate("/pricing/costs")}
          style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!costTable) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Tabela de custo não encontrada.
      </div>
    );
  }

  return (
    <CostTableDetail
      costTable={costTable}
      onAction={handleAction}
    />
  );
}

export function CostDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
