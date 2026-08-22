import { useParams, useNavigate } from "react-router-dom";
import { useCatalogItem } from "../catalog/hooks/useCatalog";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { CatalogForm } from "../catalog/components/CatalogForm";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export function CatalogEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { item, loading, error } = useCatalogItem(id ?? null);

  if (!id) {
    navigate("/pricing/catalog");
    return null;
  }

  if (loading) {
    return (
      <PageContainer>
        <PageHeader
          title="Editar Item"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Catálogo Mestre", to: "/pricing/catalog" },
            { label: "Editar" },
          ]}
        />
        <Spinner label="Carregando item..." />
      </PageContainer>
    );
  }

  if (error || !item) {
    return (
      <PageContainer>
        <PageHeader
          title="Editar Item"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Catálogo Mestre", to: "/pricing/catalog" },
            { label: "Editar" },
          ]}
        />
        <Alert tone="negative" title={error ?? "Item não encontrado."}>
          <Button variant="outlined" onClick={() => navigate("/pricing/catalog")}>
            Voltar ao catálogo
          </Button>
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Editar Item"
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Catálogo Mestre", to: "/pricing/catalog" },
          { label: item.name, to: `/pricing/catalog/${id}` },
          { label: "Editar" },
        ]}
      />
      <CatalogForm mode="edit" initialData={item} />
    </PageContainer>
  );
}
