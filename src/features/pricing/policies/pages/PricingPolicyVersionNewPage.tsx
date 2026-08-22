import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createPricingPolicyVersion, fetchPricingPolicy } from "../api/policies";
import { PolicyVersionForm } from "../components/PolicyVersionForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { FormAlert } from "@/components/ui/FormAlert";

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
      <PageContainer>
        <PageHeader
          variant="compact"
          title="Nova versão"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Políticas", to: "/pricing/policies" },
            { label: "Nova versão" },
          ]}
        />
        <FormAlert tone="error">Você não tem permissão para criar versões de política.</FormAlert>
      </PageContainer>
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
    <PageContainer>
      <PageHeader
        variant="compact"
        title={policy ? `Nova versão — ${policy.name}` : "Nova Versão de Política"}
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Políticas", to: "/pricing/policies" },
          { label: policy?.name ?? "Política", to: id ? `/pricing/policies/${id}` : undefined },
          { label: "Nova versão" },
        ]}
        meta={policy ? <Badge mono>{policy.code}</Badge> : undefined}
      />

      {loading ? (
        <Spinner label="Carregando política..." />
      ) : loadError ? (
        <Alert tone="negative" title={loadError} />
      ) : (
        <>
          {saveError ? <FormAlert tone="error">{saveError}</FormAlert> : null}
          <PolicyVersionForm
            onSubmit={(data) => void handleSubmit(data)}
            onCancel={() => navigate(`/pricing/policies/${id}`)}
            submitLabel={saving ? "Criando..." : "Criar Versão"}
          />
        </>
      )}
    </PageContainer>
  );
}

export function PricingPolicyVersionNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
