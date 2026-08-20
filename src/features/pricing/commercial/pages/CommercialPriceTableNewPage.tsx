// ============================================================
// CommercialPriceTableNewPage — create a stable commercial table.
// ============================================================

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommercialTableForm } from "../components/CommercialTableForm";
import { createCommercialTable } from "../api/commercialPrices";

function Inner() {
  const navigate = useNavigate();
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;

  if (!can("pricing.commercial.create")) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Você não tem permissão para criar tabelas comerciais.
      </div>
    );
  }

  if (!orgId) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Selecione uma organização ativa.
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/pricing/commercial")}
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-primary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: "var(--space-2)",
        }}
      >
        ← Voltar para tabelas
      </button>
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
    </div>
  );
}

export function CommercialPriceTableNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
