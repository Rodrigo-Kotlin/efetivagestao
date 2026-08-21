// ============================================================
// ResolverResult — UI for fn_resolve_client_table_assignment
// and fn_resolve_client_price_override.
// Renders every result state with explicit pt-BR copy.
// No precedence logic; no final price label in this phase.
// ============================================================

import { ProvenancePanel } from "./ProvenancePanel";
import type {
  AssignmentResolverResult,
  OverrideResolverResult,
} from "../types/client.types";
import { formatCurrency, formatDate } from "../utils/format";

interface Props {
  type: "assignment" | "override";
  result: AssignmentResolverResult | OverrideResolverResult | null;
  loading: boolean;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4)",
};

const bannerStyle: React.CSSProperties = {
  backgroundColor: "#FFFBEB",
  border: "1px solid #FDE68A",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-3)",
  marginTop: "var(--space-3)",
};

function statusColor(status: string): string {
  return status === "RESOLVED" ? "#16A34A" : "#DC2626";
}

export function ResolverResult({ type, result, loading }: Props) {
  if (loading) {
    return (
      <p role="status" aria-label="Resolvendo preço do cliente" style={{ color: "var(--color-text-secondary)" }}>
        Resolvendo...
      </p>
    );
  }

  if (!result) return null;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginBottom: "var(--space-2)" }}>
        <strong>Status:</strong>
        <span style={{ color: statusColor(result.status) }}>{result.status}</span>
        <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-xs)" }}>
          Referência: {formatDate(result.reference_date)}
        </span>
      </div>

      {type === "assignment" ? (
        <AssignmentBody result={result as AssignmentResolverResult} />
      ) : (
        <OverrideBody result={result as OverrideResolverResult} />
      )}

      {result.status === "RESOLVED" && (
        <div style={bannerStyle}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "#92400E" }}>
            Preço final do cliente ainda não é calculado nesta fase.
          </p>
        </div>
      )}
    </div>
  );
}

function AssignmentBody({ result }: { result: AssignmentResolverResult }) {
  if (result.status === "CLIENT_NOT_FOUND") {
    return (
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
        Cliente não encontrado nesta organização.
      </p>
    );
  }

  if (result.status === "ASSIGNMENT_NOT_FOUND") {
    return (
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
        Nenhuma atribuição de tabela vigente para este cliente na data informada.
      </p>
    );
  }

  const assignment = result.assignment;
  if (!assignment) {
    return (
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
        Nenhuma atribuição de tabela vigente para este cliente na data informada.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
      <div>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", margin: 0 }}>Atribuição (ID)</p>
        <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", fontFamily: "var(--font-mono, monospace)", wordBreak: "break-all", margin: 0 }}>
          {assignment.id}
        </p>
      </div>
      <div>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", margin: 0 }}>Status da atribuição</p>
        <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", margin: 0 }}>{assignment.status}</p>
      </div>
      <div>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", margin: 0 }}>Tabela comercial (ID)</p>
        <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", fontFamily: "var(--font-mono, monospace)", wordBreak: "break-all", margin: 0 }}>
          {assignment.commercial_price_table_id}
        </p>
      </div>
      <div>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", margin: 0 }}>Vigência</p>
        <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", margin: 0 }}>
          {formatDate(assignment.valid_from)} — {formatDate(assignment.valid_to)}
        </p>
      </div>
    </div>
  );
}

function OverrideBody({ result }: { result: OverrideResolverResult }) {
  if (result.status === "CLIENT_NOT_FOUND") {
    return (
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
        Cliente não encontrado nesta organização.
      </p>
    );
  }

  if (result.status === "ITEM_NOT_FOUND") {
    return (
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
        Item não encontrado no catálogo desta organização.
      </p>
    );
  }

  if (result.status === "OVERRIDE_NOT_FOUND") {
    return (
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
        Nenhum preço específico vigente para este item na data informada.
      </p>
    );
  }

  const override = result.override;
  if (!override) {
    return (
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
        Nenhum preço específico vigente para este item na data informada.
      </p>
    );
  }

  return (
    <div>
      {result.item && (
        <div style={{ marginBottom: "var(--space-2)" }}>
          <strong style={{ fontSize: "var(--text-sm)" }}>
            {result.item.item_code_snapshot} — {result.item.item_name_snapshot}
          </strong>
          <span
            style={{
              marginLeft: "var(--space-2)",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-secondary)",
            }}
          >
            Tipo: {result.item.item_type_snapshot}
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
        <div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", margin: 0 }}>Preço específico</p>
          <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", color: "var(--color-primary)", margin: 0 }}>
            {formatCurrency(result.price_amount)}{" "}
            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)", color: "var(--color-text-secondary)" }}>
              {result.currency}
            </span>
          </p>
        </div>
        <div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", margin: 0 }}>Motivo</p>
          <p style={{ fontSize: "var(--text-sm)", margin: 0 }}>{result.reason ?? "—"}</p>
        </div>
        <div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", margin: 0 }}>Vigência</p>
          <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", margin: 0 }}>
            {formatDate(override.valid_from)} — {formatDate(override.valid_to)}
          </p>
        </div>
      </div>

      <ProvenancePanel provenance={result.provenance} priceAmount={result.price_amount} />
    </div>
  );
}
