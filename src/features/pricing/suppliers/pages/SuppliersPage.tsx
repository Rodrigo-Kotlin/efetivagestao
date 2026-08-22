import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SupplierList } from "../components/SupplierList";

function Inner() {
  const { can } = useAuth();

  if (!can("pricing.supplier.view")) {
    return (
      <PageContainer>
        <PageHeader
          title="Fornecedores"
          description="Empresas fornecedoras e seus vínculos com o Catálogo Mestre."
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Fornecedores" },
          ]}
        />
        <p style={{ color: "var(--color-text-secondary)" }}>
          Você não tem permissão para acessar esta página.
        </p>
      </PageContainer>
    );
  }

  return <SupplierList />;
}

export function SuppliersPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
