import { useNavigate } from "react-router-dom";
import type { PricingPolicyVersion } from "../types/pricing-policy.types";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table } from "@/components/ui/Table";
import { PricingMethodBadge } from "./PolicyBadges";
import { formatDate, formatPercent } from "../utils/format";

interface Props {
  versions: PricingPolicyVersion[];
  currentVersionId?: string;
}

export function PolicyVersionTimeline({ versions, currentVersionId }: Props) {
  const navigate = useNavigate();

  if (versions.length === 0) {
    return (
      <EmptyState
        title="Esta política ainda não possui versões"
        description="Crie a primeira versão para registrar regras de precificação."
      />
    );
  }

  return (
    <Table caption="Linha do tempo de versões da política" captionHidden>
      <thead>
        <tr>
          <th style={{ textAlign: "left" }}>Versão</th>
          <th style={{ textAlign: "left" }}>Método</th>
          <th style={{ textAlign: "left" }}>Vigência</th>
          <th style={{ textAlign: "left" }}>Status</th>
          <th style={{ textAlign: "right" }}><span className="sr-only">Ações</span></th>
        </tr>
      </thead>
      <tbody>
        {versions.map((v) => {
          const isCurrent = v.id === currentVersionId;
          const methodDetail = v.pricing_method === "target_margin"
            ? `Margem-alvo ${formatPercent(v.target_margin_rate)}`
            : v.pricing_method === "markup"
              ? `Markup ${formatPercent(v.markup_rate)}`
              : `Preço fixo R$ ${v.fixed_price?.toString() ?? "—"}`;

          return (
            <tr
              key={v.id}
              onClick={() => navigate(`/pricing/policies/versions/${v.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/pricing/policies/versions/${v.id}`);
                }
              }}
              tabIndex={0}
              role="link"
              aria-label={`Ver versão v${v.version_number}${isCurrent ? " (atual)" : ""}`}
              style={{ cursor: "pointer", backgroundColor: isCurrent ? "var(--md-sys-color-surface-container-low)" : undefined }}
            >
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--md-sys-spacing-2)" }}>
                  <span style={{ fontWeight: 600 }}>v{v.version_number}</span>
                  {isCurrent ? <span style={{ fontSize: "var(--md-sys-typescale-label-medium-size)", color: "var(--md-sys-color-primary)" }}>atual</span> : null}
                </div>
              </td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--md-sys-spacing-2)" }}>
                  <PricingMethodBadge method={v.pricing_method} />
                  <span style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>
                    {methodDetail}
                  </span>
                </div>
              </td>
              <td style={{ fontSize: "var(--md-sys-typescale-body-medium-size)" }}>
                {formatDate(v.valid_from)} — {formatDate(v.valid_to)}
              </td>
              <td><StatusBadge status={v.status} /></td>
              <td style={{ textAlign: "right", color: "var(--md-sys-color-on-surface-variant)", fontSize: "var(--md-sys-typescale-body-medium-size)" }}>
                Abrir
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
