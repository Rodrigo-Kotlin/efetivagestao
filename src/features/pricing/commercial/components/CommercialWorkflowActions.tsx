// ============================================================
// CommercialWorkflowActions — state + permission aware buttons.
// All mutations route through fn_*_commercial_price_version RPCs.
// ============================================================

import type {
  CommercialVersionStatus,
  CommercialWorkflowAction,
} from "../types/commercial.types";

interface Props {
  status: CommercialVersionStatus;
  permissions: {
    canReview?: boolean;
    canApprove?: boolean;
    canPublish?: boolean;
  };
  pending?: boolean;
  onAction: (action: CommercialWorkflowAction) => void;
}

const TERMINAL: CommercialVersionStatus[] = [
  "scheduled",
  "active",
  "superseded",
  "cancelled",
];

const baseBtn: React.CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  border: "none",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
  fontWeight: "var(--font-medium)",
};

export function CommercialWorkflowActions({
  status,
  permissions,
  pending = false,
  onAction,
}: Props) {
  const canReview = !!permissions.canReview;
  const canApprove = !!permissions.canApprove;
  const canPublish = !!permissions.canPublish;

  if (TERMINAL.includes(status)) return null;

  const actionBtn = (
    label: string,
    kind: CommercialWorkflowAction,
    style: React.CSSProperties,
    enabled: boolean
  ) => (
    <button
      type="button"
      disabled={pending || !enabled}
      onClick={() => onAction(kind)}
      style={{ ...baseBtn, ...style, opacity: pending || !enabled ? 0.5 : 1, cursor: pending || !enabled ? "default" : "pointer" }}
    >
      {label}
    </button>
  );

  const actions: React.ReactNode[] = [];

  if (status === "draft" && (canReview || canApprove)) {
    actions.push(actionBtn("Enviar para revisão", "submit", { backgroundColor: "#2563EB", color: "#fff" }, true));
  }

  if (status === "under_review") {
    if (canReview) {
      actions.push(actionBtn("Voltar para rascunho", "return_to_draft", { backgroundColor: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }, true));
    }
    if (canApprove) {
      actions.push(actionBtn("Aprovar versão", "approve", { backgroundColor: "#10B981", color: "#fff" }, true));
    }
  }

  if (status === "approved" && canPublish) {
    actions.push(actionBtn("Publicar / Agendar", "publish", { backgroundColor: "#8B5CF6", color: "#fff" }, true));
  }

  if (
    (status === "draft" && (canReview || canApprove)) ||
    (status === "under_review" && (canReview || canApprove)) ||
    (status === "approved" && (canReview || canPublish))
  ) {
    actions.push(actionBtn("Cancelar versão", "cancel", { backgroundColor: "transparent", color: "#DC2626", border: "1px solid #FECACA" }, true));
  }

  if (actions.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-4)" }}>
      {actions}
    </div>
  );
}
