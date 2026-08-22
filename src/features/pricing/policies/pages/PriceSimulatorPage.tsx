import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePriceSimulator } from "../hooks/usePricingPolicies";
import { SimulationForm } from "../components/SimulationForm";
import { SimulationResultView } from "../components/SimulationResult";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";

function Inner() {
  const { can } = useAuth();
  const { result, loading, error, run, clear } = usePriceSimulator();

  if (!can("pricing.calculate")) {
    return (
      <PageContainer>
        <PageHeader
          title="Simulador de Preço"
          description="Simule o preço recomendado a partir do custo e da política vigentes."
        />
        <Alert tone="negative" title="Sem permissão">
          Você não tem permissão para simular preços.
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Simulador de Preço"
        description="Simule o preço recomendado a partir do custo e da política vigentes."
      />
      <p style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)", marginTop: "calc(var(--md-sys-spacing-2) * -1)" }}>
        Esta simulação gera uma recomendação. O preço comercial oficial é definido nas Tabelas Comerciais.
      </p>
      {error ? <Alert tone="negative" title={error} /> : null}
      <SimulationForm
        onSubmit={(input) => void run(input)}
        onClear={clear}
        loading={loading}
      />
      {result ? <SimulationResultView result={result} /> : null}
    </PageContainer>
  );
}

export function PriceSimulatorPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
