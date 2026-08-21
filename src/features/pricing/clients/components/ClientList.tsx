// ============================================================
// ClientList — paginated list of client profiles.
// RBAC: pricing.client.view (gating happens upstream).
// ============================================================

import { Link } from "react-router-dom";
import { ClientBadges } from "./ClientBadges";
import type { ClientWithCompany } from "../types/client.types";
import { formatDate } from "../utils/format";

interface Props {
  data: ClientWithCompany[];
  loading: boolean;
  error: string | null;
  canCreate: boolean;
  onRetry: () => void;
}

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
  borderBottom: "2px solid var(--color-border)",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--space-3)",
  fontSize: "var(--text-sm)",
  borderBottom: "1px solid var(--color-border)",
};

function companyLabel(client: ClientWithCompany): string {
  const name = client.company?.legal_name ?? client.company?.trade_name ?? null;
  if (name) return name;
  return `${client.company_id.slice(0, 8)}…`;
}

export function ClientList({ data, loading, error, canCreate, onRetry }: Props) {
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
            Clientes
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
            Perfis de cliente, atribuições de tabela e preços específicos.
          </p>
        </div>
        {canCreate && (
          <Link
            to="/pricing/clients/new"
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
            Novo Cliente
          </Link>
        )}
      </div>

      {loading && (
        <p role="status" aria-label="Carregando clientes" style={{ color: "var(--color-text-secondary)" }}>
          Carregando clientes...
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

      {!loading && !error && data.length === 0 && (
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
            Nenhum cliente encontrado.
          </p>
          {canCreate && (
            <Link
              to="/pricing/clients/new"
              style={{ color: "var(--color-primary)", fontSize: "var(--text-sm)" }}
            >
              Criar o primeiro cliente
            </Link>
          )}
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Empresa</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Atribuições</th>
                <th style={thStyle}>Preços Específicos</th>
                <th style={thStyle}>Criado em</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.company_id}>
                  <td style={tdStyle}>
                    <strong>{companyLabel(c)}</strong>
                    {c.company?.tax_id && (
                      <p
                        style={{
                          margin: "var(--space-1) 0 0",
                          color: "var(--color-text-secondary)",
                          fontSize: "var(--text-xs)",
                          fontFamily: "var(--font-mono, monospace)",
                        }}
                      >
                        {c.company.tax_id}
                      </p>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <ClientBadges status={c.status} type="profile" />
                  </td>
                  <td style={tdStyle}>{c.assignment_count ?? 0}</td>
                  <td style={tdStyle}>{c.override_count ?? 0}</td>
                  <td style={tdStyle}>{formatDate(c.created_at)}</td>
                  <td style={tdStyle}>
                    <Link
                      to={`/pricing/clients/${c.company_id}`}
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
