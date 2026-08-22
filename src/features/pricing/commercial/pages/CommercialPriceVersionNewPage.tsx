import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommercialVersionForm } from "../components/CommercialVersionForm";
import { useCommercialTable } from "../hooks/useCommercial";
import { cloneCommercialVersion, createCommercialVersion } from "../api/commercialPrices";
import { todayIsoDate } from "../utils/format";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { FormAlert } from "@/components/ui/FormAlert";
import { Spinner } from "@/components/ui/Spinner";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cloneFromId = searchParams.get("cloneFrom") ?? undefined;
  const { can } = useAuth();
  const { table, versions, loading, error, refetch } = useCommercialTable(id ?? null);

  if (!can("pricing.commercial.create")) {
    return (
      <PageContainer>
        <PageHeader
          variant="compact"
          title="Nova Versão"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Tabelas Comerciais", to: "/pricing/commercial" },
            { label: "Nova versão" },
          ]}
        />
        <FormAlert tone="error">Você não tem permissão para criar versões.</FormAlert>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <PageHeader
          variant="compact"
          title="Nova Versão"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Tabelas Comerciais", to: "/pricing/commercial" },
            { label: "Carregando..." },
          ]}
        />
        <Spinner label="Carregando tabela..." />
      </PageContainer>
    );
  }

  if (error || !table) {
    return (
      <PageContainer>
        <PageHeader
          variant="compact"
          title="Nova Versão"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Tabelas Comerciais", to: "/pricing/commercial" },
            { label: "Erro" },
          ]}
        />
        <Alert tone="negative" title={error ?? "Tabela não encontrada."} />
      </PageContainer>
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
    <PageContainer>
      <PageHeader
        variant="compact"
        title={`Nova versão — ${table.name}`}
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Tabelas Comerciais", to: "/pricing/commercial" },
          { label: table.name, to: `/pricing/commercial/${table.id}` },
          { label: "Nova versão" },
        ]}
      />
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
    </PageContainer>
  );
}

export function CommercialPriceVersionNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
