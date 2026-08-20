// ============================================================
// CommercialBulkAdjustment — wraps fn_bulk_adjust_commercial_prices.
// Frontend only submits operation parameters; never recalculates
// or persists the resulting prices locally.
// ============================================================

import { useState } from "react";
import type { BulkOperation, RoundingMode } from "../types/commercial.types";
import { BULK_OPERATIONS, BULK_ROUNDING_STEPS, ROUNDING_MODES } from "../types/commercial.types";

interface Props {
  selectedCount: number;
  onSubmit: (input: {
    operation: BulkOperation;
    rate: number | null;
    fixedAmount: number | null;
    roundingMode: RoundingMode | null;
    roundingStep: number | null;
  }) => Promise<void>;
  onCancel: () => void;
}

export function CommercialBulkAdjustment({
  selectedCount,
  onSubmit,
  onCancel,
}: Props) {
  const [operation, setOperation] = useState<BulkOperation>("percentage");
  const [percentInput, setPercentInput] = useState("");
  const [fixedInput, setFixedInput] = useState("");
  const [roundingMode, setRoundingMode] = useState<RoundingMode>("nearest");
  const [roundingStep, setRoundingStep] = useState<string>("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const params: {
        operation: BulkOperation;
        rate: number | null;
        fixedAmount: number | null;
        roundingMode: RoundingMode | null;
        roundingStep: number | null;
      } = {
        operation,
        rate: null,
        fixedAmount: null,
        roundingMode: null,
        roundingStep: null,
      };
      if (operation === "percentage") {
        const pct = Number(percentInput.replace(",", "."));
        if (!Number.isFinite(pct)) throw new Error("Informe um percentual válido.");
        // Front-end input normalization only — backend applies the math.
        params.rate = pct / 100;
      } else if (operation === "fixed") {
        const fixed = Number(fixedInput.replace(",", "."));
        if (!Number.isFinite(fixed)) throw new Error("Informe um valor fixo válido.");
        params.fixedAmount = fixed;
      } else {
        const step = Number(roundingStep.replace(",", "."));
        if (!Number.isFinite(step) || step <= 0)
          throw new Error("Informe um passo de arredondamento positivo.");
        params.roundingMode = roundingMode;
        params.roundingStep = step;
      }
      setSubmitting(true);
      await onSubmit(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no ajuste em massa");
    } finally {
      setSubmitting(false);
    }
  };

  const operationLabel =
    operation === "percentage"
      ? `Aplicar ${percentInput || "?"}% ${percentInput && Number(percentInput) >= 0 ? "de aumento" : "de redução"} a ${selectedCount} ${selectedCount === 1 ? "item" : "itens"}`
      : operation === "fixed"
        ? `Aplicar ajuste de R$ ${fixedInput || "?"} a ${selectedCount} ${selectedCount === 1 ? "item" : "itens"}`
        : `Arredondar ${selectedCount} ${selectedCount === 1 ? "item" : "itens"} para ${ROUNDING_MODES.find((m) => m.value === roundingMode)?.label.toLowerCase()} (passo R$ ${roundingStep})`;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
      }}
    >
      <h4 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-3)" }}>
        Ajuste em massa
      </h4>

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2) var(--space-3)",
            marginBottom: "var(--space-3)",
          }}
        >
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        <div>
          <label
            htmlFor="cba-op"
            style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
          >
            Operação
          </label>
          <select
            id="cba-op"
            value={operation}
            onChange={(e) => setOperation(e.target.value as BulkOperation)}
            style={{
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
            }}
          >
            {BULK_OPERATIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {operation === "percentage" && (
          <div>
            <label
              htmlFor="cba-pct"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Percentual (use sinal para indicar redução)
            </label>
            <input
              id="cba-pct"
              type="text"
              inputMode="decimal"
              value={percentInput}
              onChange={(e) => setPercentInput(e.target.value)}
              placeholder="Ex: 5 ou -2,5"
              style={{
                width: "100%",
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
              }}
            />
          </div>
        )}

        {operation === "fixed" && (
          <div>
            <label
              htmlFor="cba-fixed"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Valor fixo (R$)
            </label>
            <input
              id="cba-fixed"
              type="text"
              inputMode="decimal"
              value={fixedInput}
              onChange={(e) => setFixedInput(e.target.value)}
              placeholder="Ex: +5,00 ou -2,50"
              style={{
                width: "100%",
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
              }}
            />
          </div>
        )}

        {operation === "round" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div>
              <label
                htmlFor="cba-mode"
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
              >
                Modo
              </label>
              <select
                id="cba-mode"
                value={roundingMode}
                onChange={(e) => setRoundingMode(e.target.value as RoundingMode)}
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--text-sm)",
                }}
              >
                {ROUNDING_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="cba-step"
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
              >
                Passo (R$)
              </label>
              <select
                id="cba-step"
                value={roundingStep}
                onChange={(e) => setRoundingStep(e.target.value)}
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--text-sm)",
                }}
              >
                {BULK_ROUNDING_STEPS.map((s) => (
                  <option key={s} value={String(s)}>
                    R$ {s.toFixed(2).replace(".", ",")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div
          style={{
            padding: "var(--space-2) var(--space-3)",
            backgroundColor: "var(--color-surface-secondary, #F8FAFC)",
            border: "1px solid var(--color-border-light, #F1F5F9)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
          }}
        >
          {operationLabel}
        </div>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
        <button
          type="submit"
          disabled={submitting || selectedCount === 0}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-text-inverse)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
            cursor: submitting || selectedCount === 0 ? "default" : "pointer",
            opacity: submitting || selectedCount === 0 ? 0.6 : 1,
          }}
        >
          {submitting ? "Aplicando..." : "Confirmar ajuste"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            cursor: submitting ? "default" : "pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
