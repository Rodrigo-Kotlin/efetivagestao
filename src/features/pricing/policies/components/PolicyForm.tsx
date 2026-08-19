import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/core/useAuth";
import { POLICY_SCOPE_TYPES } from "../types/pricing-policy.types";
import type { PricingPolicyScopeType } from "../types/pricing-policy.types";
import { fetchCatalogCategoriesForSelector, fetchCatalogItemsForSelector } from "../api/policies";
import { normalizePolicyCode } from "../schemas/validation";
import type { CatalogCategory, CatalogItem } from "@/types";

interface Props {
  initialData?: {
    code: string;
    name: string;
    description: string;
    scopeType: PricingPolicyScopeType;
    catalogCategoryId?: string;
    catalogItemId?: string;
  };
  onSubmit: (data: {
    code: string;
    name: string;
    description: string;
    scopeType: PricingPolicyScopeType;
    catalogCategoryId?: string;
    catalogItemId?: string;
  }) => void;
  onCancel: () => void;
  submitLabel?: string;
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

// UI-FORM01: default scope needs no category/item; category/item do.

export function PolicyForm({ initialData, onSubmit, onCancel, submitLabel = "Criar Política" }: Props) {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  const [code, setCode] = useState(initialData?.code ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [scopeType, setScopeType] = useState<PricingPolicyScopeType | "">(initialData?.scopeType ?? "");
  const [catalogCategoryId, setCatalogCategoryId] = useState(initialData?.catalogCategoryId ?? "");
  const [catalogItemId, setCatalogItemId] = useState(initialData?.catalogItemId ?? "");

  const [categorySearch, setCategorySearch] = useState("");
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [itemSearch, setItemSearch] = useState("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    if (!orgId || scopeType !== "category") return;
    setCategoriesLoading(true);
    try {
      const data = await fetchCatalogCategoriesForSelector({ orgId, search: categorySearch });
      setCategories(data);
    } catch {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, [orgId, scopeType, categorySearch]);

  const loadItems = useCallback(async () => {
    if (!orgId || scopeType !== "catalog_item") return;
    setItemsLoading(true);
    try {
      const data = await fetchCatalogItemsForSelector({ orgId, search: itemSearch });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, [orgId, scopeType, itemSearch]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  // UI-FORM02: switching scope clears the now-irrelevant selector.
  const handleScopeChange = (value: PricingPolicyScopeType) => {
    setScopeType(value);
    setCatalogCategoryId("");
    setCatalogItemId("");
  };

  const handleSubmit = () => {
    setError(null);

    if (!code.trim()) {
      setError("Informe um código para a política.");
      return;
    }

    if (!name.trim()) {
      setError("Informe um nome para a política.");
      return;
    }

    if (!scopeType) {
      setError("Selecione o escopo da política.");
      return;
    }

    // UI-FORM01: default scope needs no target; category/item do.
    if (scopeType === "category" && !catalogCategoryId) {
      setError("Selecione a categoria do catálogo para o escopo de categoria.");
      return;
    }

    if (scopeType === "catalog_item" && !catalogItemId) {
      setError("Selecione o item do catálogo para o escopo de item.");
      return;
    }

    onSubmit({
      code: normalizePolicyCode(code),
      name: name.trim(),
      description: description.trim(),
      scopeType,
      catalogCategoryId: scopeType === "category" ? catalogCategoryId : undefined,
      catalogItemId: scopeType === "catalog_item" ? catalogItemId : undefined,
    });
  };

  return (
    <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)" }}>
      <div style={{ marginBottom: "var(--space-4)" }}>
        <label style={labelStyle}>Código *</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ex.: POL-PADRAO"
          style={inputStyle}
          aria-label="Código da política"
        />
      </div>

      <div style={{ marginBottom: "var(--space-4)" }}>
        <label style={labelStyle}>Nome *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Política padrão de margem"
          style={inputStyle}
          aria-label="Nome da política"
        />
      </div>

      <div style={{ marginBottom: "var(--space-4)" }}>
        <label style={labelStyle}>Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          aria-label="Descrição da política"
        />
      </div>

      <div style={{ marginBottom: "var(--space-4)" }}>
        <label style={labelStyle}>Escopo *</label>
        <select
          value={scopeType}
          onChange={(e) => handleScopeChange(e.target.value as PricingPolicyScopeType)}
          style={inputStyle}
          aria-label="Escopo da política"
        >
          <option value="">Selecione o escopo...</option>
          {POLICY_SCOPE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {scopeType === "category" && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <label style={labelStyle}>Categoria do catálogo *</label>
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Buscar categoria..."
              style={inputStyle}
              aria-label="Buscar categoria do catálogo"
            />
            <button
              type="button"
              onClick={() => void loadCategories()}
              style={{
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Buscar
            </button>
          </div>
          <select
            value={catalogCategoryId}
            onChange={(e) => setCatalogCategoryId(e.target.value)}
            style={inputStyle}
            aria-label="Selecionar categoria do catálogo"
          >
            <option value="">Selecione a categoria...</option>
            {categoriesLoading ? (
              <option disabled>Carregando...</option>
            ) : (
              categories.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))
            )}
          </select>
        </div>
      )}

      {scopeType === "catalog_item" && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <label style={labelStyle}>Item do catálogo *</label>
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Buscar item..."
              style={inputStyle}
              aria-label="Buscar item do catálogo"
            />
            <button
              type="button"
              onClick={() => void loadItems()}
              style={{
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Buscar
            </button>
          </div>
          <select
            value={catalogItemId}
            onChange={(e) => setCatalogItemId(e.target.value)}
            style={inputStyle}
            aria-label="Selecionar item do catálogo"
          >
            <option value="">Selecione o item...</option>
            {itemsLoading ? (
              <option disabled>Carregando...</option>
            ) : (
              items.map((i) => (
                <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
              ))
            )}
          </select>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
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
          type="button"
          onClick={handleSubmit}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
          }}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}