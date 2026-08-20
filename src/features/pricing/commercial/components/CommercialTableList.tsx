// ============================================================
// CommercialTableList — paginated list of stable commercial tables.
// RBAC: pricing.commercial.view (gating happens upstream).
// ============================================================

import { useState } from "react";
import { Link } from "react-router-dom";
import { CommercialCodeBadge, CommercialTableStatusBadge } from "./CommercialBadges";
import type { CommercialPriceTableWithCounts } from "../types/commercial.types";
import { COMMERCIAL_TABLE_STATUSES } from "../types/commercial.types";

interface Props {
  tables: CommercialPriceTableWithCounts[];
  loading: boolean;
  error: string | null;
  canCreate: boolean;
  search: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onRetry: () => void;
}

const STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  ...COMMERCIAL_TABLE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
];

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "var(--space-3)",
  fontSize: "var(--text-xs)",
  fontWeight: "var(--font-semibold)",
  color: "var(--color-text-secondary)",
  backgroundColor: "var(--color-surface-secondary, #F8FAFC)",
  borderBottom: "1px solid var(--color-border)",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--space-3)",
  fontSize: "var(--text-sm)",
  borderBottom: "1px solid var(--color-border-light, #F1F5F9)",
};

export function CommercialTableList({
  tables,
  loading,
  error,
  canCreate,
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onRetry,
}: Props) {
  const [draftSearch, setDraftSearch] = useState(search);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "var(--space-4)",
          gap: "var(--space-3)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)" }}>
            Tabelas Comerciais
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
            Tabelas comerciais, versões, preços publicados e vigências.
          </p>
        </div>
        {canCreate && (
          <Link
            to="/pricing/commercial/new"
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
            Nova tabela
          </Link>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          placeholder="Buscar por código ou nome"
          value={draftSearch}
          onChange={(e) => setDraftSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearchChange(draftSearch);
          }}
          style={{
            flex: "1 1 240px",
            padding: "var(--space-2) var(--space-3)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
          }}
          aria-label="Buscar tabelas comerciais"
        />
        <button
          type="button"
          onClick={() => onSearchChange(draftSearch)}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-text-inverse)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
          }}
        >
          Buscar
        </button>
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filtrar por status"
          style={{
            padding: "var(--space-2) var(--space-3)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
          }}
        >
          {STATUS_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p role="status" aria-label="Carregando tabelas comerciais" style={{ color: "var(--color-text-secondary)" }}>
          Carregando tabelas comerciais...
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
          <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: "var(--space-2) var(--space-3)",
              backgroundColor: "#DC2626",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && tables.length === 0 && (
        <div
          role="status"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px dashed var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-8)",
            textAlign: "center",
            color: "var(--color-text-secondary)",
          }}
        >
          <p style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-base)" }}>
            Nenhuma tabela comercial encontrada.
          </p>
          {canCreate && (
            <Link
              to="/pricing/commercial/new"
              style={{ color: "var(--color-primary)", fontSize: "var(--text-sm)" }}
            >
              Criar a primeira tabela
            </Link>
          )}
        </div>
      )}

      {!loading && !error && tables.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Código</th>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Versão atual</th>
                <th style={thStyle}>Agendada</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.id}>
                  <td style={tdStyle}>
                    <CommercialCodeBadge code={t.code} />
                  </td>
                  <td style={tdStyle}>
                    <strong>{t.name}</strong>
                    {t.description && (
                      <p style={{ margin: "var(--space-1) 0 0", color: "var(--color-text-secondary)", fontSize: "var(--text-xs)" }}>
                        {t.description}
                      </p>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <CommercialTableStatusBadge status={t.status} />
                  </td>
                  <td style={tdStyle}>
                    {t.current_version
                      ? `v${t.current_version.version_number}`
                      : "—"}
                  </td>
                  <td style={tdStyle}>
                    {t.scheduled_version
                      ? `v${t.scheduled_version.version_number}`
                      : "—"}
                  </td>
                  <td style={tdStyle}>
                    <Link
                      to={`/pricing/commercial/${t.id}`}
                      style={{
                        color: "var(--color-primary)",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-medium)",
                      }}
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
