import { useState } from "react";
import type { CatalogItem } from "@/types";
import { validateMappingForm, getFieldError, type MappingFormData } from "../schemas/validation";

interface Props {
  catalogItems: CatalogItem[];
  onSubmit: (data: MappingFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-sm)",
  fontWeight: "var(--font-medium)",
  color: "var(--color-text-secondary)",
  marginBottom: "var(--space-1)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
  outline: "none",
  boxSizing: "border-box",
};

const errorInputStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: "#EF4444",
};

const errorTextStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "#EF4444",
  marginTop: "2px",
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
};

export function MappingForm({ catalogItems, onSubmit, onCancel, loading }: Props) {
  const [form, setForm] = useState<MappingFormData>({
    catalog_item_id: "",
    external_code: "",
    external_name: "",
    external_unit: "",
    is_preferred: false,
    valid_from: "",
    valid_to: "",
    notes: "",
  });

  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateMappingForm(form);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onSubmit(form);
  };

  const update = (field: keyof MappingFormData, value: string | boolean) => {
    setForm((s) => ({ ...s, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={sectionStyle}>
        <div style={{ marginBottom: "var(--space-4)" }}>
          <label style={labelStyle}>
            Item do Catálogo <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <select
            value={form.catalog_item_id}
            onChange={(e) => update("catalog_item_id", e.target.value)}
            style={getFieldError(errors, "catalog_item_id") ? { ...errorInputStyle, backgroundColor: "#fff" } : { ...inputStyle, backgroundColor: "#fff" }}
          >
            <option value="">Selecione um item do catálogo...</option>
            {catalogItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} — {item.name}
              </option>
            ))}
          </select>
          {getFieldError(errors, "catalog_item_id") && <p style={errorTextStyle}>{getFieldError(errors, "catalog_item_id")}</p>}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={labelStyle}>Código Externo</label>
            <input
              type="text"
              value={form.external_code}
              onChange={(e) => update("external_code", e.target.value)}
              placeholder="Código do fornecedor"
              maxLength={100}
              style={getFieldError(errors, "external_code") ? errorInputStyle : inputStyle}
            />
            {getFieldError(errors, "external_code") && <p style={errorTextStyle}>{getFieldError(errors, "external_code")}</p>}
          </div>

          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={labelStyle}>
              Descrição Externa <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text"
              value={form.external_name}
              onChange={(e) => update("external_name", e.target.value)}
              placeholder="Nome conforme fornecedor"
              maxLength={255}
              style={getFieldError(errors, "external_name") ? errorInputStyle : inputStyle}
            />
            {getFieldError(errors, "external_name") && <p style={errorTextStyle}>{getFieldError(errors, "external_name")}</p>}
          </div>

          <div style={{ flex: 1, minWidth: "150px" }}>
            <label style={labelStyle}>Unidade Externa</label>
            <input
              type="text"
              value={form.external_unit}
              onChange={(e) => update("external_unit", e.target.value)}
              placeholder="Unidade"
              maxLength={50}
              style={getFieldError(errors, "external_unit") ? errorInputStyle : inputStyle}
            />
            {getFieldError(errors, "external_unit") && <p style={errorTextStyle}>{getFieldError(errors, "external_unit")}</p>}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", marginBottom: "var(--space-4)", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={labelStyle}>Vigência Início</label>
            <input
              type="date"
              value={form.valid_from}
              onChange={(e) => update("valid_from", e.target.value)}
              style={getFieldError(errors, "valid_from") ? errorInputStyle : inputStyle}
            />
            {getFieldError(errors, "valid_from") && <p style={errorTextStyle}>{getFieldError(errors, "valid_from")}</p>}
          </div>

          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={labelStyle}>Vigência Fim</label>
            <input
              type="date"
              value={form.valid_to}
              onChange={(e) => update("valid_to", e.target.value)}
              style={getFieldError(errors, "valid_to") ? errorInputStyle : inputStyle}
            />
            {getFieldError(errors, "valid_to") && <p style={errorTextStyle}>{getFieldError(errors, "valid_to")}</p>}
          </div>

          <div style={{ paddingBottom: "var(--space-2)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.is_preferred}
                onChange={(e) => update("is_preferred", e.target.checked)}
              />
              Preferencial
            </label>
          </div>
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={labelStyle}>Observações</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Observações sobre o mapeamento..."
            maxLength={2000}
            rows={3}
            style={{
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          {getFieldError(errors, "notes") && <p style={errorTextStyle}>{getFieldError(errors, "notes")}</p>}
        </div>
      </div>

      <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-4)" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            cursor: loading ? "default" : "pointer",
            fontSize: "var(--text-sm)",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: loading ? "default" : "pointer",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Salvando..." : "Salvar Mapeamento"}
        </button>
      </div>
    </form>
  );
}
