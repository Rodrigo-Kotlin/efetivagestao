import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuppliers } from "../hooks/useSuppliers";
import { SUPPLIER_CATEGORIES, SUPPLIER_STATUSES } from "@/types";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Table } from "@/components/ui/Table";
import { AppIcon } from "@/layouts/app-shell/AppIcon";

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

  const hasFilters = !!search || !!category || !!status;
  const activeFilterCount = [search, category, status].filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-5)" }}>
      <div className="eg-toolbar" role="search" aria-label="Filtros de fornecedores">
        <div className="eg-toolbar__search">
          <SearchField
            label="Buscar fornecedores"
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); }}
            debounceMs={300}
          />
        </div>
        <div className="eg-toolbar__filters">
          <Select
            label="Categoria"
            density="compact"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {SUPPLIER_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Select
            label="Status"
            density="compact"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            {SUPPLIER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          {hasFilters ? (
            <Button variant="text" size="compact" onClick={handleClearFilters}>
              Limpar {activeFilterCount > 1 ? `(${activeFilterCount})` : ""}
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? <Spinner label="Carregando fornecedores..." /> : null}

      {error && !loading ? (
        <Alert tone="negative" title="Erro ao carregar fornecedores">
          <Button variant="outlined" size="compact" onClick={() => void refetch()}>Tentar novamente</Button>
        </Alert>
      ) : null}

      {!loading && !error && data.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Nenhum fornecedor encontrado para os filtros aplicados." : "Nenhum fornecedor cadastrado."}
          description={hasFilters ? "Ajuste os filtros ou limpe a busca." : "Use o botão acima para cadastrar o primeiro fornecedor."}
        />
      ) : null}

      {!loading && !error && data.length > 0 ? (
        <>
          <Table caption="Lista de fornecedores" captionHidden>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Empresa</th>
                <th style={{ textAlign: "left" }}>Nome Fantasia</th>
                <th style={{ textAlign: "left" }}>Documento</th>
                <th style={{ textAlign: "left" }}>Categoria</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "right" }}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {data.map((supplier) => {
                const catLabel = SUPPLIER_CATEGORIES.find((c) => c.value === supplier.supplier_category)?.label ?? supplier.supplier_category;
                return (
                  <tr
                    key={supplier.company_id}
                    onClick={() => navigate(`/pricing/suppliers/${supplier.company_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/pricing/suppliers/${supplier.company_id}`);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Ver fornecedor ${supplier.company?.legal_name ?? "—"}`}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 500 }}>{supplier.company?.legal_name ?? "—"}</td>
                    <td>{supplier.company?.trade_name ?? "—"}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--md-sys-typescale-body-medium-size)" }}>
                      {supplier.company?.tax_id ?? "—"}
                    </td>
                    <td>{catLabel}</td>
                    <td><StatusBadge status={supplier.status} /></td>
                    <td style={{ textAlign: "right", color: "var(--md-sys-color-on-surface-variant)" }} aria-hidden="true">
                      <span className="eg-icon" data-size="small">
                        <AppIcon name="arrow-right" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {totalPages > 1 ? (
            <div className="eg-toolbar" aria-label="Paginação">
              <span style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>
                {total} {total === 1 ? "fornecedor" : "fornecedores"} — Página {page} de {totalPages}
              </span>
              <div className="eg-toolbar__actions">
                <Button variant="outlined" size="compact" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                <Button variant="outlined" size="compact" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima</Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
