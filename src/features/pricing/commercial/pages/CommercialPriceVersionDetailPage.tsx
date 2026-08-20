// ============================================================
// CommercialPriceVersionDetailPage — main commercial workspace.
// Wires items, exceptions, readiness, workflow, bulk, engine items.
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  CommercialCodeBadge,
  CommercialVersionStatusBadge,
} from "../components/CommercialBadges";
import { CommercialItemTable } from "../components/CommercialItemTable";
import { CommercialExceptionPanel } from "../components/CommercialExceptionPanel";
import { CommercialBulkAdjustment } from "../components/CommercialBulkAdjustment";
import { CommercialWorkflowActions } from "../components/CommercialWorkflowActions";
import { CommercialVersionTimeline } from "../components/CommercialVersionTimeline";
import { EnginePriceItemForm } from "../components/EnginePriceItemForm";
import { ManualPriceItemForm } from "../components/ManualPriceItemForm";
import { PublishReadinessPanel } from "../components/PublishReadinessPanel";
import {
  addEngineCommercialItem,
  addManualCommercialItem,
  bulkAdjustCommercialPrices,
  decideCommercialException,
  deleteCommercialItem,
  fetchCommercialTableVersions,
  requestCommercialException,
  updateCommercialItemPrice,
} from "../api/commercialPrices";
import { useCommercialVersion, useCommercialWorkflow } from "../hooks/useCommercial";
import type {
  CommercialPriceException,
  CommercialViolationCode,
} from "../types/commercial.types";
import { formatCurrency, formatDate, formatDateTime } from "../utils/format";
import { supabase } from "@/lib/supabase";

interface SupplierOption {
  id: string;
  name: string;
}

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

function Inner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;
  const { version, readiness, loading, error, refetch, refetchReadiness } = useCommercialVersion(
    id ?? null
  );
  const { run, pending: workflowPending, error: workflowError, clearError } = useCommercialWorkflow();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showManualForm, setShowManualForm] = useState(false);
  const [showEngineForm, setShowEngineForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; price: number } | null>(null);
  const [editPriceInput, setEditPriceInput] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load supplier companies once for engine-item form.
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    void (async () => {
      const { data, error: sErr } = await supabase
        .from("companies")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_supplier", true)
        .order("name", { ascending: true })
        .limit(200);
      if (sErr) return;
      if (!cancelled && data) {
        setSuppliers(
          (data as Array<{ id: string; name: string }>).map((c) => ({
            id: c.id,
            name: c.name,
          }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  if (!can("pricing.commercial.view")) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  if (loading) {
    return (
      <p role="status" style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Carregando versão...
      </p>
    );
  }

  if (error || !version) {
    return (
      <div role="alert" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
        <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>{error ?? "Versão não encontrada."}</p>
        <button
          type="button"
          onClick={() => navigate("/pricing/commercial")}
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
          Voltar para tabelas
        </button>
      </div>
    );
  }

  const isDraft = version.status === "draft";
  const canEdit = isDraft && can("pricing.commercial.edit");
  const canCreate = can("pricing.commercial.create");
  const canCalculate = can("pricing.calculate");
  const exceptions: CommercialPriceException[] = version.exceptions ?? [];

  const toggleSelect = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const items = version.items ?? [];
    const filtered = items.filter((it) => it.id);
    const allSelected = filtered.every((it) => selectedIds.has(it.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const it of filtered) next.delete(it.id);
      } else {
        for (const it of filtered) next.add(it.id);
      }
      return next;
    });
  };

  const handleWorkflowAction = (action: "submit" | "return_to_draft" | "approve" | "cancel" | "publish") => {
    const confirmations: Record<string, string> = {
      submit: "Enviar a versão para revisão?",
      return_to_draft: "Voltar a versão para rascunho?",
      approve: "Aprovar a versão?",
      cancel: "Cancelar a versão? Esta ação não pode ser desfeita.",
      publish:
        version.valid_from && version.valid_from > new Date().toISOString().slice(0, 10)
          ? `A versão será agendada para entrar em vigor em ${formatDate(version.valid_from)}.`
          : "A versão entrará em vigor imediatamente. Continuar?",
    };
    if (!window.confirm(confirmations[action])) return;
    void run(action, version.id).then(async (ok) => {
      if (ok) {
        await refetch();
        await refetchReadiness();
      }
    });
  };

  const handleAddManual = async (data: { catalogItemId: string; priceAmount: number }) => {
    setActionError(null);
    try {
      await addManualCommercialItem({
        versionId: version.id,
        catalogItemId: data.catalogItemId,
        priceAmount: data.priceAmount,
      });
      setShowManualForm(false);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao adicionar");
    }
  };

  const handleAddEngine = async (data: {
    catalogItemId: string;
    supplierCompanyId: string;
    referenceDate: string;
    discountRate: number;
    commercialPriceAmount: number | null;
  }) => {
    setActionError(null);
    try {
      await addEngineCommercialItem({
        versionId: version.id,
        catalogItemId: data.catalogItemId,
        supplierCompanyId: data.supplierCompanyId,
        referenceDate: data.referenceDate,
        discountRate: data.discountRate,
        commercialPriceAmount: data.commercialPriceAmount,
      });
      setShowEngineForm(false);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao adicionar");
    }
  };

  const handleBulk = async (data: {
    operation: "percentage" | "fixed" | "round";
    rate: number | null;
    fixedAmount: number | null;
    roundingMode: "nearest" | "up" | "down" | null;
    roundingStep: number | null;
  }) => {
    setActionError(null);
    try {
      await bulkAdjustCommercialPrices({
        versionId: version.id,
        operation: data.operation,
        rate: data.rate,
        fixedAmount: data.fixedAmount,
        roundingMode: data.roundingMode,
        roundingStep: data.roundingStep,
        itemIds: selectedIds.size > 0 ? Array.from(selectedIds) : null,
      });
      setShowBulkForm(false);
      setSelectedIds(new Set());
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha no ajuste em massa");
    }
  };

  const handleDelete = async (itemId: string) => {
    setActionError(null);
    try {
      await deleteCommercialItem({ itemId });
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao remover");
    }
  };

  const handleEditPrice = (itemId: string, currentPrice: number) => {
    setEditingItem({ id: itemId, price: currentPrice });
    setEditPriceInput(String(currentPrice));
  };

  const handleSavePrice = async () => {
    if (!editingItem) return;
    const parsed = Number(editPriceInput.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setActionError("Preço inválido.");
      return;
    }
    try {
      await updateCommercialItemPrice({
        itemId: editingItem.id,
        priceAmount: parsed,
      });
      setEditingItem(null);
      setEditPriceInput("");
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao atualizar");
    }
  };

  const handleRequestException = async (itemId: string, code: string) => {
    const reason = window.prompt("Justificativa da exceção:");
    if (!reason || !reason.trim()) return;
    setActionError(null);
    try {
      await requestCommercialException({
        itemId,
        violationCode: code as CommercialViolationCode,
        reason: reason.trim(),
      });
      await refetch();
      await refetchReadiness();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao solicitar exceção");
    }
  };

  const handleDecideException = async (data: {
    exceptionId: string;
    decision: "approved" | "denied";
    notes: string | null;
  }) => {
    setActionError(null);
    try {
      await decideCommercialException(data);
      await refetch();
      await refetchReadiness();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao decidir exceção");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <div>
          <button
            type="button"
            onClick={() => version.table && navigate(`/pricing/commercial/${version.table.id}`)}
            style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "var(--space-2)" }}
          >
            ← Voltar para a tabela
          </button>
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)" }}>
              Versão v{version.version_number}
            </h1>
            <CommercialVersionStatusBadge status={version.status} />
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap", marginTop: "var(--space-1)" }}>
            {version.table && (
              <>
                <CommercialCodeBadge code={version.table.code} />
                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  {version.table.name}
                </span>
              </>
            )}
            {version.version_label && (
              <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
                · {version.version_label}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <CommercialVersionTimeline currentStatus={version.status} />
      </div>

      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)" }}>
          {metaItem("Vigência", `${formatDate(version.valid_from)} — ${formatDate(version.valid_to)}`)}
          {metaItem("Itens", String(version.item_count ?? (version.items ?? []).length))}
          {metaItem("Criada em", formatDateTime(version.created_at))}
          {version.approved_at && metaItem("Aprovada em", formatDateTime(version.approved_at))}
          {version.published_at && metaItem("Publicada em", formatDateTime(version.published_at))}
          {version.superseded_at && metaItem("Substituída em", formatDateTime(version.superseded_at))}
        </div>
        {version.notes && (
          <div style={{ marginTop: "var(--space-3)", borderTop: "1px solid var(--color-border-light, #F1F5F9)", paddingTop: "var(--space-3)" }}>
            <p style={labelStyle}>Observações</p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text)" }}>{version.notes}</p>
          </div>
        )}
      </div>

      <PublishReadinessPanel readiness={readiness} status={version.status} loading={false} />

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)" }}>Itens</h3>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {canEdit && canCreate && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualForm((v) => !v);
                    setShowEngineForm(false);
                    setShowBulkForm(false);
                  }}
                  style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "var(--color-primary)", color: "var(--color-text-inverse)", border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", cursor: "pointer" }}
                >
                  Adicionar manual
                </button>
                {canCalculate && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowEngineForm((v) => !v);
                      setShowManualForm(false);
                      setShowBulkForm(false);
                    }}
                    style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#7C3AED", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", cursor: "pointer" }}
                  >
                    Adicionar via motor
                  </button>
                )}
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkForm((v) => !v);
                      setShowManualForm(false);
                      setShowEngineForm(false);
                    }}
                    style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#2563EB", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", cursor: "pointer" }}
                  >
                    Ajuste em massa ({selectedIds.size})
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {actionError && (
          <div role="alert" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-3)" }}>
            <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{actionError}</p>
          </div>
        )}

        {showManualForm && orgId && (
          <div style={{ marginBottom: "var(--space-3)" }}>
            <ManualPriceItemForm
              orgId={orgId}
              onSubmit={handleAddManual}
              onCancel={() => setShowManualForm(false)}
            />
          </div>
        )}

        {showEngineForm && orgId && (
          <div style={{ marginBottom: "var(--space-3)" }}>
            <EnginePriceItemForm
              orgId={orgId}
              suppliers={suppliers}
              onSubmit={handleAddEngine}
              onCancel={() => setShowEngineForm(false)}
            />
          </div>
        )}

        {showBulkForm && (
          <div style={{ marginBottom: "var(--space-3)" }}>
            <CommercialBulkAdjustment
              selectedCount={selectedIds.size}
              onSubmit={handleBulk}
              onCancel={() => setShowBulkForm(false)}
            />
          </div>
        )}

        <CommercialItemTable
          version={version}
          canEdit={canEdit}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onEditPrice={(itemId, price) => handleEditPrice(itemId, price)}
          onDelete={(itemId) => void handleDelete(itemId)}
          onRequestException={(itemId, code) => void handleRequestException(itemId, code)}
          exceptions={exceptions}
        />

        {editingItem && (
          <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", backgroundColor: "var(--color-surface-secondary, #F8FAFC)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
            <p style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-2)" }}>
              Editar preço do item (atual: {formatCurrency(editingItem.price)})
            </p>
            <input
              type="text"
              inputMode="decimal"
              value={editPriceInput}
              onChange={(e) => setEditPriceInput(e.target.value)}
              style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", marginRight: "var(--space-2)" }}
            />
            <button
              type="button"
              onClick={() => void handleSavePrice()}
              style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "var(--color-primary)", color: "var(--color-text-inverse)", border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", cursor: "pointer" }}
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setEditPriceInput("");
              }}
              style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", cursor: "pointer", marginLeft: "var(--space-2)" }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <CommercialExceptionPanel
        exceptions={exceptions}
        canRequest={can("pricing.commercial.review")}
        canDecide={can("pricing.commercial.exception_approve")}
        onRequest={async (data) => {
          await requestCommercialException(data);
          await refetch();
          await refetchReadiness();
        }}
        onDecide={handleDecideException}
      />

      <div style={cardStyle}>
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-3)" }}>
          Workflow
        </h3>
        {workflowError && (
          <div role="alert" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-3)" }}>
            <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{workflowError}</p>
            <button
              type="button"
              onClick={clearError}
              style={{ marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Fechar
            </button>
          </div>
        )}
        <CommercialWorkflowActions
          status={version.status}
          permissions={{
            canReview: can("pricing.commercial.review"),
            canApprove: can("pricing.commercial.approve"),
            canPublish: can("pricing.commercial.publish"),
          }}
          pending={workflowPending}
          onAction={(action) => handleWorkflowAction(action)}
        />
      </div>
    </div>
  );
}

export function CommercialPriceVersionDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}

// Helper exported for tests.
export const _internalTestHelper = {
  fetchCommercialTableVersions,
  formatCurrency,
};
