import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { CatalogForm } from "../catalog/components/CatalogForm";

export function CatalogNewPage() {
  return (
    <PageContainer>
      <PageHeader
        variant="compact"
        title="Novo Item"
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Catálogo Mestre", to: "/pricing/catalog" },
          { label: "Novo item" },
        ]}
      />
      <CatalogForm mode="create" />
    </PageContainer>
  );
}
