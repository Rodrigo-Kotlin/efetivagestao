import { Link } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResponsiveGrid } from "@/components/layout/ResponsiveGrid";
import { AppIcon, type AppIconName } from "@/layouts/app-shell/AppIcon";

interface MvpModule {
  key: string;
  title: string;
  description: string;
  icon: AppIconName;
  status: "active" | "coming-soon";
  path?: string;
  permission?: string;
}

const mvpModules: MvpModule[] = [
  {
    key: "suppliers",
    title: "Fornecedores",
    description: "Cadastre laboratórios, clínicas e outros fornecedores.",
    icon: "suppliers",
    status: "active",
    path: "/pricing/suppliers",
    permission: "pricing.supplier.view",
  },
  {
    key: "exams",
    title: "Exames",
    description: "Cadastre e organize os exames e serviços oferecidos.",
    icon: "catalog",
    status: "active",
    path: "/pricing/catalog",
    permission: "pricing.catalog.view",
  },
  {
    key: "comparison",
    title: "Custos & Comparativo",
    description: "Informe os valores dos fornecedores e compare o menor custo.",
    icon: "costs",
    status: "coming-soon",
  },
  {
    key: "prices",
    title: "Tabela de Preços",
    description: "Pesquise rapidamente o preço de venda dos exames.",
    icon: "commercial",
    status: "coming-soon",
  },
];

export function PricingDashboard() {
  const { can } = useAuth();

  return (
    <PageContainer>
      <PageHeader
        title="Preços & Exames"
        description="Cadastre fornecedores e exames, compare custos e consulte preços de venda."
      />

      <ResponsiveGrid minItemWidth="medium" gap="4">
        {mvpModules.map((mod) => {
          if (mod.status === "active") {
            const hasPermission = !mod.permission || can(mod.permission);
            if (!hasPermission) return null;
            return (
              <Link
                key={mod.key}
                to={mod.path!}
                className="eg-module-card"
                data-state="available"
                aria-label={mod.title}
              >
                <div className="eg-module-card__icon" aria-hidden="true">
                  <span className="eg-icon" data-size="medium">
                    <AppIcon name={mod.icon} />
                  </span>
                </div>
                <h3 className="eg-module-card__title">{mod.title}</h3>
                <p className="eg-module-card__description">{mod.description}</p>
              </Link>
            );
          }

          return (
            <div
              key={mod.key}
              className="eg-module-card"
              data-state="future"
              aria-label={`${mod.title} — Em implantação`}
            >
              <div className="eg-module-card__icon" aria-hidden="true">
                <span className="eg-icon" data-size="medium">
                  <AppIcon name={mod.icon} />
                </span>
              </div>
              <h3 className="eg-module-card__title">{mod.title}</h3>
              <p className="eg-module-card__description">{mod.description}</p>
              <span className="eg-module-card__status">Em implantação</span>
            </div>
          );
        })}
      </ResponsiveGrid>
    </PageContainer>
  );
}
