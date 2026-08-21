// ============================================================
// ClientPricingDetailPage — main client pricing workspace.
// Tabs: resumo, atribuições de tabela, preços específicos.
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ClientBadges } from "../components/ClientBadges";
import { ClientStatusDialog } from "../components/ClientStatusDialog";
import { AssignmentList } from "../components/AssignmentList";
import { OverrideList } from "../components/OverrideList";
import { useClientDetail } from "../hooks/useClients";
import { fetchClientCompany } from "../api/clientPrices";
import { formatDateTime } from "../utils/format";

type CompanyIdentity = NonNullable<
  Awaited<ReturnType<typeof fetchClientCompany>>
>;

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4)",
  marginBottom: "var(--space-4)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--color-text-secondary)",
  marginBottom: "2px",
};

const valueStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--color-text)",
  fontWeight: "var(--font-medium)",
};

function metaItem(label: string, value: string) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <p style={valueStyle}>{value}</p>
    </div>
  );
}

const TABS = [
  { id: "summary", label: "Resumo" },
  { id: "assignments", label: "Atribuições de tabela" },
  { id: "overrides", label: "Preços específicos" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Inner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const companyId = id ?? null;
  const { client, assignments, overrides, loading, error, refetch } =
    useClientDetail(companyId);

  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [company, setCompany] = useState<CompanyIdentity | null>(null);

  const canViewCompany = can("core.company.view");

  useEffect(() => {
    if (!companyId || !canViewCompany) return;
    let cancelled = false;
    fetchClientCompany(companyId)
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch(() => {
        if (!cancelled) setCompany(null);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, canViewCompany]);

  if (!can("pricing.client.view")) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  if (loading) {
    return (
      <p
        role="status"
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Carregando cliente...
      </p>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        style={{
          backgroundColor: "#FEF2F2",
          border: "1px solid #FECACA",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
        }}
      >
        <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>{error}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          style={{
            padding: "var(--space-2) var(--space-3)",
            backgroundColor: "#DC2626",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!client || !companyId) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Cliente não encontrado.
      </div>
    );
  }

  const companyLabel =
    company?.legal_name ?? company?.trade_name ?? `${client.company_id.slice(0, 8)}…`;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/pricing/clients")}
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-primary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: "var(--space-2)",
        }}
      >
        ← Voltar para clientes
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          marginBottom: "var(--space-4)",
        }}
      >
        <div>
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)" }}>
              {companyLabel}
            </h1>
            <ClientBadges status={client.status} type="profile" />
          </div>
          {canViewCompany && company?.tax_id && (
            <p
              style={{
                margin: "var(--space-1) 0 0",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "var(--text-xs)",
                color: "var(--color-text-secondary)",
              }}
            >
              {company.tax_id}
            </p>
          )}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Seções do cliente"
        style={{
          display: "flex",
          gap: "var(--space-2)",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "var(--space-2) var(--space-4)",
              fontSize: "var(--text-sm)",
              fontWeight:
                activeTab === tab.id
                  ? "var(--font-semibold)"
                  : "var(--font-medium)",
              color:
                activeTab === tab.id
                  ? "var(--color-primary)"
                  : "var(--color-text-secondary)",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--color-primary)"
                  : "2px solid transparent",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "summary" && (
        <div>
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-3)",
                flexWrap: "wrap",
                marginBottom: "var(--space-3)",
              }}
            >
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", margin: 0 }}>
                Resumo do perfil
              </h3>
              {can("pricing.client.edit") && (
                <button
                  type="button"
                  onClick={() => setStatusDialogOpen(true)}
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    backgroundColor: "transparent",
                    color: "var(--color-text-secondary)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--text-sm)",
                    cursor: "pointer",
                  }}
                >
                  Alterar status
                </button>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              <div>
                <p style={labelStyle}>Status</p>
                <p style={valueStyle}>
                  <ClientBadges status={client.status} type="profile" />
                </p>
              </div>
              {canViewCompany &&
                metaItem(
                  "Empresa",
                  `${companyLabel}${company?.tax_id ? ` · ${company.tax_id}` : ""}`
                )}
              {metaItem("Motivo do status atual", client.status_reason ?? "—")}
              {metaItem("Observações comerciais", client.commercial_notes ?? "—")}
              {metaItem("Preços específicos", String(overrides.length))}
              {metaItem("Última atualização", formatDateTime(client.updated_at))}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
            }}
          >
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "#92400E" }}>
              Preço final do cliente ainda não é calculado nesta fase.
            </p>
          </div>
        </div>
      )}

      {activeTab === "assignments" && (
        <AssignmentList
          assignments={assignments}
          canCreate={can("pricing.client.create")}
          clientId={companyId}
          loading={false}
          error={null}
        />
      )}

      {activeTab === "overrides" && (
        <OverrideList
          overrides={overrides}
          canCreate={can("pricing.client.create")}
          clientId={companyId}
          loading={false}
          error={null}
        />
      )}

      {statusDialogOpen && (
        <ClientStatusDialog
          clientId={client.company_id}
          currentStatus={client.status}
          onClose={() => setStatusDialogOpen(false)}
          onComplete={() => {
            setStatusDialogOpen(false);
            void refetch();
          }}
        />
      )}
    </div>
  );
}

export function ClientPricingDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
