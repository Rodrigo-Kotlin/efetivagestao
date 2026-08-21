import { Link } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResponsiveGrid } from "@/components/layout/ResponsiveGrid";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { SemanticTone } from "@/components/ui/Badge";

interface ModuleCard {
  title: string;
  description: string;
  icon: string;
  status: "active" | "coming-soon" | "in-development";
  path?: string;
}

const modules: ModuleCard[] = [
  {
    title: "Clientes & CRM",
    description: "Clientes, contatos e oportunidades.",
    icon: "👥",
    status: "coming-soon",
  },
  {
    title: "Comercial",
    description: "Propostas, contratos e vendas.",
    icon: "💼",
    status: "coming-soon",
  },
  {
    title: "Preços & Exames",
    description: "Catálogo, custos, margens e tabelas comerciais.",
    icon: "📋",
    status: "active",
    path: "/pricing",
  },
  {
    title: "Clínica",
    description: "Atendimentos e agenda clínica.",
    icon: "🏥",
    status: "coming-soon",
  },
  {
    title: "Operações",
    description: "Logística e operações internas.",
    icon: "⚙️",
    status: "coming-soon",
  },
  {
    title: "Financeiro",
    description: "Contas, fluxo e relatórios financeiros.",
    icon: "💰",
    status: "coming-soon",
  },
  {
    title: "SST",
    description: "Segurança e saúde do trabalho.",
    icon: "🛡️",
    status: "coming-soon",
  },
  {
    title: "RH",
    description: "Gestão de pessoas e administração.",
    icon: "🧑‍💼",
    status: "coming-soon",
  },
  {
    title: "Administrativo",
    description: "Configurações e administração geral.",
    icon: "🏛️",
    status: "coming-soon",
  },
  {
    title: "Documentos",
    description: "Gestão de documentos e arquivos.",
    icon: "📄",
    status: "coming-soon",
  },
  {
    title: "BI & Indicadores",
    description: "Relatórios e inteligência de dados.",
    icon: "📊",
    status: "coming-soon",
  },
  {
    title: "Configurações",
    description: "Preferências e configurações do sistema.",
    icon: "🔧",
    status: "coming-soon",
  },
];

const statusConfig: Record<ModuleCard["status"], { tone: SemanticTone; label: string }> = {
  active: { tone: "positive", label: "Disponível" },
  "in-development": { tone: "warning", label: "Em desenvolvimento" },
  "coming-soon": { tone: "neutral", label: "Em breve" },
};

export function HomePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Efetiva Gestão"
        description="Plataforma Integrada de Gestão Empresarial"
      />

      <ResponsiveGrid minItemWidth="medium" gap="4" role="list" aria-label="Módulos do sistema">
        {modules.map((mod) => {
          const isClickable = mod.status !== "coming-soon" && mod.path;
          const { tone, label } = statusConfig[mod.status];

          const content = (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-2xl)" }} aria-hidden="true">{mod.icon}</span>
                <Badge tone={tone}>{label}</Badge>
              </div>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
                {mod.title}
              </h3>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                {mod.description}
              </p>
            </>
          );

          if (isClickable) {
            return (
              <Link
                key={mod.title}
                to={mod.path!}
                role="listitem"
                aria-label={mod.title}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Card interactive padding="comfortable" style={{ minHeight: "160px" }}>
                  {content}
                </Card>
              </Link>
            );
          }

          return (
            <div
              key={mod.title}
              role="listitem"
              aria-label={`${mod.title} — ${mod.status === "coming-soon" ? "Em breve" : "Em desenvolvimento"}`}
            >
              <Card padding="comfortable" style={{ minHeight: "160px", opacity: 0.75 }}>
                {content}
              </Card>
            </div>
          );
        })}
      </ResponsiveGrid>
    </PageContainer>
  );
}
