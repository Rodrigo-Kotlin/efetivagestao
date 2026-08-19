import type { SimulationResult } from "../types/pricing-policy.types";
import {
  SIMULATION_STATUS_LABELS,
  translateViolation,
  translateWarning,
} from "./simulationHelpers";
import { PricingBreakdown } from "./PricingBreakdown";
import { PricingProvenance } from "./PricingProvenance";

interface Props {
  result: SimulationResult;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
  marginTop: "var(--space-4)",
};

function noticeBox(backgroundColor: string, borderColor: string, textColor: string, title: string, items: string[]) {
  return (
    <div style={{ backgroundColor, border: `1px solid ${borderColor}`, borderRadius: "var(--radius-md)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
      <p style={{ color: textColor, fontSize: "var(--text-sm)", fontWeight: "var(--font-bold)", marginBottom: "var(--space-2)" }}>{title}</p>
      <ul style={{ margin: 0, paddingLeft: "var(--space-5)" }}>
        {items.map((item) => (
          <li key={item} style={{ color: textColor, fontSize: "var(--text-sm)", marginBottom: "4px" }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function SimulationResultView({ result }: Props) {
  const { status, reason } = result;

  if (status === "VALIDATION_FAILED") {
    return (
      <div style={cardStyle}>
        <p style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-bold)", color: "#991B1B", marginBottom: "var(--space-2)" }}>
          {SIMULATION_STATUS_LABELS.VALIDATION_FAILED}
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "#991B1B", margin: 0 }}>{reason ?? "Falha de validação."}</p>
      </div>
    );
  }

  if (status === "PRICE_NOT_CALCULABLE") {
    const message = reason === "COST_NOT_CONFIRMED"
      ? "O custo deste item não está confirmado para a data de referência informada. Nenhum preço pode ser calculado."
      : reason ?? "Não foi possível calcular o preço para os parâmetros informados.";
    return (
      <div style={cardStyle}>
        <p style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-bold)", color: "#B45309", marginBottom: "var(--space-2)" }}>
          {SIMULATION_STATUS_LABELS.PRICE_NOT_CALCULABLE}
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "#92400E", margin: 0 }}>{message}</p>
      </div>
    );
  }

  if (status === "POLICY_NOT_FOUND") {
    return (
      <div style={cardStyle}>
        <p style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-bold)", color: "#92400E", marginBottom: "var(--space-2)" }}>
          {SIMULATION_STATUS_LABELS.POLICY_NOT_FOUND}
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "#92400E", margin: 0 }}>
          Nenhuma política de preço ativa foi encontrada para este item na data de referência. Cadastre uma política padrão, de categoria ou de item.
        </p>
      </div>
    );
  }

  if (status !== "OK" && status !== "VIOLATIONS") {
    return (
      <div style={cardStyle}>
        <p style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-bold)", color: "#991B1B", marginBottom: "var(--space-2)" }}>
          Resultado inesperado
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "#991B1B", margin: 0 }}>{reason ?? status}</p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <p style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-bold)", color: status === "OK" ? "#047857" : "#B45309", marginBottom: "var(--space-4)" }}>
        {SIMULATION_STATUS_LABELS[status]}
      </p>

      {result.violations.length > 0 && noticeBox(
        "#FEF2F2",
        "#FECACA",
        "#991B1B",
        "Violações de política",
        result.violations.map(translateViolation)
      )}

      {result.warnings.length > 0 && noticeBox(
        "#FFFBEB",
        "#FDE68A",
        "#92400E",
        "Avisos",
        result.warnings.map(translateWarning)
      )}

      <PricingBreakdown result={result} />
      <PricingProvenance result={result} />
    </div>
  );
}