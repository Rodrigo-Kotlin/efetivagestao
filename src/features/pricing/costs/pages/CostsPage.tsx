import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { CostTableList } from "../components/CostTableList";

function Inner() {
  const { can } = useAuth();
  const navigate = useNavigate();

  if (!can("pricing.cost.view")) {
    return (
      <PageContainer>
        <PageHeader
          title="Custos"
          description="Custos de exames e serviços por fornecedor e vigência."
        />
        <p style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
          Você não tem permissão para acessar esta página.
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Custos"
        description="Custos de exames e serviços por fornecedor e vigência."
        actions={
          can("pricing.cost.create") ? (
            <Button variant="filled" onClick={() => navigate("/pricing/costs/new")}>
              Nova tabela de custo
            </Button>
          ) : undefined
        }
      />
      <CostTableList />
    </PageContainer>
  );
}

export function CostsPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
