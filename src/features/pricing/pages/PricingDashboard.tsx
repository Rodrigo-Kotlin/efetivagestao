import { Link } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { useCatalogStats } from "../catalog/hooks/useCatalog";

interface FutureModule {
  title: string;
  description: string;
  status: "available" | "coming-soon";
  path?: string;
}

const futureModules: FutureModule[] = [
  {
    title: "Catálogo Mestre",
    description: "Itens, categorias e nomenclaturas do catálogo de serviços.",
    status: "available",
    path: "/pricing/catalog",
  },
  {
    title: "Fornecedores",
    description: "Mapeamento e gestão de fornecedores.",
    status: "coming-soon",
  },
  {
    title: "Custos",
    description: "Custos de exames e serviços por fornecedor.",
    status: "coming-soon",
  },
  {
    title: "Formação de Preço",
    description: "Margens, markup e cálculo de preços.",
    status: "coming-soon",
  },
  {
    title: "Tabelas Comerciais",
    description: "Tabelas Padrão, Assinante e Clube EFT.",
    status: "coming-soon",
  },
  {
    title: "Clientes",
    description: "Preços específicos por cliente.",
    status: "coming-soon",
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
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
          Preços & Exames
        </h1>
        <p style={{ fontSize: "var(--text-lg)", color: "var(--color-text-secondary)" }}>
          Catálogo, custos, margens e tabelas comerciais.
        </p>
      </div>

      {/* Stats Cards */}
      {can("pricing.catalog.view") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
          <Link
            to="/pricing/catalog"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-5)",
              textDecoration: "none",
              color: "inherit",
              transition: "box-shadow var(--transition-fast), border-color var(--transition-fast)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--color-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--color-border)"; }}
          >
            <h3 style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>Itens Ativos</h3>
            <p style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--font-bold)", color: "var(--color-primary)" }}>
              {loading ? "—" : stats.total_active}
            </p>
          </Link>

          <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-5)" }}>
            <h3 style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>Rascunhos</h3>
            <p style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--font-bold)", color: "#F59E0B" }}>
              {loading ? "—" : stats.total_draft}
            </p>
          </div>

          <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-5)" }}>
            <h3 style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>Inativos</h3>
            <p style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--font-bold)", color: "#6B7280" }}>
              {loading ? "—" : stats.total_inactive}
            </p>
          </div>

          <Link
            to="/pricing/categories"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-5)",
              textDecoration: "none",
              color: "inherit",
              transition: "box-shadow var(--transition-fast), border-color var(--transition-fast)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--color-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--color-border)"; }}
          >
            <h3 style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>Categorias</h3>
            <p style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--font-bold)", color: "var(--color-primary)" }}>
              {loading ? "—" : stats.total_categories}
            </p>
          </Link>
        </div>
      )}

      {/* Future modules */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
        {futureModules.map((mod) => {
          const isAvailable = mod.status === "available" && mod.path;

          const cardContent = (
            <>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
                {mod.title}
              </h3>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: "var(--space-3)" }}>
                {mod.description}
              </p>
              <span style={{
                display: "inline-block",
                padding: "var(--space-1) var(--space-3)",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--font-medium)",
                backgroundColor: isAvailable ? "#DCFCE7" : "#F1F5F9",
                color: isAvailable ? "#166534" : "#64748B",
              }}>
                {isAvailable ? "Disponível" : "Em breve"}
              </span>
            </>
          );

          const cardStyle: React.CSSProperties = {
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-5)",
            transition: "box-shadow var(--transition-fast), border-color var(--transition-fast)",
            minHeight: "140px",
            display: "flex",
            flexDirection: "column",
          };

          if (isAvailable) {
            return (
              <Link
                key={mod.title}
                to={mod.path!}
                style={{ ...cardStyle, textDecoration: "none", color: "inherit" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--color-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--color-border)"; }}
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <div key={mod.title} style={{ ...cardStyle, opacity: 0.75, cursor: "default" }}>
              {cardContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}
