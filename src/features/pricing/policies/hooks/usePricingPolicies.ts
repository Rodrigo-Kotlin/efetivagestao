import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/core/useAuth";
import {
  fetchPricingPolicies,
  fetchPricingPolicy,
  fetchPricingPolicyVersion,
  runPricingPolicyWorkflowAction,
  simulatePrice,
} from "../api/policies";
import type {
  PricingPolicy,
  PricingPolicyVersionDetail,
  PricingPolicyWithVersions,
  SimulationInput,
  SimulationResult,
} from "../types/pricing-policy.types";

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface UsePricingPoliciesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  scopeType?: string;
  status?: string;
}

export function usePricingPolicies(params: UsePricingPoliciesParams = {}) {
  const { activeOrganization } = useAuth();
  const [result, setResult] = useState<PaginatedResult<PricingPolicy>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;
  const { page, pageSize, search, scopeType, status } = params;

  const load = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPricingPolicies({
        orgId,
        page,
        pageSize,
        search,
        scopeType,
        status,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [orgId, page, pageSize, search, scopeType, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...result, loading, error, refetch: load };
}

export function usePricingPolicy(id: string | null) {
  const { activeOrganization } = useAuth();
  const [policy, setPolicy] = useState<PricingPolicyWithVersions | null>(null);
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
      const data = await fetchPricingPolicy(id, orgId);
      setPolicy(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [id, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { policy, loading, error, refetch: load };
}

export function usePricingPolicyVersion(id: string | null) {
  const { activeOrganization } = useAuth();
  const [version, setVersion] = useState<PricingPolicyVersionDetail | null>(null);
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
      const data = await fetchPricingPolicyVersion(id, orgId);
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

export function usePricingPolicyWorkflow() {
  const { activeOrganization } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;

  const run = useCallback(
    async (kind: "submit" | "approve" | "return_to_draft" | "cancel" | "publish", versionId: string) => {
      if (!orgId) {
        setError("Nenhuma organização ativa.");
        return false;
      }

      setPending(true);
      setError(null);

      try {
        await runPricingPolicyWorkflowAction(kind, { versionId, orgId });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        return false;
      } finally {
        setPending(false);
      }
    },
    [orgId]
  );

  return { run, pending, error, clearError: () => setError(null) };
}

export function usePriceSimulator() {
  const { activeOrganization } = useAuth();
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;

  const run = useCallback(
    async (input: SimulationInput) => {
      if (!orgId) {
        setError("Nenhuma organização ativa.");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await simulatePrice({
          orgId,
          supplierCompanyId: input.supplier_company_id,
          catalogItemId: input.catalog_item_id,
          referenceDate: input.reference_date,
          discountRate: input.discount_rate ? parseFloat(input.discount_rate) : null,
        });
        setResult(data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [orgId]
  );

  return { result, loading, error, run, clear: () => setResult(null) };
}