import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/core/useAuth";
import {
  fetchSupplierMappings,
  createSupplierMapping,
  updateSupplierMapping,
  setPreferredMapping,
  inactivateMapping,
  searchCatalogItems,
} from "../api/mappings";
import type { SupplierCatalogItem, SupplierCatalogItemInsert, CatalogItem } from "@/types";

// ============================================================
// List hook
// ============================================================

interface UseSupplierMappingsParams {
  supplierCompanyId: string | null;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface MappingWithCatalogItem extends SupplierCatalogItem {
  catalog_item: CatalogItem;
}

export function useSupplierMappings(params: UseSupplierMappingsParams) {
  const { activeOrganization } = useAuth();
  const [result, setResult] = useState<PaginatedResult<MappingWithCatalogItem>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;
  const { supplierCompanyId, page, pageSize, search, status } = params;

  const load = useCallback(async () => {
    if (!orgId || !supplierCompanyId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchSupplierMappings(supplierCompanyId, orgId, {
        orgId,
        page,
        pageSize,
        search,
        status,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [orgId, supplierCompanyId, page, pageSize, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...result, loading, error, refetch: load };
}

// ============================================================
// Catalog item search hook
// ============================================================

export function useCatalogItemSearch() {
  const { activeOrganization } = useAuth();
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const orgId = activeOrganization?.id;

  const search = useCallback(async (query: string) => {
    if (!orgId || !query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await searchCatalogItems(orgId, query);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const clear = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, search, clear };
}

// ============================================================
// Mutations hook
// ============================================================

export function useMappingMutations() {
  const { activeOrganization, user } = useAuth();
  const orgId = activeOrganization?.id;
  const userId = user?.id;

  const create = useCallback(async (data: Omit<SupplierCatalogItem, "id" | "organization_id" | "created_by" | "created_at" | "updated_by" | "updated_at" | "deactivated_at" | "is_preferred">) => {
    if (!orgId || !userId) throw new Error("Organização ou usuário não identificado");
    return createSupplierMapping({ ...data, organization_id: orgId, created_by: userId, updated_by: userId } as SupplierCatalogItemInsert, orgId, userId);
  }, [orgId, userId]);

  const update = useCallback(async (id: string, data: Omit<SupplierCatalogItem, "id" | "supplier_company_id" | "catalog_item_id" | "organization_id" | "created_by" | "created_at" | "updated_by" | "updated_at" | "deactivated_at" | "is_preferred">) => {
    if (!orgId || !userId) throw new Error("Organização ou usuário não identificado");
    return updateSupplierMapping(id, { ...data, updated_by: userId }, orgId, userId);
  }, [orgId, userId]);

  const setPreferred = useCallback(async (mappingId: string) => {
    if (!orgId || !userId) throw new Error("Organização ou usuário não identificado");
    return setPreferredMapping(mappingId, orgId, userId);
  }, [orgId, userId]);

  const inactivate = useCallback(async (id: string) => {
    if (!orgId || !userId) throw new Error("Organização ou usuário não identificado");
    return inactivateMapping(id, orgId, userId);
  }, [orgId, userId]);

  return { create, update, setPreferred, inactivate };
}
