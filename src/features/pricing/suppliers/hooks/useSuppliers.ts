import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/core/useAuth";
import {
  fetchSuppliers,
  fetchSupplier,
  fetchSupplierStats,
  fetchSupplierMappings,
  fetchSupplierAuditLogs,
  fetchCatalogItemsForSelector,
} from "../api/suppliers";
import type {
  SupplierWithCompany,
  SupplierMappingWithCatalogItem,
  SupplierStats,
  CatalogItem,
  AuditLog,
} from "@/types";

interface UseSuppliersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  status?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useSuppliers(params: UseSuppliersParams = {}) {
  const { activeOrganization } = useAuth();
  const [result, setResult] = useState<PaginatedResult<SupplierWithCompany>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;
  const { page, pageSize, search, category, status } = params;

  const load = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchSuppliers({
        orgId,
        page,
        pageSize,
        search,
        category,
        status,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [orgId, page, pageSize, search, category, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...result, loading, error, refetch: load };
}

export function useSupplier(companyId: string | null) {
  const { activeOrganization } = useAuth();
  const [supplier, setSupplier] = useState<SupplierWithCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;

  useEffect(() => {
    if (!companyId || !orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchSupplier(companyId, orgId)
      .then((data) => {
        if (!cancelled) setSupplier(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [companyId, orgId]);

  return { supplier, loading, error };
}

export function useSupplierMappings(supplierCompanyId: string | null, params: UseSuppliersParams = {}) {
  const { activeOrganization } = useAuth();
  const [result, setResult] = useState<PaginatedResult<SupplierMappingWithCatalogItem>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;
  const { page, pageSize, search, status } = params;

  const load = useCallback(async () => {
    if (!orgId || !supplierCompanyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchSupplierMappings({
        orgId,
        supplierCompanyId,
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

export function useSupplierStats() {
  const { activeOrganization } = useAuth();
  const [stats, setStats] = useState<SupplierStats>({
    total_active: 0,
    total_inactive: 0,
    total_blocked: 0,
    total_mappings_active: 0,
    items_without_supplier: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;

  useEffect(() => {
    if (!orgId) return;

    let cancelled = false;

    fetchSupplierStats(orgId)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [orgId]);

  return { stats, loading, error };
}

export function useSupplierAuditLogs(entityId: string | null) {
  const { activeOrganization } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;

  useEffect(() => {
    if (!entityId || !orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchSupplierAuditLogs(entityId, orgId)
      .then((data) => {
        if (!cancelled) setLogs(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [entityId, orgId]);

  return { logs, loading, error };
}

export function useCatalogItemsSelector(search?: string) {
  const { activeOrganization } = useAuth();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const orgId = activeOrganization?.id;

  useEffect(() => {
    if (!orgId) return;

    let cancelled = false;
    setLoading(true);

    fetchCatalogItemsForSelector(orgId, search)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [orgId, search]);

  return { items, loading };
}
