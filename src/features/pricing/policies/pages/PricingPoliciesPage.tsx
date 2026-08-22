import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PolicyList } from "../components/PolicyList";

function Inner() {
  const { can } = useAuth();
  const navigate = useNavigate();

  if (!can("pricing.policy.view")) {
    return (
      <PageContainer>
        <PageHeader
          title="Políticas de Preço"
          description="Regras utilizadas para transformar custos válidos em preços recomendados."
        />
        <Alert tone="negative" title="Sem permissão">
          Você não tem permissão para acessar esta página.
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Políticas de Preço"
        description="Regras utilizadas para transformar custos válidos em preços recomendados."
        actions={
          can("pricing.policy.create") ? (
            <Button variant="filled" onClick={() => navigate("/pricing/policies/new")}>
              Nova política
            </Button>
          ) : undefined
        }
      />
      <PolicyList />
    </PageContainer>
  );
}

export function PricingPoliciesPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
