import { useState } from "react";
import { PRICING_METHODS, ROUNDING_MODES } from "../types/pricing-policy.types";
import type { PricingMethod, RoundingMode } from "../types/pricing-policy.types";
import { parsePercent, parseNumber } from "../utils/format";

interface Props {
  initialData?: {
    valid_from: string;
    valid_to: string | null;
    pricing_method: PricingMethod;
    target_margin_rate: number | null;
    markup_rate: number | null;
    fixed_price: number | null;
    minimum_margin_rate: number | null;
    maximum_discount_rate: number | null;
    rounding_mode: RoundingMode;
    rounding_step: number | null;
    notes: string | null;
  };
  versionNumber?: number;
  onSubmit: (data: {
    valid_from: string;
    valid_to: string | null;
    pricing_method: PricingMethod;
    target_margin_rate: number | null;
    markup_rate: number | null;
    fixed_price: number | null;
    minimum_margin_rate: number | null;
    maximum_discount_rate: number | null;
    rounding_mode: RoundingMode;
    rounding_step: number | null;
    notes: string | null;
  }) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-xs)",
  color: "var(--color-text-secondary)",
  marginBottom: "4px",
};

// UI-FORM04: DB stores fractions (0.20); UI shows percentages ("20").
function fractionToPercentInput(value: number | null): string {
  if (value === null || value === undefined) return "";
  return (value * 100).toString();
}

function fractionToStepInput(value: number | null): string {
  if (value === null || value === undefined) return "";
  return value.toString();
}

// UI-FORM03: only the field relevant to the selected method is sent;
// unused method fields are explicitly NULL (chk_ppv_method_integrity).
function buildMethodPayload(
  method: PricingMethod,
  targetMarginRate: number | null,
  markupRate: number | null,
  fixedPrice: number | null
) {
  if (method === "target_margin") {
    return { pricing_method: method, target_margin_rate: targetMarginRate, markup_rate: null, fixed_price: null };
  }
  if (method === "markup") {
    return { pricing_method: method, target_margin_rate: null, markup_rate: markupRate, fixed_price: null };
  }
  return { pricing_method: method, target_margin_rate: null, markup_rate: null, fixed_price: fixedPrice };
}

export function PolicyVersionForm({ initialData, versionNumber, onSubmit, onCancel, submitLabel = "Criar Versão" }: Props) {
  const [validFrom, setValidFrom] = useState(initialData?.valid_from ?? "");
  const [validTo, setValidTo] = useState(initialData?.valid_to ?? "");
  const [pricingMethod, setPricingMethod] = useState<PricingMethod | "">(initialData?.pricing_method ?? "");
  const [targetMarginRate, setTargetMarginRate] = useState(fractionToPercentInput(initialData?.target_margin_rate ?? null));
  const [markupRate, setMarkupRate] = useState(fractionToPercentInput(initialData?.markup_rate ?? null));
  const [fixedPrice, setFixedPrice] = useState(initialData?.fixed_price?.toString() ?? "");
  const [minimumMarginRate, setMinimumMarginRate] = useState(fractionToPercentInput(initialData?.minimum_margin_rate ?? null));
  const [maximumDiscountRate, setMaximumDiscountRate] = useState(fractionToPercentInput(initialData?.maximum_discount_rate ?? null));
  const [roundingMode, setRoundingMode] = useState<RoundingMode>(initialData?.rounding_mode ?? "none");
  const [roundingStep, setRoundingStep] = useState(fractionToStepInput(initialData?.rounding_step ?? null));
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const method = pricingMethod as PricingMethod;

  const handleSubmit = () => {
    setError(null);

    if (!validFrom) {
      setError("Informe a data de início de vigência.");
      return;
    }

    if (validTo && validTo < validFrom) {
      setError("A data final de vigência não pode ser anterior à inicial.");
      return;
    }

    if (!pricingMethod) {
      setError("Selecione o método de precificação.");
      return;
    }

    if (method === "target_margin" && targetMarginRate.trim() === "") {
      setError("Informe a margem-alvo.");
      return;
    }

    if (method === "markup" && markupRate.trim() === "") {
      setError("Informe o markup.");
      return;
    }

    if (method === "fixed_price" && fixedPrice.trim() === "") {
      setError("Informe o preço fixo.");
      return;
    }

    const targetMargin = parsePercent(targetMarginRate);
    const markup = parsePercent(markupRate);
    const fixed = parseNumber(fixedPrice);
    const minMargin = parsePercent(minimumMarginRate);
    const maxDiscount = parsePercent(maximumDiscountRate);
    const step = parseNumber(roundingStep);

    if (method === "target_margin" && (targetMargin === null || targetMargin < 0 || targetMargin >= 1)) {
      setError("A margem-alvo deve estar entre 0% e 100% (excluindo 100%).");
      return;
    }

    if (method === "markup" && (markup === null || markup < 0)) {
      setError("O markup não pode ser negativo.");
      return;
    }

    if (method === "fixed_price" && (fixed === null || fixed < 0)) {
      setError("Informe um preço fixo válido.");
      return;
    }

    if (minMargin !== null && (minMargin < 0 || minMargin >= 1)) {
      setError("A margem mínima deve estar entre 0% e 100% (excluindo 100%).");
      return;
    }

    if (maxDiscount !== null && (maxDiscount < 0 || maxDiscount > 1)) {
      setError("O desconto máximo deve estar entre 0% e 100%.");
      return;
    }

    if (roundingMode !== "none" && (step === null || step <= 0)) {
      setError("Informe um passo de arredondamento maior que zero.");
      return;
    }

    const methodPayload = buildMethodPayload(method, targetMargin, markup, fixed);

    onSubmit({
      valid_from: validFrom,
      valid_to: validTo || null,
      pricing_method: methodPayload.pricing_method,
      target_margin_rate: methodPayload.target_margin_rate,
      markup_rate: methodPayload.markup_rate,
      fixed_price: methodPayload.fixed_price,
      minimum_margin_rate: minMargin,
      maximum_discount_rate: maxDiscount,
      rounding_mode: roundingMode,
      rounding_step: roundingMode === "none" ? null : step,
      notes: notes.trim() || null,
    });
  };

  return (
    <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)" }}>
      {versionNumber !== undefined && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
          Nova versão <strong>v{versionNumber}</strong> desta política.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <div>
          <label style={labelStyle}>Vigência inicial *</label>
          <input
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            style={inputStyle}
            aria-label="Data de início de vigência"
          />
        </div>
        <div>
          <label style={labelStyle}>Vigência final</label>
          <input
            type="date"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            style={inputStyle}
            aria-label="Data de fim de vigência"
          />
        </div>
      </div>

      <div style={{ marginBottom: "var(--space-4)" }}>
        <label style={labelStyle}>Método de precificação *</label>
        <select
          value={pricingMethod}
          onChange={(e) => setPricingMethod(e.target.value as PricingMethod)}
          style={inputStyle}
          aria-label="Método de precificação"
        >
          <option value="">Selecione o método...</option>
          {PRICING_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {method === "target_margin" && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <label style={labelStyle}>Margem-alvo (%) *</label>
          <input
            type="number"
            value={targetMarginRate}
            onChange={(e) => setTargetMarginRate(e.target.value)}
            min={0}
            max={99.999}
            step="0.01"
            placeholder="Ex.: 20"
            style={inputStyle}
            aria-label="Margem-alvo em percentual"
          />
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginTop: "4px" }}>
            Ex.: 20 equivale a 20% de margem sobre o preço.
          </p>
        </div>
      )}

      {method === "markup" && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <label style={labelStyle}>Markup (%) *</label>
          <input
            type="number"
            value={markupRate}
            onChange={(e) => setMarkupRate(e.target.value)}
            min={0}
            step="0.01"
            placeholder="Ex.: 25"
            style={inputStyle}
            aria-label="Markup em percentual"
          />
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginTop: "4px" }}>
            Ex.: 25 equivale a 25% de acréscimo sobre o custo total.
          </p>
        </div>
      )}

      {method === "fixed_price" && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <label style={labelStyle}>Preço fixo (R$) *</label>
          <input
            type="number"
            value={fixedPrice}
            onChange={(e) => setFixedPrice(e.target.value)}
            min={0}
            step="0.01"
            placeholder="Ex.: 120.00"
            style={inputStyle}
            aria-label="Preço fixo em reais"
          />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <div>
          <label style={labelStyle}>Margem mínima (%)</label>
          <input
            type="number"
            value={minimumMarginRate}
            onChange={(e) => setMinimumMarginRate(e.target.value)}
            min={0}
            max={99.999}
            step="0.01"
            placeholder="Ex.: 15"
            style={inputStyle}
            aria-label="Margem mínima em percentual"
          />
        </div>
        <div>
          <label style={labelStyle}>Desconto máximo (%)</label>
          <input
            type="number"
            value={maximumDiscountRate}
            onChange={(e) => setMaximumDiscountRate(e.target.value)}
            min={0}
            max={100}
            step="0.01"
            placeholder="Ex.: 10"
            style={inputStyle}
            aria-label="Desconto máximo em percentual"
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <div>
          <label style={labelStyle}>Arredondamento</label>
          <select
            value={roundingMode}
            onChange={(e) => setRoundingMode(e.target.value as RoundingMode)}
            style={inputStyle}
            aria-label="Modo de arredondamento"
          >
            {ROUNDING_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Passo de arredondamento (R$)</label>
          <input
            type="number"
            value={roundingStep}
            onChange={(e) => setRoundingStep(e.target.value)}
            min={0}
            step="0.01"
            placeholder="Ex.: 0.10"
            disabled={roundingMode === "none"}
            style={{ ...inputStyle, opacity: roundingMode === "none" ? 0.5 : 1 }}
            aria-label="Passo de arredondamento em reais"
          />
        </div>
      </div>

      <div style={{ marginBottom: "var(--space-4)" }}>
        <label style={labelStyle}>Observações</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          aria-label="Observações da versão"
        />
      </div>

      {error && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
          }}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}