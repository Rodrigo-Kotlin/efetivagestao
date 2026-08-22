import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { useCatalogItem, useCatalogMutations } from "../hooks/useCatalog";
import { AliasManager } from "./AliasManager";
import { ITEM_TYPES, EXECUTION_TYPES } from "@/types";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";

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
    return <Spinner label="Carregando exame..." />;
  }

  if (error) {
    return (
      <Alert tone="negative" title={error}>
        <Button variant="outlined" size="compact" onClick={() => navigate("/pricing/catalog")}>
          Voltar aos exames
        </Button>
      </Alert>
    );
  }

  if (!item) {
    return (
      <EmptyState
        title="Exame não encontrado"
        description="O exame solicitado não foi encontrado."
        actions={
          <Button variant="filled" onClick={() => navigate("/pricing/catalog")}>
            Voltar aos exames
          </Button>
        }
      />
    );
  }

  const typeLabel = ITEM_TYPES.find((t) => t.value === item.item_type)?.label ?? item.item_type;
  const execLabel = EXECUTION_TYPES.find((t) => t.value === item.execution_type)?.label ?? item.execution_type;

  const handleAction = async (action: "activate" | "deactivate" | "archive") => {
    if (!confirm(action === "activate" ? "Ativar este exame?" : action === "deactivate" ? "Inativar este exame?" : "Arquivar este exame?")) return;
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--spacing-6)", flexWrap: "wrap", gap: "var(--spacing-4)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", marginBottom: "var(--spacing-2)" }}>
            <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: 600 }}>{item.name}</h2>
            <StatusBadge status={item.status} />
          </div>
          <p style={{ fontFamily: "var(--font-family-mono)", color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
            {item.code} · {typeLabel}
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--spacing-2)", flexWrap: "wrap" }}>
          {can("pricing.catalog.edit") && item.status !== "archived" && (
            <Button variant="outlined" size="compact" onClick={() => navigate(`/pricing/catalog/${item.id}/edit`)}>Editar</Button>
          )}
          {can("pricing.catalog.create") && item.status === "draft" && (
            <Button variant="filled" size="compact" onClick={() => void handleAction("activate")} disabled={actionLoading}>Ativar</Button>
          )}
          {can("pricing.catalog.edit") && item.status === "active" && (
            <Button variant="outlined" size="compact" onClick={() => void handleAction("deactivate")} disabled={actionLoading}>Inativar</Button>
          )}
          {can("pricing.catalog.archive") && (item.status === "active" || item.status === "inactive") && (
            <Button variant="outlined" size="compact" onClick={() => void handleAction("archive")} disabled={actionLoading}>Arquivar</Button>
          )}
        </div>
      </div>

      {actionError && <Alert tone="negative">{actionError}</Alert>}

      <div style={{ display: "flex", borderBottom: "2px solid var(--color-border-default)", marginBottom: "var(--spacing-6)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "var(--spacing-3) var(--spacing-4)",
              backgroundColor: "transparent",
              color: activeTab === tab.key ? "var(--color-primary)" : "var(--color-text-secondary)",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--color-primary)" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "var(--font-size-sm)",
              fontWeight: activeTab === tab.key ? 600 : 500,
              marginBottom: "-2px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-6)" }}>
          <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--spacing-4)" }}>
            <div>
              <dt style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-1)" }}>Código</dt>
              <dd style={{ fontFamily: "var(--font-family-mono)", fontWeight: 500 }}>{item.code}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-1)" }}>Tipo</dt>
              <dd><Badge>{typeLabel}</Badge></dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-1)" }}>Nome Reduzido</dt>
              <dd>{item.short_name ?? "—"}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-1)" }}>Categoria</dt>
              <dd>{item.category?.name ?? "—"}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-1)" }}>Unidade Comercial</dt>
              <dd>{item.commercial_unit}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-1)" }}>Execução</dt>
              <dd>{execLabel}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-1)" }}>Código Legado</dt>
              <dd>{item.legacy_code ?? "—"}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-1)" }}>Criado em</dt>
              <dd>{new Date(item.created_at).toLocaleDateString("pt-BR")}</dd>
            </div>
          </dl>
          {item.description && (
            <div style={{ marginTop: "var(--spacing-6)", borderTop: "1px solid var(--color-border-default)", paddingTop: "var(--spacing-4)" }}>
              <h3 style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, marginBottom: "var(--spacing-2)" }}>Descrição</h3>
              <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{item.description}</p>
            </div>
          )}
          {item.notes && (
            <div style={{ marginTop: "var(--spacing-4)", borderTop: "1px solid var(--color-border-default)", paddingTop: "var(--spacing-4)" }}>
              <h3 style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, marginBottom: "var(--spacing-2)" }}>Observações</h3>
              <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{item.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "aliases" && (
        <AliasManager itemId={item.id} aliases={item.aliases ?? []} canEdit={can("pricing.catalog.edit")} />
      )}

      {activeTab === "history" && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-8)", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>Histórico de auditoria será exibido aqui em versões futuras.</p>
        </div>
      )}
    </div>
  );
}
