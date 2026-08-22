import type { SimulationResult } from "../types/pricing-policy.types";
import {
  SIMULATION_STATUS_LABELS,
  translateViolation,
  translateWarning,
} from "./simulationHelpers";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { PricingBreakdown } from "./PricingBreakdown";
import { PricingProvenance } from "./PricingProvenance";

interface Props {
  result: SimulationResult;
}

export function SimulationResultView({ result }: Props) {
  const { status, reason } = result;

  if (status === "VALIDATION_FAILED") {
    return (
      <Alert tone="negative" title={SIMULATION_STATUS_LABELS.VALIDATION_FAILED}>
        {reason ?? "Falha de validação."}
      </Alert>
    );
  }

  if (status === "PRICE_NOT_CALCULABLE") {
    const message = reason === "COST_NOT_CONFIRMED"
      ? "O custo deste item não está confirmado para a data de referência informada. Nenhum preço pode ser calculado."
      : reason ?? "Não foi possível calcular o preço para os parâmetros informados.";
    return (
      <Alert tone="warning" title={SIMULATION_STATUS_LABELS.PRICE_NOT_CALCULABLE}>
        {message}
      </Alert>
    );
  }

  if (status === "POLICY_NOT_FOUND") {
    return (
      <Alert tone="warning" title={SIMULATION_STATUS_LABELS.POLICY_NOT_FOUND}>
        Nenhuma política de preço ativa foi encontrada para este item na data de referência. Cadastre uma política padrão, de categoria ou de item.
      </Alert>
    );
  }

  if (status !== "OK" && status !== "VIOLATIONS") {
    return (
      <Alert tone="negative" title="Resultado inesperado">
        {reason ?? status}
      </Alert>
    );
  }

  const statusTone = status === "OK" ? "positive" : "warning";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-4)" }}>
      <Alert tone={statusTone} title={SIMULATION_STATUS_LABELS[status]} />

      {result.violations.length > 0 ? (
        <Alert tone="negative" title="Violações da política">
          <ul style={{ margin: 0, paddingLeft: "var(--md-sys-spacing-5)" }}>
            {result.violations.map((item) => (
              <li key={item}>{translateViolation(item)}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {result.warnings.length > 0 ? (
        <Alert tone="warning" title="Avisos">
          <ul style={{ margin: 0, paddingLeft: "var(--md-sys-spacing-5)" }}>
            {result.warnings.map((item) => (
              <li key={item}>{translateWarning(item)}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <PricingBreakdown result={result} />
      <PricingProvenance result={result} />
    </div>
  );
}

// Silence unused warning when Badge is not directly referenced
void Badge;
