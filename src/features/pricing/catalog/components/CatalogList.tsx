import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { useCatalogItems } from "../hooks/useCatalog";
import { ITEM_TYPES, EXECUTION_TYPES } from "@/types";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Table } from "@/components/ui/Table";

const PAGE_SIZE = 25;

const typeLabels: Record<string, string> = Object.fromEntries(
  ITEM_TYPES.map((t) => [t.value, t.label])
);

export function CatalogList() {
  const { can } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [executionFilter, setExecutionFilter] = useState("all");
  const [categoryFilter] = useState("all");

  const { data: items, total, totalPages, loading, error } = useCatalogItems({
    search: search || undefined,
    itemType: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    executionType: executionFilter === "all" ? undefined : executionFilter,
    categoryId: categoryFilter === "all" ? undefined : categoryFilter,
    page,
    pageSize: PAGE_SIZE,
  });

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setExecutionFilter("all");
    setPage(1);
  };

  const hasActiveFilters =
    search !== "" ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    executionFilter !== "all";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
      <SearchField
        label="Buscar exames"
        placeholder="Ex.: hemograma, gasometria..."
        value={search}
        onChange={(value) => { setSearch(value); setPage(1); }}
        debounceMs={300}
      />

      <div style={{ display: "flex", gap: "var(--spacing-3)", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label className="sr-only" htmlFor="filter-type">Filtrar por tipo</label>
          <select
            id="filter-type"
            aria-label="Filtrar por tipo"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            style={{ padding: "var(--spacing-2) var(--spacing-3)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)" }}
          >
            <option value="all">Todos</option>
            {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="sr-only" htmlFor="filter-status">Filtrar por status</label>
          <select
            id="filter-status"
            aria-label="Filtrar por status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: "var(--spacing-2) var(--spacing-3)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)" }}
          >
            <option value="all">Todos</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>
        <div>
          <label className="sr-only" htmlFor="filter-execution">Filtrar por execução</label>
          <select
            id="filter-execution"
            aria-label="Filtrar por execução"
            value={executionFilter}
            onChange={(e) => { setExecutionFilter(e.target.value); setPage(1); }}
            style={{ padding: "var(--spacing-2) var(--spacing-3)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)" }}
          >
            <option value="all">Todos</option>
            {EXECUTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {hasActiveFilters && (
          <Button variant="outlined" size="compact" onClick={clearFilters}>Limpar filtros</Button>
        )}
      </div>

      {loading && <Spinner label="Carregando exames..." />}

      {error && (
        <Alert tone="negative" title="Erro ao carregar exames">
          {error}
        </Alert>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Nenhum exame cadastrado."
          description="Cadastre o primeiro exame para iniciar a precificação."
          actions={
            can("pricing.catalog.create") ? (
              <Button variant="filled" onClick={() => navigate("/pricing/catalog/new")}>
                Cadastrar primeiro exame
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <Table caption="Lista de exames" captionHidden>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Código</th>
                <th style={{ textAlign: "left" }}>Nome</th>
                <th style={{ textAlign: "left" }}>Tipo</th>
                <th style={{ textAlign: "left" }}>Categoria</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/pricing/catalog/${item.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ fontFamily: "var(--font-family-mono)", fontSize: "var(--font-size-sm)" }}>
                    {item.legacy_code ?? "—"}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    {item.short_name && (
                      <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
                        {item.short_name}
                      </div>
                    )}
                  </td>
                  <td><Badge>{typeLabels[item.item_type] ?? item.item_type}</Badge></td>
                  <td style={{ color: "var(--color-text-secondary)" }}>
                    {item.category?.name ?? "Sem categoria"}
                  </td>
                  <td><StatusBadge status={item.status} /></td>
                  <td style={{ textAlign: "right" }}>
                    <Button
                      variant="text"
                      size="compact"
                      onClick={(e) => { e.stopPropagation(); navigate(`/pricing/catalog/${item.id}`); }}
                    >
                      Ver detalhes
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
                Página {page} de {totalPages} ({total} exames)
              </span>
              <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
                <Button variant="outlined" size="compact" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  ← Anterior
                </Button>
                <Button variant="outlined" size="compact" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  Próxima →
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
