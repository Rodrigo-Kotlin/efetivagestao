import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/core/useAuth";
import {
  fetchCategoryTree,
  fetchCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
} from "../api/catalog";
import type { CatalogCategory, CatalogCategoryWithChildren } from "@/types";

export function useCategoryTree() {
  const { activeOrganization } = useAuth();
  const [tree, setTree] = useState<CatalogCategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;

  const load = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCategoryTree(orgId);
      setTree(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { tree, loading, error, refetch: load };
}

export function useCategories() {
  const { activeOrganization } = useAuth();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;

  const load = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCategories(orgId);
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { categories, loading, error, refetch: load };
}

export function useCategoryMutations() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  const create = useCallback(async (data: { code: string; name: string; description?: string; parent_id?: string; sort_order?: number }) => {
    if (!orgId) throw new Error("Organização não identificada");
    return createCategory({ ...data, organization_id: orgId }, orgId);
  }, [orgId]);

  const update = useCallback(async (id: string, data: { code?: string; name?: string; description?: string; parent_id?: string | null; sort_order?: number; is_active?: boolean }) => {
    if (!orgId) throw new Error("Organização não identificada");
    return updateCategory(id, data, orgId);
  }, [orgId]);

  const deactivate = useCallback(async (id: string) => {
    if (!orgId) throw new Error("Organização não identificada");
    return deactivateCategory(id, orgId);
  }, [orgId]);

  return { create, update, deactivate };
}
