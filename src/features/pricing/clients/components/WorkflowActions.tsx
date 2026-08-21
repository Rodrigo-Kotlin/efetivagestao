// ============================================================
// WorkflowActions — state + permission aware buttons for
// client assignments and price overrides.
// All mutations route through fn_*_client_* RPCs (upstream).
// ============================================================

import type {
  ClientWorkflowStatus,
  ClientPermissions,
} from "../types/client.types";

interface Props {
  status: ClientWorkflowStatus;
  permissions: ClientPermissions;
  type: "assignment" | "override";
  onAction: (action: string) => void;
  pending: boolean;
}

const TERMINAL: ClientWorkflowStatus[] = [
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

export function WorkflowActions({
  status,
  permissions,
  type,
  onAction,
  pending,
}: Props) {
  const canEdit = !!permissions.canEdit;
  const canReview = !!permissions.canReview;
  const canApprove = !!permissions.canApprove;
  const canPublish = !!permissions.canPublish;

  if (TERMINAL.includes(status)) return null;

  const actionBtn = (
    label: string,
    action: string,
    style: React.CSSProperties
  ) => (
    <button
      type="button"
      disabled={pending}
      onClick={() => onAction(action)}
      aria-label={`${label} (${type === "assignment" ? "atribuição" : "preço específico"})`}
      style={{
        ...baseBtn,
        ...style,
        opacity: pending ? 0.5 : 1,
        cursor: pending ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );

  const canDraftActions = canEdit || canReview || canApprove;

  const actions: React.ReactNode[] = [];

  if (status === "draft" && canDraftActions) {
    actions.push(
      actionBtn("Enviar para revisão", "submit", { backgroundColor: "#2563EB", color: "#fff" })
    );
  }

  if (status === "under_review") {
    if (canReview || canApprove) {
      actions.push(
        actionBtn("Voltar para rascunho", "return_to_draft", {
          backgroundColor: "transparent",
          color: "var(--color-text-secondary)",
          border: "1px solid var(--color-border)",
        })
      );
    }
    if (canApprove) {
      actions.push(
        actionBtn("Aprovar", "approve", { backgroundColor: "#10B981", color: "#fff" })
      );
    }
  }

  if (status === "approved" && canPublish) {
    actions.push(
      actionBtn("Publicar / Agendar", "publish", { backgroundColor: "#8B5CF6", color: "#fff" })
    );
  }

  const canCancel =
    (status === "draft" && canDraftActions) ||
    (status === "under_review" && (canReview || canApprove)) ||
    (status === "approved" && (canReview || canPublish));

  if (canCancel) {
    actions.push(
      actionBtn("Cancelar", "cancel", {
        backgroundColor: "transparent",
        color: "#DC2626",
        border: "1px solid #FECACA",
      })
    );
  }

  if (actions.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={
        type === "assignment"
          ? "Ações de workflow da atribuição"
          : "Ações de workflow do preço específico"
      }
      style={{
        display: "flex",
        gap: "var(--space-2)",
        flexWrap: "wrap",
        marginTop: "var(--space-4)",
      }}
    >
      {actions}
    </div>
  );
}
