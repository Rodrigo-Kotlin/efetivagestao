import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommercialCodeBadge, CommercialTableStatusBadge } from "./CommercialBadges";
import type { CommercialPriceTableWithCounts } from "../types/commercial.types";
import { COMMERCIAL_TABLE_STATUSES } from "../types/commercial.types";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { AppIcon } from "@/layouts/app-shell/AppIcon";

interface Props {
  tables: CommercialPriceTableWithCounts[];
  loading: boolean;
  error: string | null;
  canCreate: boolean;
  search: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onRetry: () => void;
}

const STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  ...COMMERCIAL_TABLE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
];

export function CommercialTableList({
  tables,
  loading,
  error,
  canCreate,
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onRetry,
}: Props) {
  const navigate = useNavigate();
  const [draftSearch, setDraftSearch] = useState(search);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-5)" }}>
      <div className="eg-toolbar" role="search" aria-label="Filtros de tabelas comerciais">
        <div className="eg-toolbar__search">
          <SearchField
            label="Buscar"
            placeholder="Buscar por código ou nome"
            value={draftSearch}
            onChange={setDraftSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearchChange(draftSearch);
            }}
            aria-label="Buscar tabelas comerciais"
          />
        </div>
        <div className="eg-toolbar__filters">
          <Button variant="filled" size="compact" onClick={() => onSearchChange(draftSearch)}>Buscar</Button>
          <Select
            label="Status"
            density="compact"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filtrar por status"
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? <Spinner label="Carregando tabelas comerciais..." /> : null}

      {error && !loading ? (
        <Alert tone="negative" title={error}>
          <Button variant="outlined" size="compact" onClick={onRetry}>Tentar novamente</Button>
        </Alert>
      ) : null}

      {!loading && !error && tables.length === 0 ? (
        <EmptyState
          title="Nenhuma tabela comercial encontrada"
          description={canCreate ? "Crie a primeira tabela para começar." : "Aguarde a criação de uma tabela."}
        />
      ) : null}

      {!loading && !error && tables.length > 0 ? (
        <Table caption="Lista de tabelas comerciais" captionHidden>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Código</th>
              <th style={{ textAlign: "left" }}>Nome</th>
              <th style={{ textAlign: "left" }}>Status</th>
              <th style={{ textAlign: "left" }}>Versão atual</th>
              <th style={{ textAlign: "left" }}>Agendada</th>
              <th style={{ textAlign: "right" }}><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/pricing/commercial/${t.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/pricing/commercial/${t.id}`);
                  }
                }}
                tabIndex={0}
                role="link"
                aria-label={`Abrir tabela ${t.name}`}
                style={{ cursor: "pointer" }}
              >
                <td><CommercialCodeBadge code={t.code} /></td>
                <td>
                  <div style={{ fontWeight: 500 }}>{t.name}</div>
                  {t.description ? (
                    <div style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>
                      {t.description}
                    </div>
                  ) : null}
                </td>
                <td><CommercialTableStatusBadge status={t.status} /></td>
                <td>{t.current_version ? `v${t.current_version.version_number}` : "—"}</td>
                <td>{t.scheduled_version ? `v${t.scheduled_version.version_number}` : "—"}</td>
                <td style={{ textAlign: "right", color: "var(--md-sys-color-on-surface-variant)" }} aria-hidden="true">
                  <span className="eg-icon" data-size="small">
                    <AppIcon name="arrow-right" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}

      {/* Hidden flag to keep canCreate referenced for future use */}
      {false && canCreate ? null : null}
    </div>
  );
}
