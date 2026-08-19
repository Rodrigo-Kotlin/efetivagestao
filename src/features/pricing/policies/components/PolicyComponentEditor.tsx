import { useState } from "react";
import { COMPONENT_TYPES } from "../types/pricing-policy.types";
import type { PricingComponentType } from "../types/pricing-policy.types";
import type { PricingPolicyComponent } from "../types/pricing-policy.types";
import { formatCurrency, formatPercent, parseNumber, parsePercent } from "../utils/format";

interface Props {
  versionId: string;
  components: PricingPolicyComponent[];
  onAdd: (data: {
    name: string;
    componentType: PricingComponentType;
    fixedAmount: number | null;
    rate: number | null;
  }) => Promise<void>;
  onDelete: (componentId: string) => Promise<void>;
  disabled?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-xs)",
  color: "var(--color-text-secondary)",
  marginBottom: "4px",
};

export function PolicyComponentEditor({ versionId: _versionId, components, onAdd, onDelete, disabled = false }: Props) {
  const [name, setName] = useState("");
  const [componentType, setComponentType] = useState<PricingComponentType | "">("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const type = componentType as PricingComponentType;

  const handleAdd = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Informe um nome para o componente.");
      return;
    }

    if (!componentType) {
      setError("Selecione o tipo do componente.");
      return;
    }

    // UI-FORM05: fixed uses fixed_amount; percentage uses rate.
    if (type === "fixed" && fixedAmount.trim() === "") {
      setError("Informe o valor fixo do componente.");
      return;
    }

    if (type === "percentage_of_base_cost" && rate.trim() === "") {
      setError("Informe a taxa percentual do componente.");
      return;
    }

    const fixed = parseNumber(fixedAmount);
    const rateFrac = parsePercent(rate);

    if (type === "fixed" && (fixed === null || fixed < 0)) {
      setError("Informe um valor fixo válido (maior ou igual a zero).");
      return;
    }

    if (type === "percentage_of_base_cost" && (rateFrac === null || rateFrac < 0 || rateFrac > 1)) {
      setError("A taxa percentual deve estar entre 0% e 100%.");
      return;
    }

    setBusy(true);
    try {
      await onAdd({
        name: name.trim(),
        componentType: type,
        fixedAmount: type === "fixed" ? fixed : null,
        rate: type === "percentage_of_base_cost" ? rateFrac : null,
      });
      setName("");
      setComponentType("");
      setFixedAmount("");
      setRate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar componente");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", color: "var(--color-text)", marginBottom: "var(--space-3)" }}>
        Componentes de custo
      </h3>

      {components.length > 0 && (
        <div style={{ display: "block", overflowX: "auto", marginBottom: "var(--space-4)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                <th style={{ textAlign: "left", padding: "var(--space-2)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Nome</th>
                <th style={{ textAlign: "left", padding: "var(--space-2)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Tipo</th>
                <th style={{ textAlign: "right", padding: "var(--space-2)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Valor</th>
                <th style={{ textAlign: "right", padding: "var(--space-2)" }}></th>
              </tr>
            </thead>
            <tbody>
              {components.map((c) => {
                const typeLabel = COMPONENT_TYPES.find((t) => t.value === c.component_type)?.label ?? c.component_type;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "var(--space-2)" }}>{c.name}</td>
                    <td style={{ padding: "var(--space-2)", color: "var(--color-text-secondary)" }}>{typeLabel}</td>
                    <td style={{ padding: "var(--space-2)", textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                      {c.component_type === "fixed" ? formatCurrency(c.fixed_amount) : formatPercent(c.rate)}
                    </td>
                    <td style={{ padding: "var(--space-2)", textAlign: "right" }}>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Remover o componente "${c.name}"?`)) {
                              void onDelete(c.id).catch((err) => setError(err instanceof Error ? err.message : "Falha ao remover componente"));
                            }
                          }}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "transparent",
                            color: "#DC2626",
                            border: "1px solid #FECACA",
                            borderRadius: "var(--radius-md)",
                            cursor: "pointer",
                            fontSize: "var(--text-xs)",
                          }}
                        >
                          Remover
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {components.length === 0 && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
          Nenhum componente de custo adicional configurado nesta versão.
        </p>
      )}

      {!disabled && (
        <div style={{ backgroundColor: "var(--color-surface-secondary, #F9FAFB)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)" }}>
            Adicionar componente adicional de custo
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
            <div>
              <label style={labelStyle}>Nome *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Taxa de coleta"
                style={inputStyle}
                aria-label="Nome do componente"
              />
            </div>
            <div>
              <label style={labelStyle}>Tipo *</label>
              <select
                value={componentType}
                onChange={(e) => { setComponentType(e.target.value as PricingComponentType); setFixedAmount(""); setRate(""); }}
                style={inputStyle}
                aria-label="Tipo do componente"
              >
                <option value="">Selecione o tipo...</option>
                {COMPONENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {type === "fixed" && (
            <div style={{ marginBottom: "var(--space-3)" }}>
              <label style={labelStyle}>Valor fixo (R$) *</label>
              <input
                type="number"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
                min={0}
                step="0.01"
                placeholder="Ex.: 5.00"
                style={inputStyle}
                aria-label="Valor fixo do componente em reais"
              />
            </div>
          )}

          {type === "percentage_of_base_cost" && (
            <div style={{ marginBottom: "var(--space-3)" }}>
              <label style={labelStyle}>Taxa percentual sobre custo-base (%) *</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                min={0}
                max={100}
                step="0.01"
                placeholder="Ex.: 5"
                style={inputStyle}
                aria-label="Taxa percentual do componente"
              />
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                Percentual aplicado sobre o custo-base confirmado.
              </p>
            </div>
          )}

          {error && (
            <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-3)" }}>
              <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={busy}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "var(--color-primary)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.6 : 1,
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-medium)",
              }}
            >
              {busy ? "Adicionando..." : "Adicionar componente"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}