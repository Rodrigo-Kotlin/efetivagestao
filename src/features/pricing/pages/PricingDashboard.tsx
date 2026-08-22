import { Link } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { useCatalogStats } from "../catalog/hooks/useCatalog";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResponsiveGrid } from "@/components/layout/ResponsiveGrid";
import { MetricCard } from "@/components/ui/MetricCard";
import { AppIcon, type AppIconName } from "@/layouts/app-shell/AppIcon";

interface PricingModule {
  title: string;
  description: string;
  icon: AppIconName;
  status: "available" | "coming-soon";
  path?: string;
  permission?: string;
}

const pricingModules: PricingModule[] = [
  {
    title: "Catálogo Mestre",
    description: "Itens, categorias e nomenclaturas do catálogo de serviços.",
    icon: "catalog",
    status: "available",
    path: "/pricing/catalog",
    permission: "pricing.catalog.view",
  },
  {
    title: "Fornecedores",
    description: "Mapeamento e gestão de fornecedores.",
    icon: "suppliers",
    status: "available",
    path: "/pricing/suppliers",
    permission: "pricing.supplier.view",
  },
  {
    title: "Custos",
    description: "Custos de exames e serviços por fornecedor.",
    icon: "costs",
    status: "available",
    path: "/pricing/costs",
    permission: "pricing.cost.view",
  },
  {
    title: "Políticas de Preço",
    description: "Margens, markup, componentes e regras de precificação.",
    icon: "policies",
    status: "available",
    path: "/pricing/policies",
    permission: "pricing.policy.view",
  },
  {
    title: "Simulador de Preço",
    description: "Simula o preço conforme custo e política vigentes.",
    icon: "simulator",
    status: "available",
    path: "/pricing/simulator",
    permission: "pricing.calculate",
  },
  {
    title: "Tabelas Comerciais",
    description: "Tabelas comerciais, versões, preços publicados e vigências.",
    icon: "commercial",
    status: "available",
    path: "/pricing/commercial",
    permission: "pricing.commercial.view",
  },
  {
    title: "Clientes",
    description: "Clientes, tabelas atribuídas e preços específicos.",
    icon: "crm",
    status: "available",
    path: "/pricing/clients",
    permission: "pricing.client.view",
  },
  { title: "Importações", description: "Importação de dados via XLSX.", icon: "imports", status: "coming-soon" },
  { title: "Conciliação", description: "Conciliação com dados de mercado.", icon: "finance", status: "coming-soon" },
  { title: "Mercado", description: "Análise de concorrentes e referências.", icon: "market", status: "coming-soon" },
];

export function PricingDashboard() {
  const { can } = useAuth();
  const { stats, loading } = useCatalogStats();

  const available = pricingModules.filter((m) => m.status === "available");
  const future = pricingModules.filter((m) => m.status === "coming-soon");

  return (
    <PageContainer>
      <PageHeader
        title="Preços & Exames"
        description="Catálogo, custos, margens e tabelas comerciais."
      />

      {can("pricing.catalog.view") ? (
        <section className="eg-module-section" aria-labelledby="resumo-pricing">
          <header>
            <h2 id="resumo-pricing" className="eg-module-section__title">Resumo</h2>
            <p className="eg-module-section__description">Visão geral do catálogo.</p>
          </header>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
              gap: "var(--md-sys-spacing-3)",
            }}
          >
            {can("pricing.catalog.view") ? (
              <Link
                to="/pricing/catalog"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
                aria-label="Itens Ativos — ver catálogo"
              >
                <MetricCard
                  surface="tonal"
                  interactive
                  label="Itens Ativos"
                  value={loading ? "—" : stats.total_active}
                  icon={
                    <span className="eg-icon" data-size="medium" data-tone="primary">
                      <AppIcon name="catalog" />
                    </span>
                  }
                />
              </Link>
            ) : null}
            <MetricCard
              surface="tonal"
              label="Rascunhos"
              value={loading ? "—" : stats.total_draft}
            />
            <MetricCard
              surface="tonal"
              label="Inativos"
              value={loading ? "—" : stats.total_inactive}
            />
            {can("pricing.catalog.view") ? (
              <Link
                to="/pricing/categories"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
                aria-label="Categorias — ver categorias"
              >
                <MetricCard
                  surface="tonal"
                  interactive
                  label="Categorias"
                  value={loading ? "—" : stats.total_categories}
                  icon={
                    <span className="eg-icon" data-size="medium" data-tone="primary">
                      <AppIcon name="categories" />
                    </span>
                  }
                />
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="eg-module-section" aria-labelledby="ferramentas-pricing">
        <header>
          <h2 id="ferramentas-pricing" className="eg-module-section__title">Ferramentas de precificação</h2>
          <p className="eg-module-section__description">Módulos ativos do pricing.</p>
        </header>
        <ResponsiveGrid minItemWidth="medium" gap="4">
          {available.map((mod) => {
            const hasPermission = !mod.permission || can(mod.permission);
            if (!hasPermission) return null;
            return (
              <Link
                key={mod.title}
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
          })}
        </ResponsiveGrid>
      </section>

      <section className="eg-module-section" aria-labelledby="proximos-pricing">
        <header>
          <h2 id="proximos-pricing" className="eg-module-section__title">Próximos recursos</h2>
          <p className="eg-module-section__description">Módulos em roadmap.</p>
        </header>
        <ResponsiveGrid minItemWidth="medium" gap="4">
          {future.map((mod) => (
            <div
              key={mod.title}
              className="eg-module-card"
              data-state="future"
              aria-label={`${mod.title} — Em breve`}
            >
              <div className="eg-module-card__icon" aria-hidden="true">
                <span className="eg-icon" data-size="medium">
                  <AppIcon name={mod.icon} />
                </span>
              </div>
              <h3 className="eg-module-card__title">{mod.title}</h3>
              <p className="eg-module-card__description">{mod.description}</p>
              <span className="eg-module-card__status">Em breve</span>
            </div>
          ))}
        </ResponsiveGrid>
      </section>
    </PageContainer>
  );
}
