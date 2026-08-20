// ============================================================
// CommercialPriceLookupPage — UI for fn_resolve_commercial_table_price.
// Current/future/historical lookups. No client resolution.
// ============================================================

import { useEffect, useState } from "react";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommercialPriceResolver } from "../components/CommercialPriceResolver";
import { useCommercialResolver } from "../hooks/useCommercial";
import { fetchCommercialTables } from "../api/commercialPrices";
import type { CommercialPriceTableWithCounts } from "../types/commercial.types";
import { formatDate, todayIsoDate } from "../utils/format";

function Inner() {
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;

  const [tables, setTables] = useState<CommercialPriceTableWithCounts[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tableId, setTableId] = useState<string | null>(null);
  const [catalogItemId, setCatalogItemId] = useState("");
  const [referenceDate, setReferenceDate] = useState<string>(todayIsoDate());

  const { result, loading, error, run } = useCommercialResolver({
    orgId,
    tableId,
    catalogItemId: catalogItemId.trim() || null,
    referenceDate: referenceDate,
  });

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setTablesLoading(true);
    fetchCommercialTables({ orgId, pageSize: 200 })
      .then((data) => {
        if (!cancelled) setTables(data.data);
      })
      .catch(() => {
        if (!cancelled) setTables([]);
      })
      .finally(() => {
        if (!cancelled) setTablesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  if (!can("pricing.commercial.view")) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Você não tem permissão para consultar tabelas comerciais.
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", marginBottom: "var(--space-2)" }}>
        Consulta de preço comercial
      </h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
        Resolve o preço de um item de catálogo dentro de uma tabela comercial em uma data
        específica. Suporta consultas atuais, futuras e históricas.
      </p>

      <div
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
          marginBottom: "var(--space-4)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
          <div>
            <label
              htmlFor="cplp-table"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Tabela comercial
            </label>
            <select
              id="cplp-table"
              value={tableId ?? ""}
              onChange={(e) => setTableId(e.target.value || null)}
              disabled={tablesLoading}
              style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            >
              <option value="">Selecione</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} · {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="cplp-item"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Item de catálogo (ID)
            </label>
            <input
              id="cplp-item"
              type="text"
              value={catalogItemId}
              onChange={(e) => setCatalogItemId(e.target.value)}
              placeholder="UUID do item"
              style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            />
          </div>

          <div>
            <label
              htmlFor="cplp-date"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Data de referência
            </label>
            <input
              id="cplp-date"
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            />
          </div>
        </div>

        <p
          style={{
            marginTop: "var(--space-2)",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-secondary)",
          }}
        >
          A data de referência pode ser passada (consulta histórica) ou futura. Hoje: {formatDate(todayIsoDate())}.
        </p>
      </div>

      <CommercialPriceResolver
        result={result}
        loading={loading}
        error={error}
        onRun={run}
      />
    </div>
  );
}

export function CommercialPriceLookupPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
