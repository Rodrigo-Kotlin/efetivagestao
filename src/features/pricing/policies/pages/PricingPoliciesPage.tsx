import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PolicyList } from "../components/PolicyList";

function Inner() {
  const { can } = useAuth();

  if (!can("pricing.policy.view")) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  return <PolicyList />;
}

export function PricingPoliciesPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}