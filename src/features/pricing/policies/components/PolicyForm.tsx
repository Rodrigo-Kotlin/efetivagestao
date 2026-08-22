import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/core/useAuth";
import { POLICY_SCOPE_TYPES } from "../types/pricing-policy.types";
import type { PricingPolicyScopeType } from "../types/pricing-policy.types";
import { fetchCatalogCategoriesForSelector, fetchCatalogItemsForSelector } from "../api/policies";
import { normalizePolicyCode } from "../schemas/validation";
import type { CatalogCategory, CatalogItem } from "@/types";
import { FormSection } from "@/components/ui/FormSection";
import { FormActions } from "@/components/ui/FormActions";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { Button } from "@/components/ui/Button";

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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      noValidate
    >
      <FormSection title="Dados da política">
        <TextField
          label="Código"
          required
          placeholder="Ex.: POL-PADRAO"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <TextField
          label="Nome"
          required
          placeholder="Ex.: Política padrão de margem"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Descrição"
          placeholder="Descrição opcional da política"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={3}
        />
        <Select
          label="Escopo"
          required
          value={scopeType}
          onChange={(e) => handleScopeChange(e.target.value as PricingPolicyScopeType)}
        >
          <option value="">Selecione o escopo...</option>
          {POLICY_SCOPE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </FormSection>

      {scopeType === "category" ? (
        <FormSection title="Categoria do catálogo" description="Defina a categoria do catálogo à qual esta política se aplica.">
          <TextField
            label="Buscar categoria"
            placeholder="Buscar categoria..."
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
          />
          <Select
            label="Categoria"
            required
            value={catalogCategoryId}
            onChange={(e) => setCatalogCategoryId(e.target.value)}
          >
            <option value="">Selecione a categoria...</option>
            {categoriesLoading ? (
              <option disabled>Carregando...</option>
            ) : (
              categories.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))
            )}
          </Select>
        </FormSection>
      ) : null}

      {scopeType === "catalog_item" ? (
        <FormSection title="Item do catálogo" description="Defina o item do catálogo ao qual esta política se aplica.">
          <TextField
            label="Buscar item"
            placeholder="Buscar item..."
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
          />
          <Select
            label="Item"
            required
            value={catalogItemId}
            onChange={(e) => setCatalogItemId(e.target.value)}
          >
            <option value="">Selecione o item...</option>
            {itemsLoading ? (
              <option disabled>Carregando...</option>
            ) : (
              items.map((i) => (
                <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
              ))
            )}
          </Select>
        </FormSection>
      ) : null}

      {error ? <FormAlert tone="error">{error}</FormAlert> : null}

      <FormActions>
        <Button variant="text" type="button" onClick={onCancel}>Cancelar</Button>
        <Button variant="filled" type="submit">{submitLabel}</Button>
      </FormActions>

      <FieldGroup hidden>
        <input type="hidden" />
      </FieldGroup>
    </form>
  );
}
