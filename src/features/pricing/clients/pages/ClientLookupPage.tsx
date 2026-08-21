// ============================================================
// ClientLookupPage — UI for fn_resolve_client_table_assignment
// and fn_resolve_client_price_override. Component resolvers only;
// final price composition belongs to PRC-07.
// ============================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CatalogItemSelector } from "../components/CatalogItemSelector";
import { ResolverResult } from "../components/ResolverResult";
import { useClientList } from "../hooks/useClients";
import { resolveAssignment, resolveOverride } from "../api/clientPrices";
import type {
  AssignmentResolverResult,
  ClientWithCompany,
  OverrideResolverResult,
} from "../types/client.types";
import { formatDate, todayIsoDate } from "../utils/format";

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4)",
  marginBottom: "var(--space-4)",
};

function clientLabel(c: ClientWithCompany): string {
  const name = c.company?.legal_name ?? c.company?.trade_name ?? null;
  if (name) {
    return c.company?.tax_id ? `${name} · ${c.company.tax_id}` : name;
  }
  return `${c.company_id.slice(0, 8)}…`;
}

function Inner() {
  const navigate = useNavigate();
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;

  const { data: clients } = useClientList({ pageSize: 200 });

  const [clientId, setClientId] = useState<string | null>(null);
  const [catalogItemId, setCatalogItemId] = useState<string | null>(null);
  const [referenceDate, setReferenceDate] = useState<string>(todayIsoDate());

  const [assignmentResult, setAssignmentResult] =
    useState<AssignmentResolverResult | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const [overrideResult, setOverrideResult] =
    useState<OverrideResolverResult | null>(null);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  if (!can("pricing.client.view")) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  const handleResolveAssignment = async () => {
    if (!orgId || !clientId || !referenceDate) return;
    setAssignmentLoading(true);
    setAssignmentError(null);
    try {
      const result = await resolveAssignment({
        orgId,
        clientCompanyId: clientId,
        referenceDate,
      });
      setAssignmentResult(result);
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : "Erro desconhecido");
      setAssignmentResult(null);
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleResolveOverride = async () => {
    if (!orgId || !clientId || !catalogItemId || !referenceDate) return;
    setOverrideLoading(true);
    setOverrideError(null);
    try {
      const result = await resolveOverride({
        orgId,
        clientCompanyId: clientId,
        catalogItemId,
        referenceDate,
      });
      setOverrideResult(result);
    } catch (err) {
      setOverrideError(err instanceof Error ? err.message : "Erro desconhecido");
      setOverrideResult(null);
    } finally {
      setOverrideLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/pricing/clients")}
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-primary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: "var(--space-2)",
        }}
      >
        ← Voltar para clientes
      </button>

      <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", marginBottom: "var(--space-2)" }}>
        Consulta de Precificação do Cliente
      </h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
        Resolve a atribuição de tabela e o preço específico de um cliente em uma
        data de referência. Suporta consultas atuais, futuras e históricas.
      </p>

      <div
        style={{
          backgroundColor: "#FFFBEB",
          border: "1px solid #FDE68A",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-3)",
          marginBottom: "var(--space-4)",
        }}
      >
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "#92400E" }}>
          Esta consulta exibe os componentes disponíveis. O preço final do
          cliente será definido pelo motor de resolução do PRC-07.
        </p>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-3)" }}>
          <div>
            <label
              htmlFor="clp-client"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Cliente
            </label>
            <select
              id="clp-client"
              value={clientId ?? ""}
              onChange={(e) => setClientId(e.target.value || null)}
              style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            >
              <option value="">Selecione</option>
              {clients.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {clientLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="clp-date"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Data de referência
            </label>
            <input
              id="clp-date"
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            />
          </div>

          <div>
            <span
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Item de catálogo (opcional)
            </span>
            {orgId && (
              <CatalogItemSelector
                orgId={orgId}
                value={catalogItemId}
                onChange={setCatalogItemId}
              />
            )}
          </div>
        </div>

        <p
          style={{
            marginTop: "var(--space-2)",
            marginBottom: 0,
            fontSize: "var(--text-xs)",
            color: "var(--color-text-secondary)",
          }}
        >
          A data de referência pode ser passada (consulta histórica) ou futura.
          Hoje: {formatDate(todayIsoDate())}.
        </p>

        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void handleResolveAssignment()}
            disabled={assignmentLoading || !clientId || !referenceDate}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-text-inverse)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
              cursor: assignmentLoading || !clientId || !referenceDate ? "default" : "pointer",
              opacity: assignmentLoading || !clientId || !referenceDate ? 0.6 : 1,
            }}
          >
            {assignmentLoading ? "Consultando..." : "Consultar atribuição"}
          </button>
          <button
            type="button"
            onClick={() => void handleResolveOverride()}
            disabled={overrideLoading || !clientId || !catalogItemId || !referenceDate}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "transparent",
              color: "var(--color-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
              cursor:
                overrideLoading || !clientId || !catalogItemId || !referenceDate
                  ? "default"
                  : "pointer",
              opacity: overrideLoading || !clientId || !catalogItemId || !referenceDate ? 0.6 : 1,
            }}
          >
            {overrideLoading ? "Consultando..." : "Consultar override"}
          </button>
        </div>
      </div>

      {assignmentError && (
        <div
          role="alert"
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
          }}
        >
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{assignmentError}</p>
        </div>
      )}

      {(assignmentResult || assignmentLoading) && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <ResolverResult
            type="assignment"
            result={assignmentResult}
            loading={assignmentLoading}
          />
        </div>
      )}

      {overrideError && (
        <div
          role="alert"
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
          }}
        >
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{overrideError}</p>
        </div>
      )}

      {(overrideResult || overrideLoading) && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <ResolverResult
            type="override"
            result={overrideResult}
            loading={overrideLoading}
          />
        </div>
      )}
    </div>
  );
}

export function ClientLookupPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
