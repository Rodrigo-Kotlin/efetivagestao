import { Link } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResponsiveGrid } from "@/components/layout/ResponsiveGrid";
import { AppIcon, type AppIconName } from "@/layouts/app-shell/AppIcon";

interface ModuleCard {
  title: string;
  description: string;
  icon: AppIconName;
  status: "active" | "coming-soon" | "in-development";
  path?: string;
}

const availableModules: ModuleCard[] = [
  {
    title: "Preços & Exames",
    description: "Catálogo, custos, margens e tabelas comerciais.",
    icon: "pricing",
    status: "active",
    path: "/pricing",
  },
];

const futureModules: ModuleCard[] = [
  { title: "Clientes & CRM", description: "Clientes, contatos e oportunidades.", icon: "crm", status: "coming-soon" },
  { title: "Comercial", description: "Propostas, contratos e vendas.", icon: "commercial", status: "coming-soon" },
  { title: "Clínica", description: "Atendimentos e agenda clínica.", icon: "clinic", status: "coming-soon" },
  { title: "Operações", description: "Logística e operações internas.", icon: "operations", status: "coming-soon" },
  { title: "Financeiro", description: "Contas, fluxo e relatórios financeiros.", icon: "finance", status: "coming-soon" },
  { title: "SST", description: "Segurança e saúde do trabalho.", icon: "sst", status: "coming-soon" },
  { title: "RH", description: "Gestão de pessoas e administração.", icon: "hr", status: "coming-soon" },
  { title: "Administrativo", description: "Configurações e administração geral.", icon: "admin", status: "coming-soon" },
  { title: "Documentos", description: "Gestão de documentos e arquivos.", icon: "documents", status: "coming-soon" },
  { title: "BI & Indicadores", description: "Relatórios e inteligência de dados.", icon: "bi", status: "coming-soon" },
  { title: "Configurações", description: "Preferências e configurações do sistema.", icon: "settings", status: "coming-soon" },
];

const statusLabels: Record<ModuleCard["status"], string> = {
  active: "Disponível",
  "in-development": "Em desenvolvimento",
  "coming-soon": "Em breve",
};

function ModuleCardLink({ mod }: { mod: ModuleCard }) {
  const isClickable = mod.status !== "coming-soon" && mod.path;
  const state = isClickable ? "available" : "future";

  const content = (
    <>
      <div className="eg-module-card__icon" aria-hidden="true">
        <span className="eg-icon" data-size="medium">
          <AppIcon name={mod.icon} />
        </span>
      </div>
      <h3 className="eg-module-card__title">{mod.title}</h3>
      <p className="eg-module-card__description">{mod.description}</p>
      {!isClickable ? (
        <span className="eg-module-card__status">{statusLabels[mod.status]}</span>
      ) : null}
    </>
  );

  if (isClickable) {
    return (
      <Link
        to={mod.path!}
        role="listitem"
        aria-label={`${mod.title} — Disponível`}
        className="eg-module-card"
        data-state={state}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      role="listitem"
      aria-label={`${mod.title} — ${statusLabels[mod.status]}`}
      className="eg-module-card"
      data-state={state}
    >
      {content}
    </div>
  );
}

export function HomePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Efetiva Gestão"
        description="Plataforma Integrada de Gestão Empresarial"
      />

      <section className="eg-module-section" aria-labelledby="available-modules">
        <header>
          <h2 id="available-modules" className="eg-module-section__title">Módulos disponíveis</h2>
          <p className="eg-module-section__description">Funcionalidades prontas para uso.</p>
        </header>
        <ResponsiveGrid minItemWidth="medium" gap="4" role="list" aria-label="Módulos disponíveis">
          {availableModules.map((mod) => (
            <ModuleCardLink key={mod.title} mod={mod} />
          ))}
        </ResponsiveGrid>
      </section>

      <section className="eg-module-section" aria-labelledby="future-modules">
        <header>
          <h2 id="future-modules" className="eg-module-section__title">Próximos módulos</h2>
          <p className="eg-module-section__description">Recursos em roadmap.</p>
        </header>
        <ResponsiveGrid minItemWidth="medium" gap="4" role="list" aria-label="Próximos módulos">
          {futureModules.map((mod) => (
            <ModuleCardLink key={mod.title} mod={mod} />
          ))}
        </ResponsiveGrid>
      </section>
    </PageContainer>
  );
}
