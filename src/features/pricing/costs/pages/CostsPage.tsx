import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CostTableList } from "../components/CostTableList";

function Inner() {
  const { can } = useAuth();

  if (!can("pricing.cost.view")) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  return <CostTableList />;
}

export function CostsPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
