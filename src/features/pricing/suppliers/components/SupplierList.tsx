import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuppliers } from "../hooks/useSuppliers";
import { SUPPLIER_CATEGORIES, SUPPLIER_STATUSES } from "@/types";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Table } from "@/components/ui/Table";

const PAGE_SIZE = 25;

export function SupplierList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const { data, total, totalPages, loading, error, refetch } = useSuppliers({
    page, pageSize: PAGE_SIZE, search,
    category: category || undefined, status: status || undefined,
  });

  const handleClearFilters = () => {
    setSearch(""); setCategory(""); setStatus(""); setPage(1);
  };

  const hasFilters = search || category || status;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
      <SearchField
        label="Buscar fornecedores"
        placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
        value={search}
        onChange={(value) => { setSearch(value); setPage(1); }}
        debounceMs={300}
      />

      <div style={{ display: "flex", gap: "var(--spacing-3)", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label className="sr-only" htmlFor="filter-category">Filtrar por categoria</label>
          <select id="filter-category" aria-label="Filtrar por categoria" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            style={{ padding: "var(--spacing-2) var(--spacing-3)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)" }}>
            <option value="">Todas as categorias</option>
            {SUPPLIER_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="sr-only" htmlFor="filter-status">Filtrar por status</label>
          <select id="filter-status" aria-label="Filtrar por status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ padding: "var(--spacing-2) var(--spacing-3)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)" }}>
            <option value="">Todos os status</option>
            {SUPPLIER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {hasFilters && <Button variant="outlined" size="compact" onClick={handleClearFilters}>Limpar filtros</Button>}
      </div>

      {loading && <Spinner label="Carregando fornecedores..." />}

      {error && !loading && (
        <Alert tone="negative" title="Erro ao carregar fornecedores">
          <Button variant="outlined" size="compact" onClick={() => void refetch()}>Tentar novamente</Button>
        </Alert>
      )}

      {!loading && !error && data.length === 0 && (
        <EmptyState
          title={hasFilters ? "Nenhum fornecedor encontrado para os filtros aplicados." : "Nenhum fornecedor cadastrado."}
          description="Cadastre fornecedores para vincular itens do catálogo."
        />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <Table caption="Lista de fornecedores" captionHidden>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Empresa</th>
                <th style={{ textAlign: "left" }}>Nome Fantasia</th>
                <th style={{ textAlign: "left" }}>Documento</th>
                <th style={{ textAlign: "left" }}>Categoria</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((supplier) => {
                const catLabel = SUPPLIER_CATEGORIES.find((c) => c.value === supplier.supplier_category)?.label ?? supplier.supplier_category;
                return (
                  <tr key={supplier.company_id} onClick={() => navigate(`/pricing/suppliers/${supplier.company_id}`)} style={{ cursor: "pointer" }}>
                    <td style={{ fontWeight: 500 }}>{supplier.company?.legal_name ?? "—"}</td>
                    <td>{supplier.company?.trade_name ?? "—"}</td>
                    <td style={{ fontFamily: "var(--font-family-mono)" }}>{supplier.company?.tax_id ?? "—"}</td>
                    <td>{catLabel}</td>
                    <td><StatusBadge status={supplier.status} /></td>
                    <td style={{ textAlign: "right" }}>
                      <Button variant="text" size="compact" onClick={(e) => { e.stopPropagation(); navigate(`/pricing/suppliers/${supplier.company_id}`); }}>Ver</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                {total} {total === 1 ? "fornecedor" : "fornecedores"} — Página {page} de {totalPages}
              </span>
              <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
                <Button variant="outlined" size="compact" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                <Button variant="outlined" size="compact" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
