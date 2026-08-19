import { useNavigate } from "react-router-dom";
import type { PricingPolicyWithVersions } from "../types/pricing-policy.types";
import { CodeBadge, PolicyScopeBadge, PolicyStatusBadge } from "./PolicyBadges";
import { PolicyVersionTimeline } from "./PolicyVersionTimeline";
import { formatDate, formatDateTime } from "../utils/format";

interface Props {
  policy: PricingPolicyWithVersions;
  canCreateVersion: boolean;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
  marginBottom: "var(--space-6)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--color-text-secondary)",
  marginBottom: "2px",
};

const valueStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--color-text)",
  fontWeight: "var(--font-medium)",
};

function metaItem(label: string, value: string) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <p style={valueStyle}>{value}</p>
    </div>
  );
}

export function PolicyDetail({ policy, canCreateVersion }: Props) {
  const navigate = useNavigate();

  const scopeTarget = policy.scope_type === "category"
    ? "Categoria"
    : policy.scope_type === "catalog_item"
      ? "Item do catálogo"
      : "Toda a organização";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", marginBottom: "var(--space-2)" }}>
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
              {policy.name}
            </h1>
            <CodeBadge code={policy.code} />
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <PolicyScopeBadge scopeType={policy.scope_type} />
            <PolicyStatusBadge status={policy.status} />
          </div>
        </div>
        {canCreateVersion && (
          <button
            onClick={() => navigate(`/pricing/policies/${policy.id}/versions/new`)}
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
            Nova Versão
          </button>
        )}
      </div>

      {policy.description && (
        <div style={{ ...cardStyle, padding: "var(--space-4)" }}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text)", margin: 0 }}>{policy.description}</p>
        </div>
      )}

      <div style={{ ...cardStyle, padding: "var(--space-4)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)" }}>
          {metaItem("Escopo", scopeTarget)}
          {metaItem("Criada em", formatDateTime(policy.created_at))}
          {metaItem("Atualizada em", formatDate(policy.updated_at))}
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", color: "var(--color-text)", marginBottom: "var(--space-4)" }}>
          Versões
        </h2>
        <PolicyVersionTimeline versions={policy.versions ?? []} />
      </div>
    </div>
  );
}