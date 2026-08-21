// ============================================================
// ClientStatusDialog — profile status change with mandatory reason.
// Mutation routes through fn_set_client_profile_status RPC.
// ============================================================

import { useState } from "react";
import { setClientProfileStatus } from "../api/clientPrices";
import {
  CLIENT_PROFILE_STATUSES,
  STATUS_TRANSITIONS,
  type ClientProfileStatus,
} from "../types/client.types";

interface Props {
  clientId: string;
  currentStatus: ClientProfileStatus;
  onClose: () => void;
  onComplete: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  zIndex: "var(--z-modal)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-4)",
};

const dialogStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
  width: "100%",
  maxWidth: "480px",
  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
  fontFamily: "inherit",
};

function statusImpact(status: ClientProfileStatus): string {
  switch (status) {
    case "active":
      return "O cliente volta a ser elegível para atribuições de tabela e preços específicos.";
    case "inactive":
      return "O perfil fica inativo; o cliente deixa de ser elegível para novas atribuições e preços específicos.";
    case "blocked":
      return "O cliente é bloqueado por motivo comercial ou de risco; nenhuma nova operação de pricing será permitida.";
  }
}

export function ClientStatusDialog({
  clientId,
  currentStatus,
  onClose,
  onComplete,
}: Props) {
  const allowedTargets = STATUS_TRANSITIONS[currentStatus];
  const [targetStatus, setTargetStatus] = useState<ClientProfileStatus>(
    allowedTargets[0] ?? currentStatus
  );
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = reason.trim().length > 0 && !pending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      await setClientProfileStatus({
        clientCompanyId: clientId,
        status: targetStatus,
        reason: reason.trim(),
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={pending ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Alterar status do cliente"
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", margin: 0 }}>
          {targetStatus === "active"
            ? "Ativar cliente"
            : targetStatus === "inactive"
              ? "Inativar cliente"
              : "Bloquear cliente"}
        </h2>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", margin: "var(--space-2) 0 var(--space-4)" }}>
          {statusImpact(targetStatus)}
        </p>

        <fieldset style={{ border: "none", padding: 0, margin: "0 0 var(--space-4)" }}>
          <legend
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
              marginBottom: "var(--space-2)",
            }}
          >
            Novo status
          </legend>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {allowedTargets.map((s) => {
              const info = CLIENT_PROFILE_STATUSES.find((o) => o.value === s);
              return (
                <label
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    fontSize: "var(--text-sm)",
                    cursor: pending ? "default" : "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="client-status-target"
                    value={s}
                    checked={targetStatus === s}
                    disabled={pending}
                    onChange={() => setTargetStatus(s)}
                  />
                  {info?.label ?? s}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div style={{ marginBottom: "var(--space-4)" }}>
          <label
            htmlFor="client-status-reason"
            style={{
              display: "block",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
              marginBottom: "var(--space-2)",
            }}
          >
            Motivo (obrigatório)
          </label>
          <textarea
            id="client-status-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={pending}
            placeholder="Descreva o motivo da alteração de status"
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
              marginBottom: "var(--space-4)",
            }}
          >
            <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              cursor: pending ? "default" : "pointer",
              fontSize: "var(--text-sm)",
            }}
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-text-inverse)",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: canSubmit ? "pointer" : "default",
              opacity: canSubmit ? 1 : 0.5,
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
            }}
          >
            {pending ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
