import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategoryManager } from "../catalog/components/CategoryManager";

export function CategoriesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Categorias"
        description="Organize os itens do catálogo em categorias."
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Categorias" },
        ]}
      />
      <CategoryManager />
    </PageContainer>
  );
}
