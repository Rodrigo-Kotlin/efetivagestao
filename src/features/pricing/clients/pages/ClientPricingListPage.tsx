// ============================================================
// ClientPricingListPage — client profiles list (RBAC + state).
// ============================================================

import { useState } from "react";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ClientList } from "../components/ClientList";
import { useClientList } from "../hooks/useClients";
import { CLIENT_PROFILE_STATUSES } from "../types/client.types";

const PAGE_SIZE = 25;

const filterButtonStyle: React.CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  backgroundColor: "transparent",
  color: "var(--color-text-secondary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
};

function Inner() {
  const { can } = useAuth();
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const {
    data,
    total,
    page: currentPage,
    totalPages,
    loading,
    error,
    refetch,
  } = useClientList({
    search: search.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    pageSize: PAGE_SIZE,
  });

  if (!can("pricing.client.view")) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  const statusFilters = [
    { value: "all", label: "Todos" },
    ...CLIENT_PROFILE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          placeholder="Buscar por empresa ou CNPJ"
          value={draftSearch}
          onChange={(e) => setDraftSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setSearch(draftSearch);
              setPage(1);
            }
          }}
          aria-label="Buscar clientes"
          style={{
            flex: "1 1 240px",
            padding: "var(--space-2) var(--space-3)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
          }}
        />
        <button
          type="button"
          onClick={() => {
            setSearch(draftSearch);
            setPage(1);
          }}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-text-inverse)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
          }}
        >
          Buscar
        </button>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filtrar por status"
          style={{
            padding: "var(--space-2) var(--space-3)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
          }}
        >
          {statusFilters.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <ClientList
        data={data}
        loading={loading}
        error={error}
        canCreate={can("pricing.client.create")}
        onRetry={() => void refetch()}
      />

      {!loading && !error && total > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-3)",
            marginTop: "var(--space-4)",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
            }}
          >
            {total} cliente(s) · Página {currentPage} de {Math.max(totalPages, 1)}
          </span>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={currentPage <= 1}
              style={{ ...filterButtonStyle, opacity: currentPage <= 1 ? 0.5 : 1, cursor: currentPage <= 1 ? "default" : "pointer" }}
            >
              Primeira
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={{ ...filterButtonStyle, opacity: currentPage <= 1 ? 0.5 : 1, cursor: currentPage <= 1 ? "default" : "pointer" }}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{ ...filterButtonStyle, opacity: currentPage >= totalPages ? 0.5 : 1, cursor: currentPage >= totalPages ? "default" : "pointer" }}
            >
              Próxima
            </button>
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={currentPage >= totalPages}
              style={{ ...filterButtonStyle, opacity: currentPage >= totalPages ? 0.5 : 1, cursor: currentPage >= totalPages ? "default" : "pointer" }}
            >
              Última
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClientPricingListPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
