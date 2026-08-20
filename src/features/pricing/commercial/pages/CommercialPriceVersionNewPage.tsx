// ============================================================
// CommercialPriceVersionNewPage — create empty or clone version.
// ============================================================

import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommercialVersionForm } from "../components/CommercialVersionForm";
import { useCommercialTable } from "../hooks/useCommercial";
import { cloneCommercialVersion, createCommercialVersion } from "../api/commercialPrices";
import { todayIsoDate } from "../utils/format";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cloneFromId = searchParams.get("cloneFrom") ?? undefined;
  const { can } = useAuth();
  const { table, versions, loading, error, refetch } = useCommercialTable(id ?? null);

  if (!can("pricing.commercial.create")) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Você não tem permissão para criar versões.
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
        Carregando tabela...
      </p>
    );
  }

  if (error || !table) {
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
        <p style={{ color: "#991B1B" }}>{error ?? "Tabela não encontrada."}</p>
      </div>
    );
  }

  const sourceVersion = cloneFromId
    ? versions.find((v) => v.id === cloneFromId) ?? null
    : null;
  const defaultValidFrom = sourceVersion?.valid_to ?? todayIsoDate();
  const sourceLabel = sourceVersion
    ? `v${sourceVersion.version_number}${sourceVersion.version_label ? ` · ${sourceVersion.version_label}` : ""}`
    : undefined;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(`/pricing/commercial/${table.id}`)}
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
        ← Voltar para a tabela
      </button>

      <CommercialVersionForm
        defaultValidFrom={defaultValidFrom}
        defaultValidTo={null}
        sourceVersionId={cloneFromId}
        sourceVersionLabel={sourceLabel}
        onSubmitEmpty={async ({ validFrom, validTo, versionLabel, notes }) => {
          const created = await createCommercialVersion({
            tableId: table.id,
            validFrom,
            validTo,
            versionLabel,
            notes,
          });
          await refetch();
          navigate(`/pricing/commercial/versions/${created.version_id}`);
        }}
        onSubmitClone={async ({ sourceVersionId, validFrom, validTo, versionLabel, notes }) => {
          const created = await cloneCommercialVersion({
            sourceVersionId,
            validFrom,
            validTo,
            versionLabel,
            notes,
          });
          await refetch();
          navigate(`/pricing/commercial/versions/${created.new_version_id}`);
        }}
        cancelLabel="Cancelar"
      />
    </div>
  );
}

export function CommercialPriceVersionNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
