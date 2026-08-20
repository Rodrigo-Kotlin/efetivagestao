// ============================================================
// CommercialExceptionPanel — list of exceptions, request form,
// and decision controls. Version approval ≠ exception approval.
// ============================================================

import { useState } from "react";
import {
  CommercialExceptionStatusBadge,
  CommercialViolationBadge,
} from "./CommercialBadges";
import type {
  CommercialPriceException,
  CommercialViolationCode,
} from "../types/commercial.types";
import { COMMERCIAL_VIOLATION_CODES } from "../types/commercial.types";
import { formatDateTime } from "../utils/format";

interface Props {
  exceptions: CommercialPriceException[];
  canRequest: boolean;
  canDecide: boolean;
  onRequest: (data: { itemId: string; violationCode: CommercialViolationCode; reason: string }) => Promise<void>;
  onDecide: (data: { exceptionId: string; decision: "approved" | "denied"; notes: string | null }) => Promise<void>;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4)",
  marginBottom: "var(--space-4)",
};

export function CommercialExceptionPanel({
  exceptions,
  canRequest,
  canDecide,
  onRequest,
  onDecide,
}: Props) {
  const [requestItemId, setRequestItemId] = useState<string | null>(null);
  const [requestViolation, setRequestViolation] = useState<CommercialViolationCode>("BELOW_COST");
  const [requestReason, setRequestReason] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async () => {
    if (!requestItemId) {
      setRequestError("Selecione um item.");
      return;
    }
    if (!requestReason.trim()) {
      setRequestError("Informe a justificativa.");
      return;
    }
    setSubmitting(true);
    setRequestError(null);
    try {
      await onRequest({
        itemId: requestItemId,
        violationCode: requestViolation,
        reason: requestReason.trim(),
      });
      setRequestItemId(null);
      setRequestReason("");
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Falha ao solicitar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecide = (ex: CommercialPriceException, decision: "approved" | "denied") => {
    if (!window.confirm(`${decision === "approved" ? "Aprovar" : "Negar"} esta exceção?`))
      return;
    void onDecide({ exceptionId: ex.id, decision, notes: null });
  };

  const pendingExceptions = exceptions.filter((e) => e.status === "requested");
  const decidedExceptions = exceptions.filter((e) => e.status !== "requested");

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-3)" }}>
        Exceções
      </h3>

      {exceptions.length === 0 && (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
          Nenhuma exceção registrada nesta versão.
        </p>
      )}

      {pendingExceptions.length > 0 && (
        <div style={{ marginBottom: "var(--space-3)" }}>
          <h4 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-2)" }}>
            Pendentes
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "var(--space-2)" }}>
            {pendingExceptions.map((ex) => (
              <li
                key={ex.id}
                style={{
                  border: "1px solid var(--color-border-light, #F1F5F9)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-2) var(--space-3)",
                }}
              >
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                  <CommercialViolationBadge code={ex.violation_code} />
                  <CommercialExceptionStatusBadge status={ex.status} />
                  <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-xs)" }}>
                    Solicitada em {formatDateTime(ex.requested_at)}
                  </span>
                </div>
                <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-sm)" }}>
                  {ex.reason}
                </p>
                {canDecide && (
                  <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                    <button
                      type="button"
                      onClick={() => handleDecide(ex, "approved")}
                      style={{
                        padding: "var(--space-1) var(--space-3)",
                        backgroundColor: "#10B981",
                        color: "#fff",
                        border: "none",
                        borderRadius: "var(--radius-md)",
                        fontSize: "var(--text-xs)",
                        cursor: "pointer",
                      }}
                    >
                      Aprovar exceção
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecide(ex, "denied")}
                      style={{
                        padding: "var(--space-1) var(--space-3)",
                        backgroundColor: "transparent",
                        color: "#DC2626",
                        border: "1px solid #DC2626",
                        borderRadius: "var(--radius-md)",
                        fontSize: "var(--text-xs)",
                        cursor: "pointer",
                      }}
                    >
                      Negar exceção
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {decidedExceptions.length > 0 && (
        <div>
          <h4 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-2)" }}>
            Decididas
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "var(--space-2)" }}>
            {decidedExceptions.map((ex) => (
              <li
                key={ex.id}
                style={{
                  border: "1px solid var(--color-border-light, #F1F5F9)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-2) var(--space-3)",
                }}
              >
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                  <CommercialViolationBadge code={ex.violation_code} />
                  <CommercialExceptionStatusBadge status={ex.status} />
                  {ex.decided_at && (
                    <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-xs)" }}>
                      Decidida em {formatDateTime(ex.decided_at)}
                    </span>
                  )}
                </div>
                <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-sm)" }}>
                  {ex.reason}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canRequest && (
        <fieldset
          style={{
            marginTop: "var(--space-3)",
            border: "1px dashed var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)",
          }}
        >
          <legend style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}>
            Solicitar nova exceção
          </legend>
          {requestError && (
            <p
              role="alert"
              style={{
                color: "#991B1B",
                fontSize: "var(--text-sm)",
                marginBottom: "var(--space-2)",
              }}
            >
              {requestError}
            </p>
          )}
          <div style={{ display: "grid", gap: "var(--space-2)" }}>
            <input
              type="text"
              placeholder="ID do item"
              value={requestItemId ?? ""}
              onChange={(e) => setRequestItemId(e.target.value || null)}
              style={{
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
              }}
            />
            <select
              value={requestViolation}
              onChange={(e) =>
                setRequestViolation(e.target.value as CommercialViolationCode)
              }
              style={{
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
              }}
            >
              {COMMERCIAL_VIOLATION_CODES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Justificativa (obrigatória)"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              rows={2}
              style={{
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                resize: "vertical",
              }}
            />
            <button
              type="button"
              onClick={() => void handleRequest()}
              disabled={submitting}
              style={{
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-text-inverse)",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Enviando..." : "Solicitar exceção"}
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
