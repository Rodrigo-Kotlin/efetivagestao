// ============================================================
// CommercialPriceTablesPage — list page (RBAC + state).
// ============================================================

import { useState } from "react";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommercialTableList } from "../components/CommercialTableList";
import { useCommercialTables } from "../hooks/useCommercial";

function Inner() {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data, loading, error, refetch } = useCommercialTables({
    search: search.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  if (!can("pricing.commercial.view")) {
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

  return (
    <CommercialTableList
      tables={data}
      loading={loading}
      error={error}
      canCreate={can("pricing.commercial.create")}
      search={search}
      statusFilter={statusFilter}
      onSearchChange={setSearch}
      onStatusChange={setStatusFilter}
      onRetry={() => void refetch()}
    />
  );
}

export function CommercialPriceTablesPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
