import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { CatalogDetail } from "../catalog/components/CatalogDetail";

export function CatalogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate("/pricing/catalog");
    return null;
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Detalhe do Item"
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Catálogo Mestre", to: "/pricing/catalog" },
          { label: "Detalhe" },
        ]}
      />
      <CatalogDetail itemId={id} />
    </PageContainer>
  );
}
