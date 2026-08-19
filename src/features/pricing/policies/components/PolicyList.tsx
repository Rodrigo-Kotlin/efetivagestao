import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePricingPolicies } from "../hooks/usePricingPolicies";
import { useAuth } from "@/features/core/useAuth";
import { POLICY_SCOPE_TYPES, POLICY_STATUSES } from "../types/pricing-policy.types";
import { CodeBadge, PolicyScopeBadge, PolicyStatusBadge } from "./PolicyBadges";

const PAGE_SIZE = 25;

export function PolicyList() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [scopeType, setScopeType] = useState("");
  const [status, setStatus] = useState("");

  const { data, total, totalPages, loading, error, refetch } = usePricingPolicies({
    page,
    pageSize: PAGE_SIZE,
    search,
    scopeType: scopeType || undefined,
    status: status || undefined,
  });

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setScopeType("");
    setStatus("");
    setPage(1);
  };

  const hasFilters = search || scopeType || status;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
          Políticas de Preço
        </h1>
        {can("pricing.policy.create") && (
          <button
            onClick={() => navigate("/pricing/policies/new")}
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
            Nova Política
          </button>
        )}
      </div>

      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar por código ou nome..."
            style={{
              flex: 1,
              minWidth: "200px",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              outline: "none",
            }}
            aria-label="Buscar políticas de preço"
          />
          <button
            onClick={handleSearch}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--color-primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
            }}
          >
            Buscar
          </button>
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={scopeType}
            onChange={(e) => { setScopeType(e.target.value); setPage(1); }}
            style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            aria-label="Filtrar por escopo"
          >
            <option value="">Todos os escopos</option>
            {POLICY_SCOPE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            {POLICY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={handleClearFilters}
              style={{
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Carregando políticas de preço...
        </div>
      )}

      {error && !loading && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>Erro ao carregar políticas de preço</p>
          <button
            onClick={() => void refetch()}
            style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-8)", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: hasFilters ? "var(--space-2)" : 0 }}>
            {hasFilters ? "Nenhuma política de preço encontrada para os filtros aplicados." : "Nenhuma política de preço cadastrada."}
          </p>
          {!hasFilters && can("pricing.policy.create") && (
            <button
              onClick={() => navigate("/pricing/policies/new")}
              style={{
                marginTop: "var(--space-4)",
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
              Nova política de preço
            </button>
          )}
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <div style={{ display: "block", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Código</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Nome</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Escopo</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Atualizado</th>
                  <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((pp) => (
                  <tr
                    key={pp.id}
                    style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}
                    onClick={() => navigate(`/pricing/policies/${pp.id}`)}
                  >
                    <td style={{ padding: "var(--space-3)" }}>
                      <CodeBadge code={pp.code} />
                    </td>
                    <td style={{ padding: "var(--space-3)", fontWeight: "var(--font-medium)" }}>{pp.name}</td>
                    <td style={{ padding: "var(--space-3)" }}>
                      <PolicyScopeBadge scopeType={pp.scope_type} />
                    </td>
                    <td style={{ padding: "var(--space-3)" }}>
                      <PolicyStatusBadge status={pp.status} />
                    </td>
                    <td style={{ padding: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {formatDate(pp.updated_at)}
                    </td>
                    <td style={{ padding: "var(--space-3)", textAlign: "right" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/pricing/policies/${pp.id}`); }}
                        style={{ padding: "4px 8px", backgroundColor: "transparent", color: "var(--color-primary)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-xs)" }}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-4)", padding: "var(--space-3) 0" }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                {total} {total === 1 ? "política" : "políticas"} — Página {page} de {totalPages}
              </span>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    cursor: page === 1 ? "default" : "pointer",
                    opacity: page === 1 ? 0.5 : 1,
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    cursor: page === totalPages ? "default" : "pointer",
                    opacity: page === totalPages ? 0.5 : 1,
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}