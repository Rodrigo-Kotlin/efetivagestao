// ============================================================
// CommercialTableSelector — dropdown of active commercial tables.
// Options come from fetchCommercialTableOptions (status = active).
// ============================================================

import { useEffect, useState } from "react";
import { fetchCommercialTableOptions } from "../api/clientPrices";
import type { CommercialTableOption } from "../types/client.types";

interface Props {
  orgId: string;
  value: string | null;
  onChange: (tableId: string) => void;
  disabled?: boolean;
}

export function CommercialTableSelector({
  orgId,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [options, setOptions] = useState<CommercialTableOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCommercialTableOptions(orgId)
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
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

  if (loading) {
    return (
      <p role="status" aria-label="Carregando tabelas comerciais" style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
        Carregando tabelas comerciais...
      </p>
    );
  }

  if (error) {
    return (
      <div role="alert" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}>
        <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <select
      value={value ?? ""}
      disabled={disabled || options.length === 0}
      onChange={(e) => {
        if (e.target.value) onChange(e.target.value);
      }}
      aria-label="Selecionar tabela comercial"
      style={{
        width: "100%",
        padding: "var(--space-2) var(--space-3)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--text-sm)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <option value="">
        {options.length === 0
          ? "Nenhuma tabela ativa disponível"
          : "Selecione uma tabela"}
      </option>
      {options.map((t) => (
        <option key={t.id} value={t.id}>
          {t.code} — {t.name}
        </option>
      ))}
    </select>
  );
}
