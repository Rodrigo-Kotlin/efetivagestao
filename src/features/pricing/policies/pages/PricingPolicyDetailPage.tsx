import { useParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePricingPolicy } from "../hooks/usePricingPolicies";
import { PolicyDetail } from "../components/PolicyDetail";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const { policy, loading, error, refetch } = usePricingPolicy(id ?? null);

  if (!can("pricing.policy.view")) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Carregando política de preço...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>{error}</p>
        <button
          onClick={() => void refetch()}
          style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!policy) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Política de preço não encontrada.
      </div>
    );
  }

  return <PolicyDetail policy={policy} canCreateVersion={can("pricing.policy.create")} />;
}

export function PricingPolicyDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}