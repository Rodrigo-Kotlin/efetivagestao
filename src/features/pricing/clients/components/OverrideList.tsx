// ============================================================
// OverrideList — client price overrides grouped by timeline.
// Mirrors AssignmentList structure for consistent UX.
// ============================================================

import { Link } from "react-router-dom";
import { ClientBadges } from "./ClientBadges";
import type { ClientOverride } from "../types/client.types";
import type { ClientWorkflowStatus } from "../types/client.types";
import { formatCurrency, formatDate, formatDateExclusive } from "../utils/format";

interface Props {
  overrides: ClientOverride[];
  canCreate: boolean;
  clientId: string;
  loading: boolean;
  error: string | null;
}

interface TimelineSection {
  title: string;
  statuses: ClientWorkflowStatus[];
}

const SECTIONS: TimelineSection[] = [
  { title: "Vigentes", statuses: ["active"] },
  { title: "Agendados", statuses: ["scheduled"] },
  {
    title: "Em elaboração / aprovação",
    statuses: ["draft", "under_review", "approved"],
  },
  { title: "Substituídos", statuses: ["superseded"] },
  { title: "Cancelados", statuses: ["cancelled"] },
];

const sectionStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4)",
  marginBottom: "var(--space-4)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-1)",
  padding: "var(--space-3) 0",
  borderBottom: "1px solid var(--color-border-light, #F1F5F9)",
};

function groupByTimeline(
  overrides: ClientOverride[]
): { title: string; items: ClientOverride[] }[] {
  return SECTIONS.map((section) => ({
    title: section.title,
    items: overrides.filter((o) => section.statuses.includes(o.status)),
  })).filter((group) => group.items.length > 0);
}

export function OverrideList({
  overrides,
  canCreate,
  clientId,
  loading,
  error,
}: Props) {
  const groups = groupByTimeline(overrides);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-4)",
          gap: "var(--space-3)",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", margin: 0 }}>
          Preços Específicos
        </h2>
        {canCreate && (
          <Link
            to={`/pricing/clients/${clientId}/overrides/new`}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-text-inverse)",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
            }}
          >
            Novo Preço Específico
          </Link>
        )}
      </div>

      {loading && (
        <p role="status" aria-label="Carregando preços específicos" style={{ color: "var(--color-text-secondary)" }}>
          Carregando preços específicos...
        </p>
      )}

      {error && !loading && (
        <div
          role="alert"
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
          }}
        >
          <p style={{ color: "#991B1B", margin: 0 }}>{error}</p>
        </div>
      )}

      {!loading && !error && groups.length === 0 && (
        <div
          role="status"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px dashed var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-6)",
            textAlign: "center",
            color: "var(--color-text-secondary)",
          }}
        >
          Nenhum preço específico registrado.
        </div>
      )}

      {!loading &&
        !error &&
        groups.map((group) => (
          <div key={group.title} style={sectionStyle}>
            <h3
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-semibold)",
                color: "var(--color-text-secondary)",
                margin: "0 0 var(--space-2)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {group.title}
            </h3>
            {group.items.map((o) => (
              <div key={o.id} style={rowStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    flexWrap: "wrap",
                  }}
                >
                  <ClientBadges status={o.status} type="workflow" />
                  <strong style={{ fontSize: "var(--text-sm)" }}>
                    {o.item_code_snapshot} — {o.item_name_snapshot}
                  </strong>
                  <span
                    style={{
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-bold)",
                      color: "var(--color-primary)",
                    }}
                  >
                    {formatCurrency(o.price_amount)}{" "}
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--font-normal)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {o.currency}
                    </span>
                  </span>
                </div>
                <span style={{ fontSize: "var(--text-sm)" }}>
                  {formatDate(o.valid_from)} · {formatDateExclusive(o.valid_to)}
                </span>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  Motivo: {o.reason}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: o.source_commercial_price_table_id
                        ? "var(--color-text-secondary)"
                        : "var(--color-text-tertiary, #9CA3AF)",
                    }}
                  >
                    {o.source_commercial_price_table_id
                      ? "Com proveniência de tabela"
                      : "Sem proveniência de tabela"}
                  </span>
                  <Link
                    to={`/pricing/clients/overrides/${o.id}`}
                    style={{
                      color: "var(--color-primary)",
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--font-medium)",
                    }}
                  >
                    Abrir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
