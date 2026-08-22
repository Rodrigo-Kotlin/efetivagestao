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
          variant="compact"
          title="Editar exame"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Exames", to: "/pricing/catalog" },
            { label: "Editar" },
          ]}
        />
        <Spinner label="Carregando exame..." />
      </PageContainer>
    );
  }

  if (error || !item) {
    return (
      <PageContainer>
        <PageHeader
          variant="compact"
          title="Editar exame"
          breadcrumbs={[
            { label: "Preços & Exames", to: "/pricing" },
            { label: "Exames", to: "/pricing/catalog" },
            { label: "Editar" },
          ]}
        />
        <Alert tone="negative" title={error ?? "Exame não encontrado."}>
          <Button variant="outlined" onClick={() => navigate("/pricing/catalog")}>
            Voltar aos exames
          </Button>
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        variant="compact"
        title="Editar exame"
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Exames", to: "/pricing/catalog" },
          { label: item.name, to: `/pricing/catalog/${id}` },
          { label: "Editar" },
        ]}
      />
      <CatalogForm mode="edit" initialData={item} />
    </PageContainer>
  );
}
