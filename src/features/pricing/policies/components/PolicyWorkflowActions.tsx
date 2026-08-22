import type { PricingPolicyVersionStatus } from "../types/pricing-policy.types";
import { Button } from "@/components/ui/Button";

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

export function PolicyWorkflowActions({ status, permissions, pending = false, onAction }: Props) {
  const { canEdit = false, canReview = false, canApprove = false, canPublish = false } = permissions;

  const isDraft = status === "draft";
  const isUnderReview = status === "under_review";
  const isApproved = status === "approved";
  const isTerminal = TERMINAL.includes(status);

  if (isTerminal) return null;

  const cancelVisible =
    (isDraft && canEdit) ||
    (isUnderReview && (canReview || canApprove)) ||
    (isApproved && (canPublish || canEdit));

  return (
    <div style={{ display: "flex", gap: "var(--md-sys-spacing-2)", flexWrap: "wrap", marginTop: "var(--md-sys-spacing-4)" }}>
      {isDraft && canEdit ? (
        <Button variant="filled" size="compact" disabled={pending} onClick={() => onAction("submit")}>
          {pending ? "Enviando..." : "Enviar para revisão"}
        </Button>
      ) : null}

      {isUnderReview && canReview ? (
        <Button variant="outlined" size="compact" disabled={pending} onClick={() => onAction("return_to_draft")}>
          Voltar para rascunho
        </Button>
      ) : null}

      {isUnderReview && canApprove ? (
        <Button variant="filled" size="compact" disabled={pending} onClick={() => onAction("approve")}>
          Aprovar
        </Button>
      ) : null}

      {isApproved && canPublish ? (
        <Button variant="filled" size="compact" disabled={pending} onClick={() => onAction("publish")}>
          Publicar / Agendar
        </Button>
      ) : null}

      {cancelVisible ? (
        <Button variant="outlined" size="compact" disabled={pending} onClick={() => onAction("cancel")}>
          Cancelar
        </Button>
      ) : null}
    </div>
  );
}
