import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/core/useAuth";
import {
  fetchCatalogItems,
  fetchCatalogItem,
  fetchCatalogStats,
  createCatalogItem,
  updateCatalogItem,
  activateCatalogItem,
  deactivateCatalogItem,
  archiveCatalogItem,
  checkDuplicates,
} from "../api/catalog";
import type {
  CatalogItem,
  CatalogItemWithCategory,
  CatalogItemWithAliases,
  CatalogStats,
} from "@/types";

interface UseCatalogItemsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  itemType?: string;
  categoryId?: string;
  executionType?: string;
  status?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useCatalogItems(params: UseCatalogItemsParams = {}) {
  const { activeOrganization } = useAuth();
  const [result, setResult] = useState<PaginatedResult<CatalogItemWithCategory>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;
  const { page, pageSize, search, itemType, categoryId, executionType, status } = params;

  const load = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCatalogItems({
        orgId,
        page,
        pageSize,
        search,
        itemType,
        categoryId,
        executionType,
        status,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [orgId, page, pageSize, search, itemType, categoryId, executionType, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...result, loading, error, refetch: load };
}

export function useCatalogItem(id: string | null) {
  const { activeOrganization } = useAuth();
  const [item, setItem] = useState<CatalogItemWithAliases | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;

  useEffect(() => {
    if (!id || !orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchCatalogItem(id, orgId)
      .then((data) => {
        if (!cancelled) setItem(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, orgId]);

  return { item, loading, error };
}

export function useCatalogMutations() {
  const { activeOrganization, user } = useAuth();
  const orgId = activeOrganization?.id;
  const userId = user?.id;

  const create = useCallback(async (data: Omit<CatalogItem, "id" | "organization_id" | "code" | "created_by" | "created_at" | "updated_by" | "updated_at" | "activated_at" | "deactivated_at" | "archived_at" | "archived_by">) => {
    if (!orgId || !userId) throw new Error("Organização ou usuário não identificado");
    return createCatalogItem({ ...data, organization_id: orgId, created_by: userId, updated_by: userId }, orgId);
  }, [orgId, userId]);

  const update = useCallback(async (id: string, data: Omit<CatalogItem, "id" | "organization_id" | "code" | "created_by" | "created_at" | "updated_by" | "updated_at" | "activated_at" | "deactivated_at" | "archived_at" | "archived_by">) => {
    if (!orgId || !userId) throw new Error("Organização ou usuário não identificado");
    return updateCatalogItem(id, { ...data, updated_by: userId }, orgId);
  }, [orgId, userId]);

  const activate = useCallback(async (id: string) => {
    if (!orgId || !userId) throw new Error("Organização ou usuário não identificado");
    return activateCatalogItem(id, orgId, userId);
  }, [orgId, userId]);

  const deactivate = useCallback(async (id: string) => {
    if (!orgId || !userId) throw new Error("Organização ou usuário não identificado");
    return deactivateCatalogItem(id, orgId, userId);
  }, [orgId, userId]);

  const archive = useCallback(async (id: string) => {
    if (!orgId || !userId) throw new Error("Organização ou usuário não identificado");
    return archiveCatalogItem(id, orgId, userId);
  }, [orgId, userId]);

  const checkDuplicate = useCallback(async (params: { name?: string; code?: string; legacyCode?: string; excludeId?: string }) => {
    if (!orgId) throw new Error("Organização não identificada");
    return checkDuplicates(orgId, params);
  }, [orgId]);

  return { create, update, activate, deactivate, archive, checkDuplicate };
}

export function useCatalogStats() {
  const { activeOrganization } = useAuth();
  const [stats, setStats] = useState<CatalogStats>({
    total_active: 0,
    total_draft: 0,
    total_inactive: 0,
    total_categories: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;

  useEffect(() => {
    if (!orgId) return;

    let cancelled = false;

    fetchCatalogStats(orgId).then((data) => {
      if (!cancelled) setStats(data);
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Erro desconhecido");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [orgId]);

  return { stats, loading, error };
}
