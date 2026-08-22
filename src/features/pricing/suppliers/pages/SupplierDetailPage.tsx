import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fetchSupplier, fetchSupplierMappings, updateSupplierStatus, setPreferredMapping, deactivateSupplierMapping } from "../api/suppliers";
import { SupplierDetail } from "../components/SupplierDetail";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { SupplierWithCompany, SupplierMappingWithCatalogItem } from "@/types";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { activeOrganization, user } = useAuth();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<SupplierWithCompany | null>(null);
  const [mappings, setMappings] = useState<SupplierMappingWithCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!id || !orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [supplierData, mappingsData] = await Promise.all([
        fetchSupplier(id, orgId),
        fetchSupplierMappings({ orgId, supplierCompanyId: id }),
      ]);

      if (!supplierData) {
        setError("Fornecedor não encontrado");
      } else {
        setSupplier(supplierData);
        setMappings(mappingsData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar fornecedor");
    } finally {
      setLoading(false);
    }
  }, [id, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = async (action: string) => {
    if (!id || !orgId) return;

    try {
      if (action === "edit") {
        navigate(`/pricing/suppliers/${id}/edit`);
        return;
      }

      if (action === "block") {
        await updateSupplierStatus(id, "blocked", orgId, userId ?? "");
        await load();
        return;
      }

      if (action === "unblock") {
        await updateSupplierStatus(id, "active", orgId, userId ?? "");
        await load();
        return;
      }

      if (action === "inactivate") {
        await updateSupplierStatus(id, "inactive", orgId, userId ?? "");
        await load();
        return;
      }

      if (action.startsWith("preferred:")) {
        const mappingId = action.split(":")[1];
        if (!mappingId) return;
        await setPreferredMapping(mappingId, orgId);
        await load();
        return;
      }

      if (action.startsWith("inactivate_mapping:")) {
        const mappingId = action.split(":")[1];
        if (!mappingId) return;
        await deactivateSupplierMapping(mappingId, orgId, userId ?? "");
        await load();
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao executar ação");
    }
  };

  if (loading) {
    return (
      <PageContainer size="wide">
        <PageHeader
          title="Fornecedor"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Fornecedores", to: "/pricing/suppliers" },
            { label: "Carregando..." },
          ]}
        />
        <Spinner label="Carregando fornecedor..." />
      </PageContainer>
    );
  }

  if (error && !supplier) {
    return (
      <PageContainer size="wide">
        <PageHeader
          title="Fornecedor"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Fornecedores", to: "/pricing/suppliers" },
            { label: "Erro" },
          ]}
        />
        <Alert tone="negative" title={error}>
          <Button variant="outlined" onClick={() => navigate("/pricing/suppliers")}>
            Voltar
          </Button>
        </Alert>
      </PageContainer>
    );
  }

  if (!supplier) {
    return (
      <PageContainer size="wide">
        <PageHeader
          title="Fornecedor"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Fornecedores", to: "/pricing/suppliers" },
            { label: "Não encontrado" },
          ]}
        />
        <p style={{ color: "var(--color-text-secondary)" }}>Fornecedor não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title={supplier.company?.legal_name ?? "Fornecedor"}
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Fornecedores", to: "/pricing/suppliers" },
          { label: supplier.company?.legal_name ?? "Detalhe" },
        ]}
      />
      {error && <Alert tone="negative">{error}</Alert>}
      <SupplierDetail
        supplier={supplier}
        mappings={mappings}
        onAction={handleAction}
      />
    </PageContainer>
  );
}

export function SupplierDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
