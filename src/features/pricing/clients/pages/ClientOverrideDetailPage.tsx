// ============================================================
// ClientOverrideDetailPage — override workspace with workflow,
// provenance capture and draft edit/delete.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ClientBadges } from "../components/ClientBadges";
import { WorkflowActions } from "../components/WorkflowActions";
import { ProvenancePanel } from "../components/ProvenancePanel";
import { useClientOverrideWorkflow } from "../hooks/useClients";
import {
  captureProvenance,
  deleteOverride,
  fetchClientCompany,
  fetchClientOverride,
  updateOverride,
} from "../api/clientPrices";
import type {
  ClientOverrideDetail,
  OverrideResolverResult,
} from "../types/client.types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  parseMoneyInput,
  todayIsoDate,
} from "../utils/format";

type CompanyIdentity = NonNullable<
  Awaited<ReturnType<typeof fetchClientCompany>>
>;

type WorkflowAction =
  | "submit"
  | "return_to_draft"
  | "approve"
  | "cancel"
  | "publish";

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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
  fontFamily: "inherit",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  zIndex: "var(--z-modal)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-4)",
};

const dialogStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
  width: "100%",
  maxWidth: "480px",
  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
};

function metaItem(label: string, value: string) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <p style={valueStyle}>{value}</p>
    </div>
  );
}

function shortId(value: string | null | undefined): string {
  if (!value) return "—";
  return `${value.slice(0, 8)}…`;
}

interface CaptureDialogProps {
  overrideId: string;
  onClose: () => void;
  onComplete: () => void;
}

function CaptureDialog({ overrideId, onClose, onComplete }: CaptureDialogProps) {
  const [referenceDate, setReferenceDate] = useState<string>(todayIsoDate());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!referenceDate || pending) return;
    setPending(true);
    setError(null);
    try {
      await captureProvenance({ overrideId, referenceDate });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setPending(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={pending ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Capturar referência da tabela atribuída"
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", margin: 0 }}>
          Capturar referência da tabela atribuída
        </h2>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", margin: "var(--space-2) 0 var(--space-4)" }}>
          Registra a tabela comercial atribuída e o preço vigente na data
          informada como referência histórica deste preço específico.
        </p>

        <label
          htmlFor="client-override-capture-date"
          style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}
        >
          Data de referência
        </label>
        <input
          id="client-override-capture-date"
          type="date"
          value={referenceDate}
          onChange={(e) => setReferenceDate(e.target.value)}
          disabled={pending}
          style={inputStyle}
        />

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
              marginTop: "var(--space-3)",
            }}
          >
            <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              cursor: pending ? "default" : "pointer",
              fontSize: "var(--text-sm)",
            }}
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={pending || !referenceDate}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-text-inverse)",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: pending || !referenceDate ? "default" : "pointer",
              opacity: pending || !referenceDate ? 0.5 : 1,
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
            }}
          >
            {pending ? "Capturando..." : "Capturar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;
  const overrideId = id ?? null;

  const [override, setOverride] = useState<ClientOverrideDetail | null>(null);
  const [clientCompany, setClientCompany] = useState<CompanyIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editPriceInput, setEditPriceInput] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editValidFrom, setEditValidFrom] = useState("");
  const [editValidTo, setEditValidTo] = useState("");

  const {
    run,
    pending: workflowPending,
    error: workflowError,
    clearError,
  } = useClientOverrideWorkflow();

  const load = useCallback(async () => {
    if (!orgId || !overrideId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClientOverride(overrideId, orgId);
      setOverride(data);
      if (data) {
        const company = await fetchClientCompany(data.client_company_id).catch(
          () => null
        );
        setClientCompany(company);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [orgId, overrideId]);

  useEffect(() => {
    void load();
  }, [load]);

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
        Carregando preço específico...
      </p>
    );
  }

  if (error || !override) {
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
        <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>
          {error ?? "Preço específico não encontrado."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/pricing/clients")}
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
          Voltar para clientes
        </button>
      </div>
    );
  }

  const isDraft = override.status === "draft";
  const canEdit = isDraft && can("pricing.client.edit");

  const provenance: OverrideResolverResult["provenance"] =
    override.source_commercial_price_item_id !== null
      ? {
          source_reference_date: override.source_reference_date ?? "",
          source_commercial_price_table_id:
            override.source_commercial_price_table_id ?? "",
          source_commercial_price_table_version_id:
            override.source_commercial_price_table_version_id ?? "",
          source_commercial_price_item_id: override.source_commercial_price_item_id,
          source_table_price_amount: override.source_table_price_amount ?? 0,
        }
      : null;

  const handleWorkflowAction = (action: string) => {
    const confirmations: Record<string, string> = {
      submit: "Enviar o preço específico para revisão?",
      return_to_draft: "Voltar o preço específico para rascunho?",
      approve: "Aprovar o preço específico?",
      cancel: "Cancelar o preço específico? Esta ação não pode ser desfeita.",
      publish:
        override.valid_from > new Date().toISOString().slice(0, 10)
          ? `O preço específico será agendado para entrar em vigor em ${formatDate(override.valid_from)}.`
          : "O preço específico entrará em vigor imediatamente. Continuar?",
    };
    if (!window.confirm(confirmations[action] ?? "Confirmar ação?")) return;
    clearError();
    void run(action as WorkflowAction, override.id).then(async (ok) => {
      if (ok) await load();
    });
  };

  const startEditing = () => {
    setEditPriceInput(String(override.price_amount).replace(".", ","));
    setEditReason(override.reason);
    setEditValidFrom(override.valid_from);
    setEditValidTo(override.valid_to ?? "");
    setActionError(null);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    const parsed = parseMoneyInput(editPriceInput);
    if (parsed === null) {
      setActionError("Informe um preço válido (maior ou igual a zero) no formato pt-BR.");
      return;
    }
    if (!editReason.trim()) {
      setActionError("Informe o motivo do preço específico.");
      return;
    }
    if (!editValidFrom) {
      setActionError("Informe o início da vigência.");
      return;
    }
    if (editValidTo && editValidTo <= editValidFrom) {
      setActionError("A data final deve ser posterior à data inicial.");
      return;
    }
    setActionError(null);
    try {
      await updateOverride({
        overrideId: override.id,
        priceAmount: parsed,
        reason: editReason.trim(),
        validFrom: editValidFrom,
        validTo: editValidTo || null,
      });
      setEditing(false);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao atualizar preço específico");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Excluir este preço específico em rascunho? Esta ação não pode ser desfeita.")) return;
    setActionError(null);
    try {
      await deleteOverride(override.id);
      navigate(`/pricing/clients/${override.client_company_id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao excluir preço específico");
    }
  };

  const clientLabel =
    clientCompany?.legal_name ??
    clientCompany?.trade_name ??
    shortId(override.client_company_id);

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(`/pricing/clients/${override.client_company_id}`)}
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
        ← Voltar para o cliente
      </button>

      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)" }}>
          Preço específico
        </h1>
        <ClientBadges status={override.status} type="workflow" />
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", margin: "0 0 var(--space-3)" }}>
          Cliente e item
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
          {metaItem("Cliente", clientLabel)}
          {metaItem("ID do cliente", override.client_company_id)}
          {metaItem("Código do item", override.item_code_snapshot)}
          {metaItem("Nome do item", override.item_name_snapshot)}
          {metaItem("Tipo do item", override.item_type_snapshot)}
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", margin: "0 0 var(--space-3)" }}>
          Detalhes
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
          <div>
            <p style={labelStyle}>Preço</p>
            <p style={{ ...valueStyle, fontSize: "var(--text-lg)", color: "var(--color-primary)" }}>
              {formatCurrency(override.price_amount)}{" "}
              <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)", color: "var(--color-text-secondary)" }}>
                {override.currency}
              </span>
            </p>
          </div>
          {metaItem("Motivo", override.reason)}
          {metaItem(
            "Vigência",
            `${formatDate(override.valid_from)} → ${
              override.valid_to ? formatDate(override.valid_to) : "sem data final"
            }`
          )}
        </div>
      </div>

      {provenance && (
        <div style={cardStyle}>
          <ProvenancePanel provenance={provenance} priceAmount={override.price_amount} />
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", margin: "0 0 var(--space-3)" }}>
          Workflow
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
          {metaItem("Criado em", formatDateTime(override.created_at))}
          {override.submitted_at &&
            metaItem(
              "Enviado para revisão",
              `${formatDateTime(override.submitted_at)} · por ${shortId(override.submitted_by)}`
            )}
          {override.approved_at &&
            metaItem(
              "Aprovado",
              `${formatDateTime(override.approved_at)} · por ${shortId(override.approved_by)}`
            )}
          {override.published_at &&
            metaItem(
              "Publicado",
              `${formatDateTime(override.published_at)} · por ${shortId(override.published_by)}`
            )}
          {override.superseded_at &&
            metaItem(
              "Substituído",
              `${formatDateTime(override.superseded_at)} · por ${shortId(override.superseded_by)}`
            )}
          {override.cancelled_at &&
            metaItem(
              "Cancelado",
              `${formatDateTime(override.cancelled_at)} · por ${shortId(override.cancelled_by)}`
            )}
        </div>

        {workflowError && (
          <div
            role="alert"
            style={{
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-2) var(--space-3)",
              marginTop: "var(--space-3)",
            }}
          >
            <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{workflowError}</p>
            <button
              type="button"
              onClick={clearError}
              style={{
                marginTop: "var(--space-1)",
                fontSize: "var(--text-xs)",
                color: "var(--color-primary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Fechar
            </button>
          </div>
        )}

        <WorkflowActions
          status={override.status}
          type="override"
          permissions={{
            canView: true,
            canCreate: can("pricing.client.create"),
            canEdit: can("pricing.client.edit"),
            canReview: can("pricing.client.review"),
            canApprove: can("pricing.client.approve"),
            canPublish: can("pricing.client.publish"),
          }}
          pending={workflowPending}
          onAction={handleWorkflowAction}
        />

        {canEdit && (
          <div style={{ marginTop: "var(--space-3)" }}>
            <button
              type="button"
              onClick={() => setCaptureOpen(true)}
              style={{
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "transparent",
                color: "var(--color-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
              }}
            >
              Capturar referência da tabela atribuída
            </button>
          </div>
        )}
      </div>

      {actionError && (
        <div
          role="alert"
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2) var(--space-3)",
            marginBottom: "var(--space-4)",
          }}
        >
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{actionError}</p>
        </div>
      )}

      {canEdit && !editing && (
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          <button
            type="button"
            onClick={startEditing}
            style={{
              padding: "var(--space-2) var(--space-3)",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-text-inverse)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
            }}
          >
            Editar rascunho
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            style={{
              padding: "var(--space-2) var(--space-3)",
              backgroundColor: "transparent",
              color: "#DC2626",
              border: "1px solid #FECACA",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
            }}
          >
            Excluir rascunho
          </button>
        </div>
      )}

      {canEdit && editing && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", margin: "0 0 var(--space-3)" }}>
            Editar rascunho
          </h3>
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div>
              <label
                htmlFor="client-override-edit-price"
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
              >
                Preço (R$)
              </label>
              <input
                id="client-override-edit-price"
                type="text"
                inputMode="decimal"
                value={editPriceInput}
                onChange={(e) => setEditPriceInput(e.target.value)}
                placeholder="0,00"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                htmlFor="client-override-edit-reason"
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
              >
                Motivo *
              </label>
              <textarea
                id="client-override-edit-reason"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
              <div>
                <label
                  htmlFor="client-override-edit-from"
                  style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
                >
                  Início da vigência *
                </label>
                <input
                  id="client-override-edit-from"
                  type="date"
                  value={editValidFrom}
                  onChange={(e) => setEditValidFrom(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  htmlFor="client-override-edit-to"
                  style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
                >
                  Fim da vigência (opcional)
                </label>
                <input
                  id="client-override-edit-to"
                  type="date"
                  value={editValidTo}
                  onChange={(e) => setEditValidTo(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
            <button
              type="button"
              onClick={() => void handleSaveEdit()}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-text-inverse)",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-medium)",
                cursor: "pointer",
              }}
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {captureOpen && (
        <CaptureDialog
          overrideId={override.id}
          onClose={() => setCaptureOpen(false)}
          onComplete={() => {
            setCaptureOpen(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

export function ClientOverrideDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
