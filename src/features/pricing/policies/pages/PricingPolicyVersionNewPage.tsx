import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createPricingPolicyVersion, fetchPricingPolicy } from "../api/policies";
import { PolicyVersionForm } from "../components/PolicyVersionForm";
import { CodeBadge } from "../components/PolicyBadges";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { activeOrganization, can } = useAuth();
  const navigate = useNavigate();

  const [policy, setPolicy] = useState<{ code: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;

  useEffect(() => {
    if (!id || !orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchPricingPolicy(id, orgId)
      .then((data) => {
        if (!cancelled) {
          if (!data) {
            setLoadError("Política de preço não encontrada");
          } else {
            setPolicy({ code: data.code, name: data.name });
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Erro ao carregar política");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, orgId]);

  if (!can("pricing.policy.create")) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Você não tem permissão para criar versões de política.
      </div>
    );
  }

  const handleSubmit = async (data: {
    valid_from: string;
    valid_to: string | null;
    pricing_method: string;
    target_margin_rate: number | null;
    markup_rate: number | null;
    fixed_price: number | null;
    minimum_margin_rate: number | null;
    maximum_discount_rate: number | null;
    rounding_mode: string;
    rounding_step: number | null;
    notes: string | null;
  }) => {
    if (!id || !orgId) return;

    setSaveError(null);
    setSaving(true);

    try {
      const versionId = await createPricingPolicyVersion({
        policyId: id,
        orgId,
        validFrom: data.valid_from,
        validTo: data.valid_to,
        pricingMethod: data.pricing_method,
        targetMarginRate: data.target_margin_rate,
        markupRate: data.markup_rate,
        fixedPrice: data.fixed_price,
        minimumMarginRate: data.minimum_margin_rate,
        maximumDiscountRate: data.maximum_discount_rate,
        roundingMode: data.rounding_mode,
        roundingStep: data.rounding_step,
        notes: data.notes,
      });
      navigate(`/pricing/policies/versions/${versionId}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Falha ao criar a versão");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <button
          onClick={() => navigate(`/pricing/policies/${id}`)}
          style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "var(--space-2)" }}
        >
          ← Voltar para a política
        </button>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
          Nova Versão de Política
        </h1>
        {policy && (
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>{policy.name}</span>
            <CodeBadge code={policy.code} />
          </div>
        )}
      </div>

      {loadError && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{loadError}</p>
        </div>
      )}

      {saveError && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{saveError}</p>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Carregando política...
        </div>
      ) : (
        !loadError && (
          <PolicyVersionForm
            onSubmit={(data) => void handleSubmit(data)}
            onCancel={() => navigate(`/pricing/policies/${id}`)}
            submitLabel={saving ? "Criando..." : "Criar Versão"}
          />
        )
      )}
    </div>
  );
}

export function PricingPolicyVersionNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}