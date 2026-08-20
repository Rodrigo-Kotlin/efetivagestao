// ============================================================
// Commercial Price Tables — hooks (read + workflow + resolver).
// Conventions mirror src/features/pricing/policies/hooks/.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/core/useAuth";
import {
  fetchCommercialTable,
  fetchCommercialTableVersions,
  fetchCommercialTables,
  fetchCommercialVersion,
  resolveCommercialPrice,
  submitCommercialVersion,
  returnCommercialVersionToDraft,
  approveCommercialVersion,
  cancelCommercialVersion,
  publishCommercialVersion,
  validateCommercialVersion,
} from "../api/commercialPrices";
import type {
  CommercialPriceResolverResult,
  CommercialPriceTable,
  CommercialPriceTableVersion,
  CommercialPriceTableWithCounts,
  CommercialPriceVersionDetail,
  CommercialWorkflowAction,
  PublishReadinessResult,
} from "../types/commercial.types";

interface UseTablesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

interface UseTablesResult {
  data: CommercialPriceTableWithCounts[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCommercialTables(
  params: UseTablesParams = {}
): UseTablesResult {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  const [result, setResult] = useState<Omit<UseTablesResult, "refetch">>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 0,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId) return;
    setResult((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchCommercialTables({
        orgId,
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
      });
      setResult({
        data: data.data,
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        totalPages: data.totalPages,
        loading: false,
        error: null,
      });
    } catch (err) {
      setResult((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      }));
    }
  }, [orgId, params.page, params.pageSize, params.search, params.status]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...result, refetch: load };
}

export function useCommercialTable(tableId: string | null) {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  const [table, setTable] = useState<CommercialPriceTableWithCounts | null>(null);
  const [versions, setVersions] = useState<CommercialPriceTableVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId || !tableId) return;
    setLoading(true);
    setError(null);
    try {
      const [t, v] = await Promise.all([
        fetchCommercialTable(tableId, orgId),
        fetchCommercialTableVersions(tableId, orgId),
      ]);
      setTable(t);
      setVersions(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [orgId, tableId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { table, versions, loading, error, refetch: load };
}

export function useCommercialVersion(versionId: string | null) {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  const [version, setVersion] = useState<CommercialPriceVersionDetail | null>(null);
  const [readiness, setReadiness] = useState<PublishReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId || !versionId) return;
    setLoading(true);
    setError(null);
    try {
      const [v, r] = await Promise.all([
        fetchCommercialVersion(versionId, orgId),
        validateCommercialVersion(versionId).catch(() => null),
      ]);
      setVersion(v);
      setReadiness(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [orgId, versionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refetchReadiness = useCallback(async () => {
    if (!versionId) return;
    const r = await validateCommercialVersion(versionId).catch(() => null);
    setReadiness(r);
  }, [versionId]);

  return { version, readiness, loading, error, refetch: load, refetchReadiness };
}

interface UseCommercialWorkflowResult {
  run: (action: CommercialWorkflowAction, versionId: string) => Promise<boolean>;
  pending: boolean;
  error: string | null;
  clearError: () => void;
}

export function useCommercialWorkflow(): UseCommercialWorkflowResult {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: CommercialWorkflowAction, versionId: string): Promise<boolean> => {
      setPending(true);
      setError(null);
      try {
        if (action === "submit") await submitCommercialVersion(versionId);
        else if (action === "return_to_draft")
          await returnCommercialVersionToDraft(versionId);
        else if (action === "approve") await approveCommercialVersion(versionId);
        else if (action === "cancel") await cancelCommercialVersion(versionId);
        else if (action === "publish") await publishCommercialVersion(versionId);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao executar ação de workflow");
        return false;
      } finally {
        setPending(false);
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, pending, error, clearError };
}

interface UseCommercialResolverParams {
  orgId: string | null | undefined;
  tableId: string | null;
  catalogItemId: string | null;
  referenceDate?: string | null;
}

interface UseCommercialResolverResult {
  result: CommercialPriceResolverResult | null;
  loading: boolean;
  error: string | null;
  run: () => Promise<void>;
}

export function useCommercialResolver(
  params: UseCommercialResolverParams
): UseCommercialResolverResult {
  const [result, setResult] = useState<CommercialPriceResolverResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!params.orgId || !params.tableId || !params.catalogItemId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await resolveCommercialPrice({
        orgId: params.orgId,
        tableId: params.tableId,
        catalogItemId: params.catalogItemId,
        referenceDate: params.referenceDate ?? undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [params.orgId, params.tableId, params.catalogItemId, params.referenceDate]);

  return { result, loading, error, run };
}

// ============================================================
// Helper: derive stable table status (UX only).
// ============================================================
export function describeTableStatus(status: CommercialPriceTable["status"]): string {
  return status === "active" ? "Ativa" : "Inativa";
}
