import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePricingPolicies } from "../hooks/usePricingPolicies";
import { POLICY_SCOPE_TYPES, POLICY_STATUSES } from "../types/pricing-policy.types";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Table } from "@/components/ui/Table";
import { AppIcon } from "@/layouts/app-shell/AppIcon";
import { formatDate } from "../utils/format";

const PAGE_SIZE = 25;

export function PolicyList() {
  const navigate = useNavigate();
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

  const hasFilters = !!search || !!scopeType || !!status;
  const activeFilterCount = [search, scopeType, status].filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-5)" }}>
      <div className="eg-toolbar" role="search" aria-label="Filtros de políticas de preço">
        <div className="eg-toolbar__search">
          <SearchField
            label="Buscar"
            placeholder="Buscar por código ou nome..."
            value={searchInput}
            onChange={setSearchInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            aria-label="Buscar políticas de preço"
          />
        </div>
        <div className="eg-toolbar__filters">
          <Button variant="filled" size="compact" onClick={handleSearch}>Buscar</Button>
          <Select
            label="Escopo"
            density="compact"
            value={scopeType}
            onChange={(e) => { setScopeType(e.target.value); setPage(1); }}
            aria-label="Filtrar por escopo"
          >
            <option value="">Todos os escopos</option>
            {POLICY_SCOPE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
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
            {POLICY_STATUSES.map((s) => (
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

      {loading ? <Spinner label="Carregando políticas de preço..." /> : null}

      {error && !loading ? (
        <Alert tone="negative" title="Erro ao carregar políticas de preço">
          <Button variant="outlined" size="compact" onClick={() => void refetch()}>Tentar novamente</Button>
        </Alert>
      ) : null}

      {!loading && !error && data.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Nenhuma política de preço encontrada para os filtros aplicados." : "Nenhuma política de preço cadastrada."}
          description={hasFilters ? "Ajuste os filtros ou limpe a busca." : "Crie a primeira política de preço para a organização."}
        />
      ) : null}

      {!loading && !error && data.length > 0 ? (
        <>
          <Table caption="Lista de políticas de preço" captionHidden>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Código</th>
                <th style={{ textAlign: "left" }}>Nome</th>
                <th style={{ textAlign: "left" }}>Escopo</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "left" }}>Atualizado</th>
                <th style={{ textAlign: "right" }}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {data.map((pp) => (
                <tr
                  key={pp.id}
                  onClick={() => navigate(`/pricing/policies/${pp.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/pricing/policies/${pp.id}`);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`Ver política ${pp.name}`}
                  style={{ cursor: "pointer" }}
                >
                  <td><Badge mono>{pp.code}</Badge></td>
                  <td style={{ fontWeight: 500 }}>{pp.name}</td>
                  <td>
                    <Badge>{POLICY_SCOPE_TYPES.find((s) => s.value === pp.scope_type)?.label ?? pp.scope_type}</Badge>
                  </td>
                  <td><StatusBadge status={pp.status} /></td>
                  <td style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>
                    {formatDate(pp.updated_at)}
                  </td>
                  <td style={{ textAlign: "right", color: "var(--md-sys-color-on-surface-variant)" }} aria-hidden="true">
                    <span className="eg-icon" data-size="small">
                      <AppIcon name="arrow-right" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {totalPages > 1 ? (
            <div className="eg-toolbar" aria-label="Paginação">
              <span style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>
                {total} {total === 1 ? "política" : "políticas"} — Página {page} de {totalPages}
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
