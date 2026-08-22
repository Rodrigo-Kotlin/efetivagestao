import { useParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  usePricingPolicyVersion,
  usePricingPolicyWorkflow,
} from "../hooks/usePricingPolicies";
import { PolicyVersionDetail } from "../components/PolicyVersionDetail";
import {
  addPricingPolicyComponent,
  deletePricingPolicyComponent,
  updateDraftPricingPolicyVersion,
} from "../api/policies";
import type { WorkflowActionKind } from "../types/pricing-policy.types";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

const ACTION_CONFIRM: Record<WorkflowActionKind, string> = {
  submit: "Enviar a versão para revisão?",
  approve: "Aprovar a versão?",
  publish: "Publicar a versão? Versões aprovadas tornam-se ativas na vigência.",
  return_to_draft: "Voltar a versão para rascunho?",
  cancel: "Cancelar a versão? Esta ação não pode ser desfeita.",
};

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;

  const { version, loading, error, refetch } = usePricingPolicyVersion(id ?? null);
  const { run, pending, error: workflowError } = usePricingPolicyWorkflow();

  const pageTitle = version?.policy?.name
    ? `Versão v${version.version_number} — ${version.policy.name}`
    : `Versão v${version?.version_number ?? ""}`;

  if (!can("pricing.policy.view")) {
    return (
      <PageContainer>
        <PageHeader title={pageTitle} />
        <Alert tone="negative" title="Sem permissão">
          Você não tem permissão para acessar esta página.
        </Alert>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer size="wide">
        <PageHeader variant="entity" title="Versão" breadcrumbs={[{ label: "Versão" }]} />
        <Spinner label="Carregando versão de política..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer size="wide">
        <PageHeader variant="entity" title="Versão" breadcrumbs={[{ label: "Erro" }]} />
        <Alert tone="negative" title={error}>
          <Button variant="outlined" onClick={() => void refetch()}>Tentar novamente</Button>
        </Alert>
      </PageContainer>
    );
  }

  if (!version) {
    return (
      <PageContainer size="wide">
        <PageHeader variant="entity" title="Versão" breadcrumbs={[{ label: "Não encontrada" }]} />
        <p style={{ color: "var(--md-sys-color-on-surface-variant)" }}>Versão de política não encontrada.</p>
      </PageContainer>
    );
  }

  const handleWorkflowAction = (action: WorkflowActionKind) => {
    if (!window.confirm(ACTION_CONFIRM[action])) return;

    void run(action, version.id).then((ok) => {
      if (ok) void refetch();
    });
  };

  const handleSaveDraft = async (data: {
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
    if (!orgId) return;

    await updateDraftPricingPolicyVersion(version.id, orgId, {
      valid_from: data.valid_from,
      valid_to: data.valid_to,
      pricing_method: data.pricing_method,
      target_margin_rate: data.target_margin_rate,
      markup_rate: data.markup_rate,
      fixed_price: data.fixed_price,
      minimum_margin_rate: data.minimum_margin_rate,
      maximum_discount_rate: data.maximum_discount_rate,
      rounding_mode: data.rounding_mode,
      rounding_step: data.rounding_step,
      notes: data.notes,
    });

    void refetch();
  };

  const handleAddComponent = async (data: {
    name: string;
    componentType: string;
    fixedAmount: number | null;
    rate: number | null;
  }) => {
    if (!orgId) return;

    await addPricingPolicyComponent({
      versionId: version.id,
      orgId,
      name: data.name,
      componentType: data.componentType,
      fixedAmount: data.fixedAmount,
      rate: data.rate,
    });

    void refetch();
  };

  const handleDeleteComponent = async (componentId: string) => {
    if (!orgId) return;

    await deletePricingPolicyComponent(componentId, orgId);
    void refetch();
  };

  return (
    <PageContainer size="wide">
      <PageHeader
        variant="entity"
        title={pageTitle}
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Políticas", to: "/pricing/policies" },
          { label: version.policy?.name ?? "Política", to: version.pricing_policy_id ? `/pricing/policies/${version.pricing_policy_id}` : undefined },
          { label: `v${version.version_number}` },
        ]}
      />
      <PolicyVersionDetail
        version={version}
        permissions={{
          canEdit: can("pricing.policy.edit"),
          canReview: can("pricing.policy.review"),
          canApprove: can("pricing.policy.approve"),
          canPublish: can("pricing.policy.publish"),
        }}
        workflowPending={pending}
        workflowError={workflowError}
        onWorkflowAction={handleWorkflowAction}
        onSaveDraft={handleSaveDraft}
        onAddComponent={handleAddComponent}
        onDeleteComponent={handleDeleteComponent}
      />
    </PageContainer>
  );
}

export function PricingPolicyVersionDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
