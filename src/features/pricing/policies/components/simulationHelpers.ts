import type { SimulationResult, SimulationStatus } from "../types/pricing-policy.types";

// pt-BR labels for engine statuses (UI-SIM03/04/05).
export const SIMULATION_STATUS_LABELS: Record<SimulationStatus, string> = {
  OK: "Preço calculado",
  VIOLATIONS: "Preço calculado com violações",
  PRICE_NOT_CALCULABLE: "Preço não calculável",
  POLICY_NOT_FOUND: "Nenhuma política aplicável",
  VALIDATION_FAILED: "Falha de validação",
};

export function translateViolation(violation: string): string {
  switch (violation) {
    case "BELOW_COST":
      return "Preço abaixo do custo total";
    case "BELOW_MINIMUM_MARGIN":
      return "Margem abaixo da mínima configurada";
    case "DISCOUNT_EXCEEDS_LIMIT":
      return "Desconto acima do limite permitido";
    case "ZERO_COST_DENOMINATOR":
      return "Custo zero tornou o markup indefinido";
    default:
      return violation;
  }
}

export function translateWarning(warning: string): string {
  switch (warning) {
    case "ZERO_COST_DENOMINATOR":
      return "Custo zero: markup indisponível";
    default:
      return warning;
  }
}

// UI-SIM07: UNKNOWN COST (null) must be shown as unknown, never as R$ 0,00.
export function isCostUnknown(result: SimulationResult): boolean {
  return result.base_cost === null;
}

// UI-SIM06: markup/margin display guard — never render NaN/Infinity.
export function isFiniteNumber(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && Number.isFinite(value);
}