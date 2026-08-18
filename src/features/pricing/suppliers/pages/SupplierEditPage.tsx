import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fetchSupplier, updateSupplier } from "../api/suppliers";
import { SupplierForm } from "../components/SupplierForm";
import type { SupplierWithCompany } from "@/types";
import type { CompanyFormData, SupplierProfileFormData } from "../schemas/validation";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { activeOrganization, user } = useAuth();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<SupplierWithCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
      const data = await fetchSupplier(id, orgId);
      if (!data) {
        setError("Fornecedor não encontrado");
      } else {
        setSupplier(data);
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

  const handleSubmit = async (data: { company: CompanyFormData; supplier: SupplierProfileFormData }) => {
    if (!id || !orgId || !userId) return;

    setSubmitting(true);
    setError(null);

    try {
      await updateSupplier(
        id,
        {
          legal_name: data.company.legal_name.trim(),
          trade_name: data.company.trade_name.trim() || null,
          tax_id: data.company.tax_id.trim() || null,
        },
        {
          supplier_category: data.supplier.supplier_category as string,
          payment_terms: data.supplier.payment_terms.trim() || null,
          contract_reference: data.supplier.contract_reference.trim() || null,
          notes: data.supplier.notes.trim() || null,
        },
        orgId,
        userId
      );

      navigate(`/pricing/suppliers/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar fornecedor");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Carregando fornecedor...
      </div>
    );
  }

  if (error && !supplier) {
    return (
      <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
        <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>{error}</p>
        <button
          onClick={() => navigate("/pricing/suppliers")}
          style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Fornecedor não encontrado.
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
          Editar Fornecedor
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          {supplier.company?.legal_name}
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-6)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)" }}>{error}</p>
        </div>
      )}

      <SupplierForm
        initialCompany={{
          legal_name: supplier.company?.legal_name ?? "",
          trade_name: supplier.company?.trade_name ?? "",
          tax_id: supplier.company?.tax_id ?? "",
        }}
        initialSupplier={{
          supplier_category: supplier.supplier_category as SupplierProfileFormData["supplier_category"],
          payment_terms: supplier.payment_terms ?? "",
          contract_reference: supplier.contract_reference ?? "",
          notes: supplier.notes ?? "",
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/pricing/suppliers/${id}`)}
        loading={submitting}
      />
    </div>
  );
}

export function SupplierEditPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
