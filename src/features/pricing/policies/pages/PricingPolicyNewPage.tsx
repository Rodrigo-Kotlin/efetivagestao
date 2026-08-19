import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PolicyForm } from "../components/PolicyForm";
import { createPricingPolicy } from "../api/policies";

function Inner() {
  const navigate = useNavigate();
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!can("pricing.policy.create")) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Você não tem permissão para criar políticas de preço.
      </div>
    );
  }

  const handleSubmit = async (data: {
    code: string;
    name: string;
    description: string;
    scopeType: string;
    catalogCategoryId?: string;
    catalogItemId?: string;
  }) => {
    if (!orgId) return;

    setError(null);
    setSaving(true);

    try {
      const id = await createPricingPolicy({
        orgId,
        code: data.code,
        name: data.name,
        description: data.description,
        scopeType: data.scopeType as "default" | "category" | "catalog_item",
        catalogCategoryId: data.catalogCategoryId,
        catalogItemId: data.catalogItemId,
      });
      navigate(`/pricing/policies/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar a política");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <button
          onClick={() => navigate("/pricing/policies")}
          style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "var(--space-2)" }}
        >
          ← Voltar para políticas
        </button>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
          Nova Política de Preço
        </h1>
      </div>

      {error && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
        </div>
      )}

      <PolicyForm
        onSubmit={(data) => void handleSubmit(data)}
        onCancel={() => navigate("/pricing/policies")}
        submitLabel={saving ? "Criando..." : "Criar Política"}
      />
    </div>
  );
}

export function PricingPolicyNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}