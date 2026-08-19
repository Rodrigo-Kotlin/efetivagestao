import { useNavigate } from "react-router-dom";
import type { PricingPolicyVersion } from "../types/pricing-policy.types";
import { PolicyVersionStatusBadge } from "./PolicyBadges";
import { formatDate, formatPercent } from "../utils/format";

interface Props {
  versions: PricingPolicyVersion[];
  currentVersionId?: string;
}

export function PolicyVersionTimeline({ versions, currentVersionId }: Props) {
  const navigate = useNavigate();

  if (versions.length === 0) {
    return (
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Esta política ainda não possui versões.
      </p>
    );
  }

  return (
    <div style={{ display: "block", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
            <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Versão</th>
            <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Método</th>
            <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Vigência</th>
            <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Status</th>
            <th style={{ textAlign: "right", padding: "var(--space-3)" }}></th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => {
            const methodLabel = v.pricing_method === "target_margin"
              ? `Margem-alvo ${formatPercent(v.target_margin_rate)}`
              : v.pricing_method === "markup"
                ? `Markup ${formatPercent(v.markup_rate)}`
                : `Preço fixo R$ ${v.fixed_price?.toString() ?? "—"}`;

            const isCurrent = v.id === currentVersionId;

            return (
              <tr
                key={v.id}
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  cursor: "pointer",
                  backgroundColor: isCurrent ? "var(--color-surface-secondary, #F9FAFB)" : "transparent",
                }}
                onClick={() => navigate(`/pricing/policies/versions/${v.id}`)}
              >
                <td style={{ padding: "var(--space-3)", fontWeight: "var(--font-medium)" }}>
                  v{v.version_number}
                  {isCurrent && (
                    <span style={{ marginLeft: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-primary)" }}>atual</span>
                  )}
                </td>
                <td style={{ padding: "var(--space-3)", color: "var(--color-text-secondary)" }}>{methodLabel}</td>
                <td style={{ padding: "var(--space-3)", fontSize: "var(--text-xs)" }}>
                  {formatDate(v.valid_from)} — {formatDate(v.valid_to)}
                </td>
                <td style={{ padding: "var(--space-3)" }}>
                  <PolicyVersionStatusBadge status={v.status} />
                </td>
                <td style={{ padding: "var(--space-3)", textAlign: "right" }}>
                  <span style={{ color: "var(--color-primary)", fontSize: "var(--text-xs)" }}>Abrir →</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}