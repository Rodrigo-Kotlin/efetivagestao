import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createSupplier } from "../api/suppliers";
import { SupplierForm } from "../components/SupplierForm";
import type { CompanyFormData, SupplierProfileFormData } from "../schemas/validation";

function Inner() {
  const { activeOrganization, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const orgId = activeOrganization?.id;
  const userId = user?.id;

  const handleSubmit = async (data: { company: CompanyFormData; supplier: SupplierProfileFormData }) => {
    if (!orgId || !userId) {
      setGlobalError("Organização ou usuário não identificado");
      return;
    }

    setLoading(true);
    setGlobalError(null);

    try {
      await createSupplier(
        {
          legal_name: data.company.legal_name.trim(),
          trade_name: data.company.trade_name.trim() || null,
          tax_id: data.company.tax_id.trim() || null,
          organization_id: orgId,
          created_by: userId,
          updated_by: userId,
        },
        {
          supplier_category: data.supplier.supplier_category as string,
          payment_terms: data.supplier.payment_terms.trim() || null,
          contract_reference: data.supplier.contract_reference.trim() || null,
          notes: data.supplier.notes.trim() || null,
          status: "active",
        },
        orgId,
        userId
      );

      navigate("/pricing/suppliers");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Erro ao criar fornecedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
          Novo Fornecedor
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Preencha os dados da empresa e do perfil de fornecedor.
        </p>
      </div>

      {globalError && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-6)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)" }}>{globalError}</p>
        </div>
      )}

      <SupplierForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/pricing/suppliers")}
        loading={loading}
      />
    </div>
  );
}

export function SupplierNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
