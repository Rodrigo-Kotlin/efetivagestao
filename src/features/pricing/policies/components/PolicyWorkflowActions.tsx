import type { PricingPolicyVersionStatus } from "../types/pricing-policy.types";

type ActionKind = "submit" | "approve" | "return_to_draft" | "cancel" | "publish";

interface Props {
  status: PricingPolicyVersionStatus;
  permissions: {
    canEdit?: boolean;
    canReview?: boolean;
    canApprove?: boolean;
    canPublish?: boolean;
  };
  pending?: boolean;
  onAction: (action: ActionKind) => void;
}

const TERMINAL: PricingPolicyVersionStatus[] = ["scheduled", "active", "superseded", "cancelled"];

const buttonBase: React.CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  border: "none",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  fontSize: "var(--text-sm)",
  fontWeight: "var(--font-medium)",
  opacity: 1,
};

export function PolicyWorkflowActions({ status, permissions, pending = false, onAction }: Props) {
  const { canEdit = false, canReview = false, canApprove = false, canPublish = false } = permissions;

  const isDraft = status === "draft";
  const isUnderReview = status === "under_review";
  const isApproved = status === "approved";
  const isTerminal = TERMINAL.includes(status);

  const actionBtn = (
    label: string,
    kind: ActionKind,
    style: React.CSSProperties,
    enabled: boolean
  ) => (
    <button
      type="button"
      disabled={pending || !enabled}
      onClick={() => onAction(kind)}
      style={{ ...buttonBase, ...style, opacity: pending || !enabled ? 0.5 : 1, cursor: pending || !enabled ? "default" : "pointer" }}
    >
      {label}
    </button>
  );

  const actions: React.ReactNode[] = [];

  // UI-WF: actions are permission-aware and state-aware.
  if (isDraft && canEdit) {
    actions.push(actionBtn("Enviar para revisão", "submit", { backgroundColor: "#3B82F6", color: "#fff" }, true));
  }

  if (isUnderReview) {
    if (canReview) {
      actions.push(actionBtn("Voltar para rascunho", "return_to_draft", { backgroundColor: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }, true));
    }
    if (canApprove) {
      actions.push(actionBtn("Aprovar", "approve", { backgroundColor: "#10B981", color: "#fff" }, true));
    }
  }

  if (isApproved && canPublish) {
    actions.push(actionBtn("Publicar / Agendar", "publish", { backgroundColor: "#8B5CF6", color: "#fff" }, true));
  }

  if ((isDraft && canEdit) || (isUnderReview && (canReview || canApprove)) || (isApproved && (canPublish || canEdit))) {
    actions.push(actionBtn("Cancelar", "cancel", { backgroundColor: "transparent", color: "#DC2626", border: "1px solid #FECACA" }, true));
  }

  if (actions.length === 0 || isTerminal) {
    return null;
  }

  return (
    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-4)" }}>
      {actions}
    </div>
  );
}