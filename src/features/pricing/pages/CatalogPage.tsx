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
        title="Exames"
        description="Cadastre e gerencie exames e serviços."
        actions={
          <Button variant="filled" onClick={() => navigate("/pricing/catalog/new")}>
            Novo exame
          </Button>
        }
      />
      <CatalogList />
    </PageContainer>
  );
}
