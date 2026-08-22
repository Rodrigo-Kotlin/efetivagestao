import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { useCategories } from "../hooks/useCategories";
import { useCatalogMutations } from "../hooks/useCatalog";
import { validateCatalogItem, getFieldError, type CatalogItemFormData } from "../schemas/validation";
import { ITEM_TYPES, EXECUTION_TYPES, COMMERCIAL_UNITS } from "@/types";
import type { CatalogItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormActions } from "@/components/ui/FormActions";
import { InlineError } from "@/components/ui/InlineError";
import { FormAlert } from "@/components/ui/FormAlert";

interface CatalogFormProps {
  initialData?: CatalogItem;
  mode: "create" | "edit";
}

export function CatalogForm({ initialData, mode }: CatalogFormProps) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories();
  const { create, update, checkDuplicate } = useCatalogMutations();

  const [form, setForm] = useState<CatalogItemFormData>({
    item_type: (initialData?.item_type as CatalogItemFormData["item_type"]) ?? "",
    name: initialData?.name ?? "",
    short_name: initialData?.short_name ?? "",
    category_id: initialData?.category_id ?? "",
    commercial_unit: initialData?.commercial_unit ?? "",
    execution_type: (initialData?.execution_type as CatalogItemFormData["execution_type"]) ?? "",
    legacy_code: initialData?.legacy_code ?? "",
    description: initialData?.description ?? "",
    notes: initialData?.notes ?? "",
  });

  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canEdit = mode === "create" ? can("pricing.catalog.create") : can("pricing.catalog.edit");

  useEffect(() => {
    if (!canEdit) navigate("/pricing/catalog");
  }, [canEdit, navigate]);

  const handleChange = (field: keyof CatalogItemFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => prev.filter((e) => e.field !== field));
  };

  const checkForDuplicates = async () => {
    if (!form.name.trim()) return;
    try {
      const result = await checkDuplicate({ name: form.name, excludeId: initialData?.id });
      if (result.name_match) {
        setDuplicateWarning("Já existe um item com nome semelhante neste catálogo.");
      } else if (result.similar_items.length > 0) {
        setDuplicateWarning(`Existem itens com nomes similares: ${result.similar_items.map((i) => i.code).join(", ")}`);
      } else {
        setDuplicateWarning(null);
      }
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateCatalogItem(form);
    if (validationErrors.length > 0) { setErrors(validationErrors); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const data = {
        item_type: form.item_type,
        name: form.name.trim(),
        short_name: form.short_name.trim() || null,
        category_id: form.category_id || null,
        commercial_unit: form.commercial_unit,
        execution_type: form.execution_type,
        legacy_code: form.legacy_code.trim() || null,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        status: initialData?.status ?? "draft",
      };
      if (mode === "create") {
        const result = await create(data);
        navigate(`/pricing/catalog/${result.id}`);
      } else if (initialData) {
        await update(initialData.id, data);
        navigate(`/pricing/catalog/${initialData.id}`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao salvar item");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canEdit) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "var(--spacing-2) var(--spacing-3)",
    border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)",
    fontSize: "var(--font-size-sm)", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "var(--font-size-sm)", fontWeight: 500,
    marginBottom: "var(--spacing-1)",
  };
  const errStyle: React.CSSProperties = { ...inputStyle, borderColor: "var(--color-negative)" };

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      {submitError && <FormAlert tone="error">{submitError}</FormAlert>}
      {duplicateWarning && <FormAlert tone="warning">{duplicateWarning}</FormAlert>}

      <FormSection title="Identificação">
        <FieldGroup columns={2}>
          <div>
            <label style={labelStyle}>Tipo *</label>
            <select id="item_type" value={form.item_type} onChange={(e) => handleChange("item_type", e.target.value)} style={getFieldError(errors, "item_type") ? errStyle : inputStyle}>
              <option value="">Selecione...</option>
              {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {getFieldError(errors, "item_type") && <InlineError>{getFieldError(errors, "item_type")}</InlineError>}
          </div>
          <div>
            <label style={labelStyle}>Nome *</label>
            <input id="name" type="text" value={form.name} onChange={(e) => handleChange("name", e.target.value)} onBlur={() => void checkForDuplicates()} style={getFieldError(errors, "name") ? errStyle : inputStyle} maxLength={255} />
            {getFieldError(errors, "name") && <InlineError>{getFieldError(errors, "name")}</InlineError>}
          </div>
          <div>
            <label style={labelStyle}>Nome Reduzido</label>
            <input id="short_name" type="text" value={form.short_name} onChange={(e) => handleChange("short_name", e.target.value)} style={inputStyle} maxLength={100} />
          </div>
          <div>
            <label style={labelStyle}>Categoria</label>
            <select id="category_id" value={form.category_id} onChange={(e) => handleChange("category_id", e.target.value)} style={inputStyle} disabled={categoriesLoading}>
              <option value="">Nenhuma</option>
              {categories.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Unidade Comercial *</label>
            <select id="commercial_unit" value={form.commercial_unit} onChange={(e) => handleChange("commercial_unit", e.target.value)} style={getFieldError(errors, "commercial_unit") ? errStyle : inputStyle}>
              <option value="">Selecione...</option>
              {COMMERCIAL_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            {getFieldError(errors, "commercial_unit") && <InlineError>{getFieldError(errors, "commercial_unit")}</InlineError>}
          </div>
          <div>
            <label style={labelStyle}>Execução *</label>
            <select id="execution_type" value={form.execution_type} onChange={(e) => handleChange("execution_type", e.target.value)} style={getFieldError(errors, "execution_type") ? errStyle : inputStyle}>
              <option value="">Selecione...</option>
              {EXECUTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {getFieldError(errors, "execution_type") && <InlineError>{getFieldError(errors, "execution_type")}</InlineError>}
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Legado">
        <div style={{ maxWidth: 300 }}>
          <label style={labelStyle}>Código Legado</label>
          <input id="legacy_code" type="text" value={form.legacy_code} onChange={(e) => handleChange("legacy_code", e.target.value)} style={inputStyle} maxLength={50} />
        </div>
      </FormSection>

      <FormSection title="Informações Adicionais">
        <div>
          <label style={labelStyle}>Descrição</label>
          <textarea id="description" value={form.description} onChange={(e) => handleChange("description", e.target.value)} style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} maxLength={2000} />
        </div>
        <div>
          <label style={labelStyle}>Observações</label>
          <textarea id="notes" value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} maxLength={2000} />
        </div>
      </FormSection>

      <FormActions>
        <Button variant="outlined" onClick={() => navigate(initialData ? `/pricing/catalog/${initialData.id}` : "/pricing/catalog")}>
          Cancelar
        </Button>
        <Button type="submit" variant="filled" disabled={submitting}>
          {submitting ? "Salvando..." : mode === "create" ? "Criar Item" : "Salvar Alterações"}
        </Button>
      </FormActions>
    </form>
  );
}
