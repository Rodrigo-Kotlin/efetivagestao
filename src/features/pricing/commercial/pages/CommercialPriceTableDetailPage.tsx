// ============================================================
// CommercialPriceTableDetailPage — table detail + version list.
// ============================================================

import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommercialTableDetail } from "../components/CommercialTableDetail";
import { useCommercialTable } from "../hooks/useCommercial";
import {
  setCommercialTableStatus,
  updateCommercialTable,
} from "../api/commercialPrices";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { table, versions, loading, error, refetch } = useCommercialTable(id ?? null);

  if (!can("pricing.commercial.view")) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  if (loading) {
    return (
      <p
        role="status"
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Carregando tabela comercial...
      </p>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        style={{
          backgroundColor: "#FEF2F2",
          border: "1px solid #FECACA",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
        }}
      >
        <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>{error}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          style={{
            padding: "var(--space-2) var(--space-3)",
            backgroundColor: "#DC2626",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!table) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Tabela comercial não encontrada.
      </div>
    );
  }

  return (
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
  );
}

export function CommercialPriceTableDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
