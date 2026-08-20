// ============================================================
// PublishReadinessPanel — show results from fn_validate_commercial_price_version.
// Backend is authoritative for all validation rules.
// ============================================================

import type {
  CommercialVersionStatus,
  PublishReadinessResult,
} from "../types/commercial.types";

interface Props {
  readiness: PublishReadinessResult | null;
  loading?: boolean;
  status: CommercialVersionStatus;
}

const BLOCKER_LABELS: Record<string, string> = {
  VERSION_NOT_APPROVED: "A versão ainda não foi aprovada.",
  VERSION_EMPTY: "A versão não possui itens.",
  PENDING_EXCEPTIONS: "Existem exceções pendentes de decisão.",
  DENIED_EXCEPTIONS: "Existem exceções negadas. Remova os itens correspondentes.",
  MISSING_APPROVED_EXCEPTIONS: "Faltam exceções aprovadas obrigatórias.",
};

const MISSING_CODE_LABELS: Record<string, string> = {
  BELOW_COST: "Preço abaixo do custo",
  BELOW_MINIMUM_MARGIN: "Margem abaixo da mínima",
  COMMERCIAL_DEVIATION: "Preço comercial abaixo da referência",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4)",
  marginBottom: "var(--space-4)",
};

function blockerLabel(code: string): string {
  const prefix = code.split(":")[0] ?? "";
  return (BLOCKER_LABELS as Record<string, string>)[prefix] ?? code;
}

export function PublishReadinessPanel({ readiness, loading = false, status }: Props) {
  if (loading && !readiness) {
    return (
      <div style={cardStyle}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
          Validando versão para publicação...
        </p>
      </div>
    );
  }

  if (!readiness) return null;

  const blockers = readiness.blockers ?? [];
  const missing = readiness.missing_exception_codes ?? [];
  const ready = readiness.ready;

  const borderColor = ready ? "#16A34A" : "#DC2626";
  const bg = ready ? "#F0FDF4" : "#FEF2F2";

  return (
    <div style={{ ...cardStyle, borderColor, backgroundColor: bg }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-3)",
          gap: "var(--space-2)",
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)" }}>
          Validação para publicação
        </h3>
        <strong
          style={{
            color: ready ? "#16A34A" : "#DC2626",
            fontSize: "var(--text-sm)",
          }}
        >
          {ready ? "Versão pronta para publicação" : "Versão ainda não pode ser publicada"}
        </strong>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "var(--space-3)",
          marginBottom: "var(--space-3)",
        }}
      >
        <Metric label="Itens" value={readiness.item_count} />
        <Metric label="Exceções pendentes" value={readiness.pending_exception_count} />
        <Metric label="Exceções negadas" value={readiness.denied_exception_count} />
        <Metric
          label="Exceções aprovadas (requeridas)"
          value={`${(status === "approved" ? "OK" : "—")} / ${readiness.required_exception_count}`}
        />
      </div>

      {missing.length > 0 && (
        <div style={{ marginBottom: "var(--space-3)" }}>
          <h4 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-1)" }}>
            Códigos sem exceção aprovada
          </h4>
          <ul style={{ margin: 0, paddingLeft: "var(--space-5)" }}>
            {missing.map((code) => (
              <li key={code} style={{ fontSize: "var(--text-sm)" }}>
                {MISSING_CODE_LABELS[code] ?? code}
              </li>
            ))}
          </ul>
        </div>
      )}

      {blockers.length > 0 && (
        <div>
          <h4 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-1)" }}>
            Bloqueios
          </h4>
          <ul style={{ margin: 0, paddingLeft: "var(--space-5)" }}>
            {blockers.map((b, idx) => (
              <li key={`${b}-${idx}`} style={{ fontSize: "var(--text-sm)" }}>
                {blockerLabel(b)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{label}</p>
      <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)" }}>{value}</p>
    </div>
  );
}
