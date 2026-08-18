import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCatalogItems } from "../hooks/useCatalog";
import { ITEM_TYPES, EXECUTION_TYPES, ITEM_STATUSES } from "@/types";

const PAGE_SIZE = 25;

export function CatalogList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [itemType, setItemType] = useState("");
  const [status, setStatus] = useState("");
  const [executionType, setExecutionType] = useState("");
  const [categoryId] = useState("");

  const { data, total, totalPages, loading, error, refetch } = useCatalogItems({
    page,
    pageSize: PAGE_SIZE,
    search,
    itemType: itemType || undefined,
    status: status || undefined,
    executionType: executionType || undefined,
    categoryId: categoryId || undefined,
  });

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setItemType("");
    setStatus("");
    setExecutionType("");
    setPage(1);
  };

  const hasFilters = search || itemType || status || executionType;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
          Catálogo Mestre
        </h1>
        <button
          onClick={() => navigate("/pricing/catalog/new")}
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
          Novo Item
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar por código, nome ou alias..."
            style={{
              flex: 1,
              minWidth: "200px",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              outline: "none",
            }}
            aria-label="Buscar catálogo"
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
            value={itemType}
            onChange={(e) => { setItemType(e.target.value); setPage(1); }}
            style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos os tipos</option>
            {ITEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            {ITEM_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={executionType}
            onChange={(e) => { setExecutionType(e.target.value); setPage(1); }}
            style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            aria-label="Filtrar por execução"
          >
            <option value="">Todas as execuções</option>
            {EXECUTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
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

      {/* Loading */}
      {loading && (
        <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Carregando catálogo...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>Erro ao carregar catálogo</p>
          <button
            onClick={() => void refetch()}
            style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-8)", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: hasFilters ? "var(--space-2)" : 0 }}>
            {hasFilters ? "Nenhum item encontrado para os filtros aplicados." : "Nenhum item cadastrado."}
          </p>
          {!hasFilters && (
            <button
              onClick={() => navigate("/pricing/catalog/new")}
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
              Novo item
            </button>
          )}
        </div>
      )}

      {/* Desktop Table */}
      {!loading && !error && data.length > 0 && (
        <>
          <div style={{ display: "block", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Código</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Nome</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Tipo</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Categoria</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Execução</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Atualizado</th>
                  <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => {
                  const typeLabel = ITEM_TYPES.find((t) => t.value === item.item_type)?.label ?? item.item_type;
                  const execLabel = EXECUTION_TYPES.find((t) => t.value === item.execution_type)?.label ?? item.execution_type;
                  const statusInfo = ITEM_STATUSES.find((s) => s.value === item.status);

                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}
                      onClick={() => navigate(`/pricing/catalog/${item.id}`)}
                    >
                      <td style={{ padding: "var(--space-3)", fontWeight: "var(--font-medium)", fontFamily: "monospace" }}>{item.code}</td>
                      <td style={{ padding: "var(--space-3)" }}>
                        <div>{item.name}</div>
                        {item.short_name && <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{item.short_name}</div>}
                      </td>
                      <td style={{ padding: "var(--space-3)" }}>{typeLabel}</td>
                      <td style={{ padding: "var(--space-3)" }}>{item.category?.name ?? "—"}</td>
                      <td style={{ padding: "var(--space-3)" }}>{execLabel}</td>
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
                          {statusInfo?.label ?? item.status}
                        </span>
                      </td>
                      <td style={{ padding: "var(--space-3)", color: "var(--color-text-secondary)" }}>
                        {new Date(item.updated_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td style={{ padding: "var(--space-3)", textAlign: "right" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/pricing/catalog/${item.id}`); }}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-4)", padding: "var(--space-3) 0" }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                {total} {total === 1 ? "item" : "itens"} — Página {page} de {totalPages}
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
