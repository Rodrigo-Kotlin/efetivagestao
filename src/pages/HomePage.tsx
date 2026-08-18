import { Link } from "react-router-dom";

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

function StatusBadge({ status }: { status: ModuleCard["status"] }) {
  const styles: Record<ModuleCard["status"], { bg: string; color: string; label: string }> = {
    "active": { bg: "#DCFCE7", color: "#166534", label: "Disponível" },
    "in-development": { bg: "#FEF9C3", color: "#854D0E", label: "Em desenvolvimento" },
    "coming-soon": { bg: "#F1F5F9", color: "#64748B", label: "Em breve" },
  };

  const s = styles[status];

  return (
    <span
      style={{
        display: "inline-block",
        padding: "var(--space-1) var(--space-3)",
        backgroundColor: s.bg,
        color: s.color,
        borderRadius: "var(--radius-full)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--font-medium)",
      }}
    >
      {s.label}
    </span>
  );
}

export function HomePage() {
  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1
          style={{
            fontSize: "var(--text-3xl)",
            fontWeight: "var(--font-bold)",
            color: "var(--color-text)",
            marginBottom: "var(--space-2)",
          }}
        >
          Efetiva Gestão
        </h1>
        <p
          style={{
            fontSize: "var(--text-lg)",
            color: "var(--color-text-secondary)",
          }}
        >
          Plataforma Integrada de Gestão Empresarial
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--space-4)",
        }}
        role="list"
        aria-label="Módulos do sistema"
      >
        {modules.map((mod) => {
          const isClickable = mod.status !== "coming-soon" && mod.path;

          const cardContent = (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: "var(--space-3)",
                }}
              >
                <span
                  style={{ fontSize: "var(--text-2xl)" }}
                  aria-hidden="true"
                >
                  {mod.icon}
                </span>
                <StatusBadge status={mod.status} />
              </div>
              <h3
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: "var(--font-semibold)",
                  color: "var(--color-text)",
                  marginBottom: "var(--space-2)",
                }}
              >
                {mod.title}
              </h3>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {mod.description}
              </p>
            </>
          );

          const cardStyle: React.CSSProperties = {
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-5)",
            transition: "box-shadow var(--transition-fast), border-color var(--transition-fast)",
            minHeight: "160px",
            display: "flex",
            flexDirection: "column",
          };

          if (isClickable) {
            return (
              <Link
                key={mod.title}
                to={mod.path!}
                role="listitem"
                aria-label={mod.title}
                style={{
                  ...cardStyle,
                  textDecoration: "none",
                  color: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "var(--color-border)";
                }}
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <div
              key={mod.title}
              role="listitem"
              aria-label={`${mod.title} — ${mod.status === "coming-soon" ? "Em breve" : "Em desenvolvimento"}`}
              style={{
                ...cardStyle,
                opacity: 0.75,
                cursor: "default",
              }}
            >
              {cardContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}
