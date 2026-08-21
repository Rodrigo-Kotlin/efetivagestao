// ============================================================
// CompanySelector — searchable picker of eligible companies.
// RBAC: company data visibility is enforced by RLS upstream.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { fetchEligibleCompanies } from "../api/clientPrices";
import type { CompanyOption } from "../types/client.types";

interface Props {
  orgId: string;
  value: string | null;
  onChange: (companyId: string | null) => void;
  disabled?: boolean;
  excludeExisting?: boolean;
}

type EligibleCompany = CompanyOption & { has_client?: boolean };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
};

function companyLabel(c: EligibleCompany): string {
  return c.legal_name ?? c.trade_name ?? `${c.id.slice(0, 8)}…`;
}

export function CompanySelector({
  orgId,
  value,
  onChange,
  disabled = false,
  excludeExisting = false,
}: Props) {
  const [options, setOptions] = useState<EligibleCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchEligibleCompanies(orgId)
      .then((data) => {
        if (cancelled) return;
        setOptions(data as EligibleCompany[]);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return options.filter((c) => {
      if (excludeExisting && c.has_client) return false;
      if (!term) return true;
      return (
        (c.legal_name ?? "").toLowerCase().includes(term) ||
        (c.trade_name ?? "").toLowerCase().includes(term) ||
        (c.tax_id ?? "").toLowerCase().includes(term)
      );
    });
  }, [options, search, excludeExisting]);

  return (
    <div>
      <input
        type="search"
        placeholder="Buscar por razão social, nome fantasia ou CNPJ"
        value={search}
        disabled={disabled || loading}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputStyle, marginBottom: "var(--space-2)" }}
        aria-label="Buscar empresas elegíveis"
      />

      {loading && (
        <p role="status" aria-label="Carregando empresas" style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
          Carregando empresas...
        </p>
      )}

      {error && !loading && (
        <div role="alert" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p role="status" style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
          Nenhuma empresa elegível encontrada.
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div
          role="listbox"
          aria-label="Empresas elegíveis"
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            maxHeight: "240px",
            overflowY: "auto",
          }}
        >
          {filtered.map((c) => {
            const selected = value === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onClick={() => onChange(selected ? null : c.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-2)",
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  backgroundColor: selected ? "var(--color-surface-secondary, #EFF6FF)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--color-border-light, #F1F5F9)",
                  cursor: disabled ? "default" : "pointer",
                  textAlign: "left",
                  fontSize: "var(--text-sm)",
                }}
              >
                <span>
                  <strong>{companyLabel(c)}</strong>
                  {c.tax_id && (
                    <span
                      style={{
                        marginLeft: "var(--space-2)",
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {c.tax_id}
                    </span>
                  )}
                </span>
                {c.is_supplier && (
                  <span
                    style={{
                      flexShrink: 0,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--font-medium)",
                      backgroundColor: "#F59E0B20",
                      color: "#F59E0B",
                    }}
                  >
                    Também fornecedor
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange(null)}
          style={{
            marginTop: "var(--space-2)",
            padding: "var(--space-1) var(--space-3)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontSize: "var(--text-xs)",
          }}
        >
          Limpar seleção
        </button>
      )}
    </div>
  );
}
