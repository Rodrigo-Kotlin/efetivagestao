import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { useCatalogItem, useCatalogMutations } from "../hooks/useCatalog";
import { AliasManager } from "./AliasManager";
import { ITEM_TYPES, EXECUTION_TYPES, ITEM_STATUSES } from "@/types";

interface CatalogDetailProps {
  itemId: string;
}

type TabKey = "general" | "aliases" | "history";

export function CatalogDetail({ itemId }: CatalogDetailProps) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { item, loading, error } = useCatalogItem(itemId);
  const { activate, deactivate, archive } = useCatalogMutations();
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) {
    return <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>Carregando item...</div>;
  }

  if (error) {
    return (
      <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
        <p style={{ color: "#991B1B" }}>{error}</p>
        <button onClick={() => navigate("/pricing/catalog")} style={{ marginTop: "var(--space-2)", padding: "var(--space-2) var(--space-3)", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}>
          Voltar ao catálogo
        </button>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-8)", textAlign: "center" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>Item não encontrado.</p>
        <button onClick={() => navigate("/pricing/catalog")} style={{ marginTop: "var(--space-4)", padding: "var(--space-2) var(--space-4)", backgroundColor: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}>
          Voltar ao catálogo
        </button>
      </div>
    );
  }

  const typeLabel = ITEM_TYPES.find((t) => t.value === item.item_type)?.label ?? item.item_type;
  const execLabel = EXECUTION_TYPES.find((t) => t.value === item.execution_type)?.label ?? item.execution_type;
  const statusInfo = ITEM_STATUSES.find((s) => s.value === item.status);

  const handleAction = async (action: "activate" | "deactivate" | "archive") => {
    if (!confirm(action === "activate" ? "Ativar este item?" : action === "deactivate" ? "Inativar este item?" : "Arquivar este item?")) return;

    setActionLoading(true);
    setActionError(null);

    try {
      if (action === "activate") await activate(item.id);
      else if (action === "deactivate") await deactivate(item.id);
      else await archive(item.id);
      window.location.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao executar ação");
    } finally {
      setActionLoading(false);
    }
  };

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "general", label: "Geral" },
    { key: "aliases", label: "Aliases" },
    { key: "history", label: "Histórico" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
              {item.name}
            </h1>
            <span style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-medium)",
              backgroundColor: statusInfo?.color ? `${statusInfo.color}20` : "#E5E7EB",
              color: statusInfo?.color ?? "#6B7280",
            }}>
              {statusInfo?.label ?? item.status}
            </span>
          </div>
          <p style={{ fontFamily: "monospace", color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
            {item.code} · {typeLabel}
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {can("pricing.catalog.edit") && item.status !== "archived" && (
            <button
              onClick={() => navigate(`/pricing/catalog/${item.id}/edit`)}
              style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}
            >
              Editar
            </button>
          )}
          {can("pricing.catalog.create") && item.status === "draft" && (
            <button
              onClick={() => void handleAction("activate")}
              disabled={actionLoading}
              style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#10B981", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}
            >
              Ativar
            </button>
          )}
          {can("pricing.catalog.edit") && item.status === "active" && (
            <button
              onClick={() => void handleAction("deactivate")}
              disabled={actionLoading}
              style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#F59E0B", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}
            >
              Inativar
            </button>
          )}
          {can("pricing.catalog.archive") && (item.status === "active" || item.status === "inactive") && (
            <button
              onClick={() => void handleAction("archive")}
              disabled={actionLoading}
              style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#6B7280", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}
            >
              Arquivar
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-4)", color: "#991B1B", fontSize: "var(--text-sm)" }}>
          {actionError}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--color-border)", marginBottom: "var(--space-6)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "transparent",
              color: activeTab === tab.key ? "var(--color-primary)" : "var(--color-text-secondary)",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--color-primary)" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
              fontWeight: activeTab === tab.key ? "var(--font-semibold)" : "var(--font-medium)",
              marginBottom: "-2px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "general" && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)" }}>
          <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
            <div>
              <dt style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>Código</dt>
              <dd style={{ fontFamily: "monospace", fontWeight: "var(--font-medium)" }}>{item.code}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>Tipo</dt>
              <dd>{typeLabel}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>Nome Reduzido</dt>
              <dd>{item.short_name ?? "—"}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>Categoria</dt>
              <dd>{item.category?.name ?? "—"}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>Unidade Comercial</dt>
              <dd>{item.commercial_unit}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>Execução</dt>
              <dd>{execLabel}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>Código Legado</dt>
              <dd>{item.legacy_code ?? "—"}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>Criado em</dt>
              <dd>{new Date(item.created_at).toLocaleDateString("pt-BR")}</dd>
            </div>
          </dl>

          {item.description && (
            <div style={{ marginTop: "var(--space-6)", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
              <h3 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-2)" }}>Descrição</h3>
              <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{item.description}</p>
            </div>
          )}

          {item.notes && (
            <div style={{ marginTop: "var(--space-4)", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
              <h3 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-2)" }}>Observações</h3>
              <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{item.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "aliases" && (
        <AliasManager
          itemId={item.id}
          aliases={item.aliases ?? []}
          canEdit={can("pricing.catalog.edit")}
        />
      )}

      {activeTab === "history" && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-8)", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>
            Histórico de auditoria será exibido aqui em versões futuras.
          </p>
        </div>
      )}
    </div>
  );
}
