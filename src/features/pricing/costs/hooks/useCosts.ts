import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/core/useAuth";
import {
  fetchCostTables,
  fetchCostTable,
  fetchCostTableVersion,
  fetchCostAuditLogs,
} from "../api/costs";
import type {
  CostTableWithSupplier,
  CostTableVersionWithItems,
  AuditLog,
} from "@/types";

interface UseCostTablesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  supplierCompanyId?: string;
  status?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useCostTables(params: UseCostTablesParams = {}) {
  const { activeOrganization } = useAuth();
  const [result, setResult] = useState<PaginatedResult<CostTableWithSupplier>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;
  const { page, pageSize, search, supplierCompanyId, status } = params;

  const load = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCostTables({
        orgId,
        page,
        pageSize,
        search,
        supplierCompanyId,
        status,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [orgId, page, pageSize, search, supplierCompanyId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...result, loading, error, refetch: load };
}

export function useCostTable(id: string | null) {
  const { activeOrganization } = useAuth();
  const [costTable, setCostTable] = useState<CostTableWithSupplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;

  const load = useCallback(async () => {
    if (!id || !orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCostTable(id, orgId);
      setCostTable(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [id, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { costTable, loading, error, refetch: load };
}

export function useCostTableVersion(id: string | null) {
  const { activeOrganization } = useAuth();
  const [version, setVersion] = useState<CostTableVersionWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;

  const load = useCallback(async () => {
    if (!id || !orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCostTableVersion(id, orgId);
      setVersion(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [id, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { version, loading, error, refetch: load };
}

export function useCostAuditLogs(entityId: string | null) {
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

    fetchCostAuditLogs(entityId, orgId)
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
