import { useState } from "react";
import { PRICING_METHODS, ROUNDING_MODES } from "../types/pricing-policy.types";
import type { PricingMethod, RoundingMode } from "../types/pricing-policy.types";
import { parsePercent, parseNumber } from "../utils/format";
import { FormSection } from "@/components/ui/FormSection";
import { FormActions } from "@/components/ui/FormActions";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { Button } from "@/components/ui/Button";

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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      noValidate
    >
      <FormSection title="Vigência" description={versionNumber !== undefined ? `Nova versão v${versionNumber} desta política.` : "Período de validade desta versão."}>
        <FieldGroup columns={2}>
          <TextField
            label="Vigência inicial"
            type="date"
            required
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
          <TextField
            label="Vigência final"
            type="date"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Método de precificação" description="Escolha como esta versão calcula o preço recomendado.">
        <Select
          label="Método"
          required
          value={pricingMethod}
          onChange={(e) => setPricingMethod(e.target.value as PricingMethod)}
        >
          <option value="">Selecione o método...</option>
          {PRICING_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>

        {method === "target_margin" ? (
          <TextField
            label="Margem-alvo (%)"
            type="number"
            required
            min={0}
            max={99.999}
            step="0.01"
            placeholder="Ex.: 20"
            value={targetMarginRate}
            onChange={(e) => setTargetMarginRate(e.target.value)}
            supportingText="Ex.: 20 equivale a 20% de margem sobre o preço."
          />
        ) : null}

        {method === "markup" ? (
          <TextField
            label="Markup (%)"
            type="number"
            required
            min={0}
            step="0.01"
            placeholder="Ex.: 25"
            value={markupRate}
            onChange={(e) => setMarkupRate(e.target.value)}
            supportingText="Ex.: 25 equivale a 25% de acréscimo sobre o custo total."
          />
        ) : null}

        {method === "fixed_price" ? (
          <TextField
            label="Preço fixo (R$)"
            type="number"
            required
            min={0}
            step="0.01"
            placeholder="Ex.: 120.00"
            value={fixedPrice}
            onChange={(e) => setFixedPrice(e.target.value)}
          />
        ) : null}
      </FormSection>

      <FormSection title="Limites e arredondamento">
        <FieldGroup columns={2}>
          <TextField
            label="Margem mínima (%)"
            type="number"
            min={0}
            max={99.999}
            step="0.01"
            placeholder="Ex.: 15"
            value={minimumMarginRate}
            onChange={(e) => setMinimumMarginRate(e.target.value)}
          />
          <TextField
            label="Desconto máximo (%)"
            type="number"
            min={0}
            max={100}
            step="0.01"
            placeholder="Ex.: 10"
            value={maximumDiscountRate}
            onChange={(e) => setMaximumDiscountRate(e.target.value)}
          />
          <Select
            label="Arredondamento"
            value={roundingMode}
            onChange={(e) => setRoundingMode(e.target.value as RoundingMode)}
          >
            {ROUNDING_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
          <TextField
            label="Passo de arredondamento (R$)"
            type="number"
            min={0}
            step="0.01"
            placeholder="Ex.: 0.10"
            value={roundingStep}
            onChange={(e) => setRoundingStep(e.target.value)}
            disabled={roundingMode === "none"}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Observações">
        <TextField
          label="Observações"
          placeholder="Observações sobre esta versão..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={3}
        />
      </FormSection>

      {error ? <FormAlert tone="error">{error}</FormAlert> : null}

      <FormActions>
        <Button variant="text" type="button" onClick={onCancel}>Cancelar</Button>
        <Button variant="filled" type="submit">{submitLabel}</Button>
      </FormActions>
    </form>
  );
}
