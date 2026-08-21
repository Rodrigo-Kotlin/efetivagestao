import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCostTables } from "../hooks/useCosts";
import { useAuth } from "@/features/core/useAuth";
import { COST_TABLE_STATUSES } from "@/types";

const PAGE_SIZE = 25;

export function CostTableList() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [status, setStatus] = useState("");

  const { data, total, totalPages, loading, error, refetch } = useCostTables({
    page,
    pageSize: PAGE_SIZE,
    search,
    supplierCompanyId: supplierFilter || undefined,
    status: status || undefined,
  });

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setSupplierFilter("");
    setStatus("");
    setPage(1);
  };

  const hasFilters = search || supplierFilter || status;

  const uniqueSuppliers = data.reduce<{ id: string; name: string }[]>((acc, ct) => {
    const supplierId = ct.supplier?.id;
    const supplierName = ct.supplier?.legal_name ?? "—";
    if (supplierId && !acc.some((s) => s.id === supplierId)) {
      acc.push({ id: supplierId, name: supplierName });
    }
    return acc;
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
          Tabelas de Custo
        </h1>
        {can("pricing.cost.create") && (
          <button
            onClick={() => navigate("/pricing/costs/new")}
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
            Nova Tabela
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
            placeholder="Buscar por fornecedor, código ou nome..."
            style={{
              flex: 1,
              minWidth: "200px",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              outline: "none",
            }}
            aria-label="Buscar tabelas de custo"
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
            value={supplierFilter}
            onChange={(e) => { setSupplierFilter(e.target.value); setPage(1); }}
            style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            aria-label="Filtrar por fornecedor"
          >
            <option value="">Todos os fornecedores</option>
            {uniqueSuppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            {COST_TABLE_STATUSES.map((s) => (
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
          Carregando tabelas de custo...
        </div>
      )}

      {error && !loading && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>Erro ao carregar tabelas de custo</p>
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
            {hasFilters ? "Nenhuma tabela de custo encontrada para os filtros aplicados." : "Nenhuma tabela de custo cadastrada."}
          </p>
          {!hasFilters && can("pricing.cost.create") && (
            <button
              onClick={() => navigate("/pricing/costs/new")}
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
              Nova tabela de custo
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
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Fornecedor</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Código</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Nome</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Versão Atual</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Vigência</th>
                  <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Itens</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Atualizado</th>
                  <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((ct) => {
                  const statusInfo = COST_TABLE_STATUSES.find((s) => s.value === ct.status);
                  const currentVersion = ct.versions?.find((v) => v.status === 'active');

                  return (
                    <tr
                      key={ct.id}
                      style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}
                      onClick={() => navigate(`/pricing/costs/${ct.id}`)}
                    >
                      <td style={{ padding: "var(--space-3)", fontWeight: "var(--font-medium)" }}>
                        {ct.supplier?.legal_name ?? "—"}
                      </td>
                      <td style={{ padding: "var(--space-3)", fontFamily: "monospace" }}>{ct.code}</td>
                      <td style={{ padding: "var(--space-3)" }}>{ct.name}</td>
                      <td style={{ padding: "var(--space-3)" }}>
                        {currentVersion ? `v${currentVersion.version_number}` : "—"}
                      </td>
                      <td style={{ padding: "var(--space-3)", fontSize: "var(--text-xs)" }}>
                        {currentVersion?.valid_from ? `${formatDate(currentVersion.valid_from)} — ${formatDate(currentVersion.valid_to)}` : "—"}
                      </td>
                      <td style={{ padding: "var(--space-3)", textAlign: "right" }}>
                        {currentVersion ? "—" : "—"}
                      </td>
                      <td style={{ padding: "var(--space-3)" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-full)",
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-medium)",
                          backgroundColor: statusInfo?.color ? `${statusInfo.color}20` : "#E5E7EB",
                          color: statusInfo?.color ?? "#6B7280",
                        }}>
                          {statusInfo?.label ?? ct.status}
                        </span>
                      </td>
                      <td style={{ padding: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                        {formatDate(ct.updated_at)}
                      </td>
                      <td style={{ padding: "var(--space-3)", textAlign: "right" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/pricing/costs/${ct.id}`); }}
                          style={{ padding: "4px 8px", backgroundColor: "transparent", color: "var(--color-primary)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-xs)" }}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-4)", padding: "var(--space-3) 0" }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                {total} {total === 1 ? "tabela" : "tabelas"} — Página {page} de {totalPages}
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
