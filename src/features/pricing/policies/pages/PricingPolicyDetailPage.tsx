import { useParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePricingPolicy } from "../hooks/usePricingPolicies";
import { PolicyDetail } from "../components/PolicyDetail";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const { policy, loading, error, refetch } = usePricingPolicy(id ?? null);

  if (!can("pricing.policy.view")) {
    return (
      <PageContainer>
        <PageHeader
          title="Política de Preço"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Políticas", to: "/pricing/policies" },
            { label: "Sem permissão" },
          ]}
        />
        <Alert tone="negative" title="Sem permissão">
          Você não tem permissão para acessar esta página.
        </Alert>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer size="wide">
        <PageHeader
          variant="entity"
          title="Política de Preço"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Políticas", to: "/pricing/policies" },
            { label: "Carregando..." },
          ]}
        />
        <Spinner label="Carregando política de preço..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer size="wide">
        <PageHeader
          variant="entity"
          title="Política de Preço"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Políticas", to: "/pricing/policies" },
            { label: "Erro" },
          ]}
        />
        <Alert tone="negative" title={error}>
          <Button variant="outlined" onClick={() => void refetch()}>Tentar novamente</Button>
        </Alert>
      </PageContainer>
    );
  }

  if (!policy) {
    return (
      <PageContainer size="wide">
        <PageHeader
          variant="entity"
          title="Política de Preço"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Políticas", to: "/pricing/policies" },
            { label: "Não encontrada" },
          ]}
        />
        <p style={{ color: "var(--md-sys-color-on-surface-variant)" }}>Política de preço não encontrada.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        variant="entity"
        title={policy.name}
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Políticas", to: "/pricing/policies" },
          { label: policy.name },
        ]}
        meta={<Badge mono>{policy.code}</Badge>}
      />
      <PolicyDetail policy={policy} canCreateVersion={can("pricing.policy.create")} />
    </PageContainer>
  );
}

export function PricingPolicyDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
