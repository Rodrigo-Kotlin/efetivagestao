import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCostTables } from "../hooks/useCosts";
import { COST_TABLE_STATUSES } from "@/types";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Table } from "@/components/ui/Table";
import { AppIcon } from "@/layouts/app-shell/AppIcon";
import { formatDate } from "../utils/format";

const PAGE_SIZE = 25;

export function CostTableList() {
  const navigate = useNavigate();
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

  const hasFilters = !!search || !!supplierFilter || !!status;
  const activeFilterCount = [search, supplierFilter, status].filter(Boolean).length;

  const uniqueSuppliers = data.reduce<{ id: string; name: string }[]>((acc, ct) => {
    const supplierId = ct.supplier?.id;
    const supplierName = ct.supplier?.legal_name ?? "—";
    if (supplierId && !acc.some((s) => s.id === supplierId)) {
      acc.push({ id: supplierId, name: supplierName });
    }
    return acc;
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-5)" }}>
      <div className="eg-toolbar" role="search" aria-label="Filtros de tabelas de custo">
        <div className="eg-toolbar__search">
          <SearchField
            label="Buscar"
            placeholder="Buscar por fornecedor, código ou nome..."
            value={searchInput}
            onChange={setSearchInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            aria-label="Buscar tabelas de custo"
          />
        </div>
        <div className="eg-toolbar__filters">
          <Button variant="filled" size="compact" onClick={handleSearch}>Buscar</Button>
          <Select
            label="Fornecedor"
            density="compact"
            value={supplierFilter}
            onChange={(e) => { setSupplierFilter(e.target.value); setPage(1); }}
            aria-label="Filtrar por fornecedor"
          >
            <option value="">Todos os fornecedores</option>
            {uniqueSuppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select
            label="Status"
            density="compact"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            {COST_TABLE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          {hasFilters ? (
            <Button variant="text" size="compact" onClick={handleClearFilters}>
              Limpar{activeFilterCount > 1 ? ` (${activeFilterCount})` : ""}
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? <Spinner label="Carregando tabelas de custo..." /> : null}

      {error && !loading ? (
        <Alert tone="negative" title="Erro ao carregar tabelas de custo">
          <Button variant="outlined" size="compact" onClick={() => void refetch()}>Tentar novamente</Button>
        </Alert>
      ) : null}

      {!loading && !error && data.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Nenhuma tabela de custo encontrada para os filtros aplicados." : "Nenhuma tabela de custo cadastrada."}
          description={hasFilters ? "Ajuste os filtros ou limpe a busca." : "Crie a primeira tabela de custo para um fornecedor."}
        />
      ) : null}

      {!loading && !error && data.length > 0 ? (
        <>
          <Table caption="Lista de tabelas de custo" captionHidden>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Fornecedor</th>
                <th style={{ textAlign: "left" }}>Código</th>
                <th style={{ textAlign: "left" }}>Nome</th>
                <th style={{ textAlign: "left" }}>Versão Atual</th>
                <th style={{ textAlign: "left" }}>Vigência</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "left" }}>Atualizado</th>
                <th style={{ textAlign: "right" }}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {data.map((ct) => {
                const currentVersion = ct.versions?.find((v) => v.status === "active");
                return (
                  <tr
                    key={ct.id}
                    onClick={() => navigate(`/pricing/costs/${ct.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/pricing/costs/${ct.id}`);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Ver tabela de custo ${ct.name}`}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 500 }}>{ct.supplier?.legal_name ?? "—"}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--md-sys-typescale-body-medium-size)" }}>{ct.code}</td>
                    <td>{ct.name}</td>
                    <td>{currentVersion ? `v${currentVersion.version_number}` : "—"}</td>
                    <td style={{ fontSize: "var(--md-sys-typescale-body-medium-size)" }}>
                      {currentVersion?.valid_from ? `${formatDate(currentVersion.valid_from)} — ${formatDate(currentVersion.valid_to)}` : "—"}
                    </td>
                    <td><StatusBadge status={ct.status} /></td>
                    <td style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>
                      {formatDate(ct.updated_at)}
                    </td>
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
                {total} {total === 1 ? "tabela" : "tabelas"} — Página {page} de {totalPages}
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
