import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { CatalogList } from "../catalog/components/CatalogList";
import { Button } from "@/components/ui/Button";

export function CatalogPage() {
  const navigate = useNavigate();

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Catálogo Mestre"
        description="Exames, serviços e itens padronizados utilizados em custos, precificação e tabelas comerciais."
        breadcrumbs={[
          { label: "Preços & Exames", to: "/pricing" },
          { label: "Catálogo Mestre" },
        ]}
        actions={
          <Button variant="filled" onClick={() => navigate("/pricing/catalog/new")}>
            + Novo Item
          </Button>
        }
      />
      <CatalogList />
    </PageContainer>
  );
}
