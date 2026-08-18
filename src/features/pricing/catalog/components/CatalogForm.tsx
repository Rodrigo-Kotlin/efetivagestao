import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { useCategories } from "../hooks/useCategories";
import { useCatalogMutations } from "../hooks/useCatalog";
import { validateCatalogItem, getFieldError, type CatalogItemFormData } from "../schemas/validation";
import { ITEM_TYPES, EXECUTION_TYPES, COMMERCIAL_UNITS } from "@/types";
import type { CatalogItem } from "@/types";

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
    if (!canEdit) {
      navigate("/pricing/catalog");
    }
  }, [canEdit, navigate]);

  const handleChange = (field: keyof CatalogItemFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => prev.filter((e) => e.field !== field));
  };

  const checkForDuplicates = async () => {
    if (!form.name.trim()) return;

    try {
      const result = await checkDuplicate({
        name: form.name,
        excludeId: initialData?.id,
      });

      if (result.name_match) {
        setDuplicateWarning("Já existe um item com nome semelhante neste catálogo.");
      } else if (result.similar_items.length > 0) {
        setDuplicateWarning(
          `Existem itens com nomes similares: ${result.similar_items.map((i) => i.code).join(", ")}`
        );
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // Ignore duplicate check errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateCatalogItem(form);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

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
    width: "100%",
    padding: "var(--space-2) var(--space-3)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--text-sm)",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "var(--text-sm)",
    fontWeight: "var(--font-medium)",
    color: "var(--color-text)",
    marginBottom: "var(--space-1)",
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-4)" }}>
          {mode === "create" ? "Novo Item" : "Editar Item"}
        </h2>

        {submitError && (
          <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-4)", color: "#991B1B", fontSize: "var(--text-sm)" }}>
            {submitError}
          </div>
        )}

        {duplicateWarning && (
          <div style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-4)", color: "#92400E", fontSize: "var(--text-sm)" }}>
            {duplicateWarning}
          </div>
        )}

        {/* Identificação */}
        <fieldset style={{ border: "none", padding: 0, marginBottom: "var(--space-6)" }}>
          <legend style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-3)", color: "var(--color-text)" }}>
            Identificação
          </legend>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
            <div>
              <label htmlFor="item_type" style={labelStyle}>Tipo *</label>
              <select
                id="item_type"
                value={form.item_type}
                onChange={(e) => handleChange("item_type", e.target.value)}
                style={{ ...inputStyle, borderColor: getFieldError(errors, "item_type") ? "#DC2626" : undefined }}
              >
                <option value="">Selecione...</option>
                {ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {getFieldError(errors, "item_type") && (
                <p style={{ color: "#DC2626", fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>{getFieldError(errors, "item_type")}</p>
              )}
            </div>

            <div>
              <label htmlFor="name" style={labelStyle}>Nome *</label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => void checkForDuplicates()}
                style={{ ...inputStyle, borderColor: getFieldError(errors, "name") ? "#DC2626" : undefined }}
                maxLength={255}
              />
              {getFieldError(errors, "name") && (
                <p style={{ color: "#DC2626", fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>{getFieldError(errors, "name")}</p>
              )}
            </div>

            <div>
              <label htmlFor="short_name" style={labelStyle}>Nome Reduzido</label>
              <input
                id="short_name"
                type="text"
                value={form.short_name}
                onChange={(e) => handleChange("short_name", e.target.value)}
                style={inputStyle}
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="category_id" style={labelStyle}>Categoria</label>
              <select
                id="category_id"
                value={form.category_id}
                onChange={(e) => handleChange("category_id", e.target.value)}
                style={inputStyle}
                disabled={categoriesLoading}
              >
                <option value="">Nenhuma</option>
                {categories.filter((c) => c.is_active).map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="commercial_unit" style={labelStyle}>Unidade Comercial *</label>
              <select
                id="commercial_unit"
                value={form.commercial_unit}
                onChange={(e) => handleChange("commercial_unit", e.target.value)}
                style={{ ...inputStyle, borderColor: getFieldError(errors, "commercial_unit") ? "#DC2626" : undefined }}
              >
                <option value="">Selecione...</option>
                {COMMERCIAL_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
              {getFieldError(errors, "commercial_unit") && (
                <p style={{ color: "#DC2626", fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>{getFieldError(errors, "commercial_unit")}</p>
              )}
            </div>

            <div>
              <label htmlFor="execution_type" style={labelStyle}>Execução *</label>
              <select
                id="execution_type"
                value={form.execution_type}
                onChange={(e) => handleChange("execution_type", e.target.value)}
                style={{ ...inputStyle, borderColor: getFieldError(errors, "execution_type") ? "#DC2626" : undefined }}
              >
                <option value="">Selecione...</option>
                {EXECUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {getFieldError(errors, "execution_type") && (
                <p style={{ color: "#DC2626", fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>{getFieldError(errors, "execution_type")}</p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Legado */}
        <fieldset style={{ border: "none", padding: 0, marginBottom: "var(--space-6)" }}>
          <legend style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-3)", color: "var(--color-text)" }}>
            Legado
          </legend>

          <div style={{ maxWidth: "300px" }}>
            <label htmlFor="legacy_code" style={labelStyle}>Código Legado</label>
            <input
              id="legacy_code"
              type="text"
              value={form.legacy_code}
              onChange={(e) => handleChange("legacy_code", e.target.value)}
              style={inputStyle}
              maxLength={50}
            />
          </div>
        </fieldset>

        {/* Informações adicionais */}
        <fieldset style={{ border: "none", padding: 0, marginBottom: "var(--space-6)" }}>
          <legend style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-3)", color: "var(--color-text)" }}>
            Informações Adicionais
          </legend>

          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            <div>
              <label htmlFor="description" style={labelStyle}>Descrição</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                maxLength={2000}
              />
            </div>

            <div>
              <label htmlFor="notes" style={labelStyle}>Observações</label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
                maxLength={2000}
              />
            </div>
          </div>
        </fieldset>

        {/* Actions */}
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => navigate(initialData ? `/pricing/catalog/${initialData.id}` : "/pricing/catalog")}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--color-primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
            }}
          >
            {submitting ? "Salvando..." : mode === "create" ? "Criar Item" : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </form>
  );
}
