import { useState } from "react";
import type { CatalogItem } from "@/types";
import { validateMappingForm, getFieldError, type MappingFormData } from "../schemas/validation";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormActions } from "@/components/ui/FormActions";
import { InlineError } from "@/components/ui/InlineError";

interface Props {
  catalogItems: CatalogItem[];
  onSubmit: (data: MappingFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "var(--spacing-2) var(--spacing-3)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--font-size-sm)",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "var(--font-size-sm)",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    marginBottom: "var(--spacing-1)",
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-6)" }}>
        <FormSection title="Mapeamento">
          <div style={{ marginBottom: "var(--spacing-4)" }}>
            <label style={labelStyle}>Item do Catalogo <span style={{ color: "var(--color-negative)" }}>*</span></label>
            <select
              value={form.catalog_item_id}
              onChange={(e) => update("catalog_item_id", e.target.value)}
              style={{ ...inputStyle, backgroundColor: "#fff" }}
            >
              <option value="">Selecione um item do catalogo...</option>
              {catalogItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
            {getFieldError(errors, "catalog_item_id") && <InlineError>{getFieldError(errors, "catalog_item_id")}</InlineError>}
          </div>

          <FieldGroup columns={2}>
            <div>
              <label style={labelStyle}>Codigo Externo</label>
              <input
                type="text"
                value={form.external_code}
                onChange={(e) => update("external_code", e.target.value)}
                placeholder="Codigo do fornecedor"
                maxLength={100}
                style={inputStyle}
              />
              {getFieldError(errors, "external_code") && <InlineError>{getFieldError(errors, "external_code")}</InlineError>}
            </div>
            <div>
              <label style={labelStyle}>Descricao Externa <span style={{ color: "var(--color-negative)" }}>*</span></label>
              <input
                type="text"
                value={form.external_name}
                onChange={(e) => update("external_name", e.target.value)}
                placeholder="Nome conforme fornecedor"
                maxLength={255}
                style={inputStyle}
              />
              {getFieldError(errors, "external_name") && <InlineError>{getFieldError(errors, "external_name")}</InlineError>}
            </div>
            <div>
              <label style={labelStyle}>Unidade Externa</label>
              <input
                type="text"
                value={form.external_unit}
                onChange={(e) => update("external_unit", e.target.value)}
                placeholder="Unidade"
                maxLength={50}
                style={inputStyle}
              />
              {getFieldError(errors, "external_unit") && <InlineError>{getFieldError(errors, "external_unit")}</InlineError>}
            </div>
          </FieldGroup>

          <FieldGroup columns={2}>
            <div>
              <label style={labelStyle}>Vigencia Inicio</label>
              <input
                type="date"
                value={form.valid_from}
                onChange={(e) => update("valid_from", e.target.value)}
                style={inputStyle}
              />
              {getFieldError(errors, "valid_from") && <InlineError>{getFieldError(errors, "valid_from")}</InlineError>}
            </div>
            <div>
              <label style={labelStyle}>Vigencia Fim</label>
              <input
                type="date"
                value={form.valid_to}
                onChange={(e) => update("valid_to", e.target.value)}
                style={inputStyle}
              />
              {getFieldError(errors, "valid_to") && <InlineError>{getFieldError(errors, "valid_to")}</InlineError>}
            </div>
          </FieldGroup>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)", paddingTop: "var(--spacing-2)" }}>
            <input
              type="checkbox"
              id="is_preferred"
              checked={form.is_preferred}
              onChange={(e) => update("is_preferred", e.target.checked)}
            />
            <label htmlFor="is_preferred" style={{ fontSize: "var(--font-size-sm)", cursor: "pointer" }}>
              Preferencial
            </label>
          </div>

          <div>
            <label style={labelStyle}>Observacoes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Observacoes sobre o mapeamento..."
              maxLength={2000}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            {getFieldError(errors, "notes") && <InlineError>{getFieldError(errors, "notes")}</InlineError>}
          </div>
        </FormSection>
      </div>

      <FormActions>
        <Button variant="outlined" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button type="submit" variant="filled" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Mapeamento"}
        </Button>
      </FormActions>
    </form>
  );
}
