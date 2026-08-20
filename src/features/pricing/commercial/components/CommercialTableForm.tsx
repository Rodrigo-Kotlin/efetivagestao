// ============================================================
// CommercialTableForm — create a new stable commercial table.
// Uses fn_create_commercial_price_table (PRC-05C).
// ============================================================

import { useState } from "react";

interface Props {
  onSubmit: (data: { code: string; name: string; description: string | null }) => Promise<void>;
  onCancel: () => void;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-sm)",
  fontWeight: "var(--font-medium)",
  color: "var(--color-text)",
  marginBottom: "var(--space-1)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-text)",
};

export function CommercialTableForm({ onSubmit, onCancel }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError("Código e nome são obrigatórios.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar tabela");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={cardStyle}>
      <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-4)" }}>
        Nova tabela comercial
      </h2>

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
          }}
        >
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        <div>
          <label htmlFor="cpt-code" style={labelStyle}>
            Código
          </label>
          <input
            id="cpt-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ex: TAB-PADRAO"
            style={inputStyle}
            required
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="cpt-name" style={labelStyle}>
            Nome
          </label>
          <input
            id="cpt-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Tabela Padrão"
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label htmlFor="cpt-description" style={labelStyle}>
            Descrição
          </label>
          <textarea
            id="cpt-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-text-inverse)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Criando..." : "Criar tabela"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            cursor: submitting ? "default" : "pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
