import { Link } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { useCatalogStats } from "../catalog/hooks/useCatalog";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResponsiveGrid } from "@/components/layout/ResponsiveGrid";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { KPI } from "@/components/ui/KPI";

interface FutureModule {
  title: string;
  description: string;
  status: "available" | "coming-soon";
  path?: string;
  permission?: string;
}

const futureModules: FutureModule[] = [
  {
    title: "Catálogo Mestre",
    description: "Itens, categorias e nomenclaturas do catálogo de serviços.",
    status: "available",
    path: "/pricing/catalog",
    permission: "pricing.catalog.view",
  },
  {
    title: "Fornecedores",
    description: "Mapeamento e gestão de fornecedores.",
    status: "available",
    path: "/pricing/suppliers",
    permission: "pricing.supplier.view",
  },
  {
    title: "Custos",
    description: "Custos de exames e serviços por fornecedor.",
    status: "available",
    path: "/pricing/costs",
    permission: "pricing.cost.view",
  },
  {
    title: "Políticas de Preço",
    description: "Margens, markup, componentes e regras de precificação.",
    status: "available",
    path: "/pricing/policies",
    permission: "pricing.policy.view",
  },
  {
    title: "Simulador de Preço",
    description: "Simula o preço conforme custo e política vigentes.",
    status: "available",
    path: "/pricing/simulator",
    permission: "pricing.calculate",
  },
  {
    title: "Tabelas Comerciais",
    description: "Tabelas comerciais, versões, preços publicados e vigências.",
    status: "available",
    path: "/pricing/commercial",
    permission: "pricing.commercial.view",
  },
  {
    title: "Clientes",
    description: "Clientes, tabelas atribuídas e preços específicos.",
    status: "available",
    path: "/pricing/clients",
    permission: "pricing.client.view",
  },
  {
    title: "Importações",
    description: "Importação de dados via XLSX.",
    status: "coming-soon",
  },
  {
    title: "Conciliação",
    description: "Conciliação com dados de mercado.",
    status: "coming-soon",
  },
  {
    title: "Mercado",
    description: "Análise de concorrentes e referências.",
    status: "coming-soon",
  },
];

export function PricingDashboard() {
  const { can } = useAuth();
  const { stats, loading } = useCatalogStats();

  return (
    <PageContainer>
      <PageHeader
        title="Preços & Exames"
        description="Catálogo, custos, margens e tabelas comerciais."
      />

      {can("pricing.catalog.view") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
          <Link to="/pricing/catalog" style={{ textDecoration: "none", color: "inherit" }}>
            <Card interactive padding="comfortable">
              <KPI label="Itens Ativos" value={loading ? "—" : stats.total_active} />
            </Card>
          </Link>

          <Card padding="comfortable">
            <KPI label="Rascunhos" value={loading ? "—" : stats.total_draft} />
          </Card>

          <Card padding="comfortable">
            <KPI label="Inativos" value={loading ? "—" : stats.total_inactive} />
          </Card>

          <Link to="/pricing/categories" style={{ textDecoration: "none", color: "inherit" }}>
            <Card interactive padding="comfortable">
              <KPI label="Categorias" value={loading ? "—" : stats.total_categories} />
            </Card>
          </Link>
        </div>
      )}

      <ResponsiveGrid minItemWidth="medium" gap="4">
        {futureModules.map((mod) => {
          const hasPermission = !mod.permission || can(mod.permission);
          const isAvailable = mod.status === "available" && mod.path && hasPermission;

          const content = (
            <>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
                {mod.title}
              </h3>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: "var(--space-3)" }}>
                {mod.description}
              </p>
              <Badge tone={isAvailable ? "positive" : "neutral"}>
                {isAvailable ? "Disponível" : "Em breve"}
              </Badge>
            </>
          );

          if (isAvailable) {
            return (
              <Link
                key={mod.title}
                to={mod.path!}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Card interactive padding="comfortable" style={{ minHeight: "140px" }}>
                  {content}
                </Card>
              </Link>
            );
          }

          return (
            <div key={mod.title} style={{ opacity: 0.75, cursor: "default" }}>
              <Card padding="comfortable" style={{ minHeight: "140px" }}>
                {content}
              </Card>
            </div>
          );
        })}
      </ResponsiveGrid>
    </PageContainer>
  );
}
