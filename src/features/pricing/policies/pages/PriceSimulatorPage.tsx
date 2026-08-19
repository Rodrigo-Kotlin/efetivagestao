import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePriceSimulator } from "../hooks/usePricingPolicies";
import { SimulationForm } from "../components/SimulationForm";
import { SimulationResultView } from "../components/SimulationResult";

function Inner() {
  const { can } = useAuth();
  const { result, loading, error, run, clear } = usePriceSimulator();

  if (!can("pricing.calculate")) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Você não tem permissão para simular preços.
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
          Simulador de Preço
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Calcula o preço conforme a política de preço e o custo vigentes. O motor de precificação é a única fonte de cálculo.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
        </div>
      )}

      <SimulationForm
        onSubmit={(input) => void run(input)}
        onClear={clear}
        loading={loading}
      />

      {result && <SimulationResultView result={result} />}
    </div>
  );
}

export function PriceSimulatorPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}