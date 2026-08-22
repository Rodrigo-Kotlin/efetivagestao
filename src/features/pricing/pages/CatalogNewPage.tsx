import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { CatalogForm } from "../catalog/components/CatalogForm";

export function CatalogNewPage() {
  return (
    <PageContainer>
      <PageHeader
        variant="compact"
        title="Novo exame"
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Exames", to: "/pricing/catalog" },
          { label: "Novo exame" },
        ]}
      />
      <CatalogForm mode="create" />
    </PageContainer>
  );
}
