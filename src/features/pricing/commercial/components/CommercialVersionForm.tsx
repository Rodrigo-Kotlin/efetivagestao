// ============================================================
// CommercialVersionForm — create a new draft version.
// Supports two modes: empty + clone-from-source (when provided).
// ============================================================

import { useState } from "react";
import { COMMERCIAL_PERMISSIONS } from "../types/commercial.types";

interface Props {
  defaultValidFrom: string;
  defaultValidTo: string | null;
  sourceVersionLabel?: string;
  onSubmitEmpty: (input: {
    validFrom: string;
    validTo: string | null;
    versionLabel: string | null;
    notes: string | null;
  }) => Promise<void>;
  onSubmitClone: (input: {
    sourceVersionId: string;
    validFrom: string;
    validTo: string | null;
    versionLabel: string | null;
    notes: string | null;
  }) => Promise<void>;
  sourceVersionId?: string;
  cancelLabel?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-sm)",
  fontWeight: "var(--font-medium)",
  color: "var(--color-text)",
  marginBottom: "var(--space-1)",
};

export function CommercialVersionForm({
  defaultValidFrom,
  defaultValidTo,
  sourceVersionId,
  sourceVersionLabel,
  onSubmitEmpty,
  onSubmitClone,
  cancelLabel,
}: Props) {
  const [validFrom, setValidFrom] = useState(defaultValidFrom);
  const [validTo, setValidTo] = useState(defaultValidTo ?? "");
  const [versionLabel, setVersionLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"empty" | "clone">(
    sourceVersionId ? "clone" : "empty"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validFrom) {
      setError("Informe a data de início de vigência.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "clone" && sourceVersionId) {
        await onSubmitClone({
          sourceVersionId,
          validFrom,
          validTo: validTo || null,
          versionLabel: versionLabel.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await onSubmitEmpty({
          validFrom,
          validTo: validTo || null,
          versionLabel: versionLabel.trim() || null,
          notes: notes.trim() || null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar versão");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
      }}
    >
      <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-4)" }}>
        Nova versão
      </h2>

      {sourceVersionId && (
        <fieldset
          style={{
            border: "1px solid var(--color-border-light, #F1F5F9)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
          }}
        >
          <legend style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}>
            Modo de criação
          </legend>
          <label style={{ display: "block", marginBottom: "var(--space-2)", fontSize: "var(--text-sm)" }}>
            <input
              type="radio"
              name="cvm-mode"
              checked={mode === "empty"}
              onChange={() => setMode("empty")}
              style={{ marginRight: "var(--space-2)" }}
            />
            Criar versão vazia
          </label>
          <label style={{ display: "block", fontSize: "var(--text-sm)" }}>
            <input
              type="radio"
              name="cvm-mode"
              checked={mode === "clone"}
              onChange={() => setMode("clone")}
              style={{ marginRight: "var(--space-2)" }}
            />
            Clonar versão existente
            {sourceVersionLabel && (
              <span style={{ color: "var(--color-text-secondary)" }}> · {sourceVersionLabel}</span>
            )}
          </label>
          <p
            style={{
              marginTop: "var(--space-2)",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-secondary)",
            }}
          >
            Preços e snapshots do catálogo são copiados. A linhagem é preservada. Exceções
            aprovadas ou negadas <strong>não</strong> são copiadas.
          </p>
        </fieldset>
      )}

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
        <div>
          <label htmlFor="cvm-valid-from" style={labelStyle}>
            Vigência inicial
          </label>
          <input
            id="cvm-valid-from"
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label htmlFor="cvm-valid-to" style={labelStyle}>
            Vigência final
          </label>
          <input
            id="cvm-valid-to"
            type="date"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            style={inputStyle}
            placeholder="Em aberto"
          />
        </div>
        <div>
          <label htmlFor="cvm-label" style={labelStyle}>
            Rótulo da versão
          </label>
          <input
            id="cvm-label"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            placeholder="Opcional"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginTop: "var(--space-3)" }}>
        <label htmlFor="cvm-notes" style={labelStyle}>
          Observações
        </label>
        <textarea
          id="cvm-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Opcional"
        />
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
          {submitting
            ? "Criando..."
            : mode === "clone"
              ? "Clonar versão"
              : "Criar versão vazia"}
        </button>
        {cancelLabel && (
          <button
            type="button"
            onClick={() => {
              window.history.back();
            }}
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
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
}

export const _INTERNAL_PERMISSION_CONSTANT_FOR_TESTS = COMMERCIAL_PERMISSIONS.create;
