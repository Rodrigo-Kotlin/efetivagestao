import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuppliers } from "../hooks/useSuppliers";
import { SUPPLIER_CATEGORIES, SUPPLIER_STATUSES } from "@/types";

const PAGE_SIZE = 25;

export function SupplierList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const { data, total, totalPages, loading, error, refetch } = useSuppliers({
    page,
    pageSize: PAGE_SIZE,
    search,
    category: category || undefined,
    status: status || undefined,
  });

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setStatus("");
    setPage(1);
  };

  const hasFilters = search || category || status;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
          Fornecedores
        </h1>
        <button
          onClick={() => navigate("/pricing/suppliers/new")}
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
          Novo Fornecedor
        </button>
      </div>

      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            style={{
              flex: 1,
              minWidth: "200px",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              outline: "none",
            }}
            aria-label="Buscar fornecedores"
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
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {SUPPLIER_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            {SUPPLIER_STATUSES.map((s) => (
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
          Carregando fornecedores...
        </div>
      )}

      {error && !loading && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>Erro ao carregar fornecedores</p>
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
            {hasFilters ? "Nenhum fornecedor encontrado para os filtros aplicados." : "Nenhum fornecedor cadastrado."}
          </p>
          {!hasFilters && (
            <button
              onClick={() => navigate("/pricing/suppliers/new")}
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
              Novo fornecedor
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
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Empresa</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Nome Fantasia</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Documento</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Categoria</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Status</th>
                  <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((supplier) => {
                  const catLabel = SUPPLIER_CATEGORIES.find((c) => c.value === supplier.supplier_category)?.label ?? supplier.supplier_category;
                  const statusInfo = SUPPLIER_STATUSES.find((s) => s.value === supplier.status);

                  return (
                    <tr
                      key={supplier.company_id}
                      style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}
                      onClick={() => navigate(`/pricing/suppliers/${supplier.company_id}`)}
                    >
                      <td style={{ padding: "var(--space-3)", fontWeight: "var(--font-medium)" }}>
                        {supplier.company?.legal_name ?? "—"}
                      </td>
                      <td style={{ padding: "var(--space-3)" }}>{supplier.company?.trade_name ?? "—"}</td>
                      <td style={{ padding: "var(--space-3)", fontFamily: "monospace" }}>{supplier.company?.tax_id ?? "—"}</td>
                      <td style={{ padding: "var(--space-3)" }}>{catLabel}</td>
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
                          {statusInfo?.label ?? supplier.status}
                        </span>
                      </td>
                      <td style={{ padding: "var(--space-3)", textAlign: "right" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/pricing/suppliers/${supplier.company_id}`); }}
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
                {total} {total === 1 ? "fornecedor" : "fornecedores"} — Página {page} de {totalPages}
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
