// ============================================================
// Client Pricing — hooks (list + detail + workflows).
// Conventions mirror src/features/pricing/commercial/hooks/.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/core/useAuth";
import {
  fetchClientProfiles,
  fetchClientProfile,
  fetchClientCompany,
  fetchClientAssignments,
  fetchClientOverrides,
  submitAssignment,
  returnAssignmentToDraft,
  approveAssignment,
  cancelAssignment,
  publishAssignment,
  submitOverride,
  returnOverrideToDraft,
  approveOverride,
  cancelOverride,
  publishOverride,
} from "../api/clientPrices";
import type {
  ClientWithCompany,
  ClientProfile,
  ClientAssignment,
  ClientOverride,
} from "../types/client.types";

interface UseClientListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

interface UseClientListResult {
  data: ClientWithCompany[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useClientList(
  params: UseClientListParams = {}
): UseClientListResult {
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;

  const [result, setResult] = useState<Omit<UseClientListResult, "refetch">>({
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
      const pageData = await fetchClientProfiles({
        orgId,
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
      });

      let clients: ClientWithCompany[] = pageData.data.map((p: ClientProfile) => ({
        ...p,
      }));

      // Company enrichment requires core.company.view (RBAC-gated).
      if (can("core.company.view") && clients.length > 0) {
        const companies = await Promise.all(
          clients.map((c) => fetchClientCompany(c.company_id).catch(() => null))
        );
        clients = clients.map((c, i) => ({ ...c, company: companies[i] }));
      }

      // Assignment/override counts per client — single parallel pass.
      const companyIds = clients.map((c) => c.company_id);
      const assignmentCounts = new Map<string, number>();
      const overrideCounts = new Map<string, number>();

      if (companyIds.length > 0) {
        const [assignmentsRes, overridesRes] = await Promise.all([
          supabase
            .from("client_commercial_table_assignments")
            .select("client_company_id")
            .eq("organization_id", orgId)
            .in("client_company_id", companyIds),
          supabase
            .from("client_price_overrides")
            .select("client_company_id")
            .eq("organization_id", orgId)
            .in("client_company_id", companyIds),
        ]);

        for (const row of (assignmentsRes.data ?? []) as {
          client_company_id: string;
        }[]) {
          assignmentCounts.set(
            row.client_company_id,
            (assignmentCounts.get(row.client_company_id) ?? 0) + 1
          );
        }
        for (const row of (overridesRes.data ?? []) as {
          client_company_id: string;
        }[]) {
          overrideCounts.set(
            row.client_company_id,
            (overrideCounts.get(row.client_company_id) ?? 0) + 1
          );
        }
      }

      clients = clients.map((c) => ({
        ...c,
        assignment_count: assignmentCounts.get(c.company_id) ?? 0,
        override_count: overrideCounts.get(c.company_id) ?? 0,
      }));

      setResult({
        data: clients,
        total: pageData.total,
        page: pageData.page,
        pageSize: pageData.pageSize,
        totalPages: pageData.totalPages,
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
  }, [orgId, can, params.page, params.pageSize, params.search, params.status]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...result, refetch: load };
}

export function useClientDetail(companyId: string | null) {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [overrides, setOverrides] = useState<ClientOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId || !companyId) return;
    setLoading(true);
    setError(null);
    try {
      const [profile, a, o] = await Promise.all([
        fetchClientProfile(companyId, orgId),
        fetchClientAssignments({ clientCompanyId: companyId, orgId }),
        fetchClientOverrides({ clientCompanyId: companyId, orgId }),
      ]);
      setClient(profile);
      setAssignments(a);
      setOverrides(o);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [orgId, companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { client, assignments, overrides, loading, error, refetch: load };
}

type ClientWorkflowActionString =
  | "submit"
  | "return_to_draft"
  | "approve"
  | "publish"
  | "cancel";

interface UseClientAssignmentWorkflowResult {
  run: (action: ClientWorkflowActionString, assignmentId: string) => Promise<boolean>;
  pending: boolean;
  error: string | null;
  clearError: () => void;
}

export function useClientAssignmentWorkflow(): UseClientAssignmentWorkflowResult {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (
      action: ClientWorkflowActionString,
      assignmentId: string
    ): Promise<boolean> => {
      setPending(true);
      setError(null);
      try {
        if (action === "submit") await submitAssignment(assignmentId);
        else if (action === "return_to_draft")
          await returnAssignmentToDraft(assignmentId);
        else if (action === "approve") await approveAssignment(assignmentId);
        else if (action === "cancel") await cancelAssignment(assignmentId);
        else if (action === "publish") await publishAssignment(assignmentId);
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Falha ao executar ação de workflow da atribuição"
        );
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

interface UseClientOverrideWorkflowResult {
  run: (action: ClientWorkflowActionString, overrideId: string) => Promise<boolean>;
  pending: boolean;
  error: string | null;
  clearError: () => void;
}

export function useClientOverrideWorkflow(): UseClientOverrideWorkflowResult {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (
      action: ClientWorkflowActionString,
      overrideId: string
    ): Promise<boolean> => {
      setPending(true);
      setError(null);
      try {
        if (action === "submit") await submitOverride(overrideId);
        else if (action === "return_to_draft")
          await returnOverrideToDraft(overrideId);
        else if (action === "approve") await approveOverride(overrideId);
        else if (action === "cancel") await cancelOverride(overrideId);
        else if (action === "publish") await publishOverride(overrideId);
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Falha ao executar ação de workflow do preço específico"
        );
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
