// ============================================================
// AssignmentList — client table assignments grouped by timeline.
// Sections: vigentes, agendadas, elaboração, substituídas, canceladas.
// ============================================================

import { Link } from "react-router-dom";
import { ClientBadges } from "./ClientBadges";
import type { ClientAssignmentDetail } from "../types/client.types";
import type { ClientWorkflowStatus } from "../types/client.types";
import { formatDate, formatDateExclusive } from "../utils/format";

interface Props {
  assignments: ClientAssignmentDetail[];
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
  { title: "Agendadas", statuses: ["scheduled"] },
  {
    title: "Em elaboração / aprovação",
    statuses: ["draft", "under_review", "approved"],
  },
  { title: "Substituídas", statuses: ["superseded"] },
  { title: "Canceladas", statuses: ["cancelled"] },
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
  assignments: ClientAssignmentDetail[]
): { title: string; items: ClientAssignmentDetail[] }[] {
  return SECTIONS.map((section) => ({
    title: section.title,
    items: assignments.filter((a) => section.statuses.includes(a.status)),
  })).filter((group) => group.items.length > 0);
}

export function AssignmentList({
  assignments,
  canCreate,
  clientId,
  loading,
  error,
}: Props) {
  const groups = groupByTimeline(assignments);

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
          Atribuições de Tabela
        </h2>
        {canCreate && (
          <Link
            to={`/pricing/clients/${clientId}/assignments/new`}
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
            Nova Atribuição
          </Link>
        )}
      </div>

      {loading && (
        <p role="status" aria-label="Carregando atribuições" style={{ color: "var(--color-text-secondary)" }}>
          Carregando atribuições...
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
          Nenhuma tabela atribuída.
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
            {group.items.map((a) => (
              <div key={a.id} style={rowStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    flexWrap: "wrap",
                  }}
                >
                  <ClientBadges status={a.status} type="workflow" />
                  {a.commercial_price_table ? (
                    <strong style={{ fontSize: "var(--text-sm)" }}>
                      {a.commercial_price_table.code} — {a.commercial_price_table.name}
                    </strong>
                  ) : (
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {a.commercial_price_table_id.slice(0, 8)}…
                    </span>
                  )}
                  <span style={{ fontSize: "var(--text-sm)" }}>
                    {formatDate(a.valid_from)} · {formatDateExclusive(a.valid_to)}
                  </span>
                </div>
                {a.contract_reference && (
                  <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                    Contrato: {a.contract_reference}
                  </p>
                )}
                {a.notes && (
                  <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                    {a.notes}
                  </p>
                )}
                <Link
                  to={`/pricing/clients/assignments/${a.id}`}
                  style={{
                    color: "var(--color-primary)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-medium)",
                  }}
                >
                  Abrir
                </Link>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
