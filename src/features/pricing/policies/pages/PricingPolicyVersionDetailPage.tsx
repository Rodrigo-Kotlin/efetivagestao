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
        Carregando versão de política...
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

  if (!version) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Versão de política não encontrada.
      </div>
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
  );
}

export function PricingPolicyVersionDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}