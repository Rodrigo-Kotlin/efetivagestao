// ============================================================
// ClientAssignmentDetailPage — assignment workspace with workflow.
// All transitions route through fn_*_client_assignment RPCs.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ClientBadges } from "../components/ClientBadges";
import { WorkflowActions } from "../components/WorkflowActions";
import { useClientAssignmentWorkflow } from "../hooks/useClients";
import {
  deleteAssignment,
  fetchClientAssignment,
  fetchClientCompany,
  updateAssignment,
} from "../api/clientPrices";
import type { ClientAssignmentDetail } from "../types/client.types";
import { formatDate, formatDateTime } from "../utils/format";

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

function Inner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;
  const assignmentId = id ?? null;

  const [assignment, setAssignment] = useState<ClientAssignmentDetail | null>(null);
  const [clientCompany, setClientCompany] = useState<CompanyIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValidFrom, setEditValidFrom] = useState("");
  const [editValidTo, setEditValidTo] = useState("");
  const [editContractReference, setEditContractReference] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const {
    run,
    pending: workflowPending,
    error: workflowError,
    clearError,
  } = useClientAssignmentWorkflow();

  const load = useCallback(async () => {
    if (!orgId || !assignmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClientAssignment(assignmentId, orgId);
      setAssignment(data);
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
  }, [orgId, assignmentId]);

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
        Carregando atribuição...
      </p>
    );
  }

  if (error || !assignment) {
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
          {error ?? "Atribuição não encontrada."}
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

  const isDraft = assignment.status === "draft";
  const canEdit = isDraft && can("pricing.client.edit");

  const handleWorkflowAction = (action: string) => {
    const confirmations: Record<string, string> = {
      submit: "Enviar a atribuição para revisão?",
      return_to_draft: "Voltar a atribuição para rascunho?",
      approve: "Aprovar a atribuição?",
      cancel: "Cancelar a atribuição? Esta ação não pode ser desfeita.",
      publish:
        assignment.valid_from > new Date().toISOString().slice(0, 10)
          ? `A atribuição será agendada para entrar em vigor em ${formatDate(assignment.valid_from)}.`
          : "A atribuição entrará em vigor imediatamente. Continuar?",
    };
    if (!window.confirm(confirmations[action] ?? "Confirmar ação?")) return;
    clearError();
    void run(action as WorkflowAction, assignment.id).then(async (ok) => {
      if (ok) await load();
    });
  };

  const startEditing = () => {
    setEditValidFrom(assignment.valid_from);
    setEditValidTo(assignment.valid_to ?? "");
    setEditContractReference(assignment.contract_reference ?? "");
    setEditNotes(assignment.notes ?? "");
    setActionError(null);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
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
      await updateAssignment({
        assignmentId: assignment.id,
        validFrom: editValidFrom,
        validTo: editValidTo || null,
        contractReference: editContractReference.trim() || null,
        notes: editNotes.trim() || null,
      });
      setEditing(false);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao atualizar atribuição");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Excluir esta atribuição em rascunho? Esta ação não pode ser desfeita.")) return;
    setActionError(null);
    try {
      await deleteAssignment(assignment.id);
      navigate(`/pricing/clients/${assignment.client_company_id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao excluir atribuição");
    }
  };

  const clientLabel =
    clientCompany?.legal_name ??
    clientCompany?.trade_name ??
    shortId(assignment.client_company_id);

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(`/pricing/clients/${assignment.client_company_id}`)}
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
          Atribuição de tabela
        </h1>
        <ClientBadges status={assignment.status} type="workflow" />
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", margin: "0 0 var(--space-3)" }}>
          Cliente
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
          {metaItem("Cliente", clientLabel)}
          {metaItem("ID do cliente", assignment.client_company_id)}
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", margin: "0 0 var(--space-3)" }}>
          Tabela comercial
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
          {assignment.commercial_price_table ? (
            metaItem(
              "Tabela",
              `${assignment.commercial_price_table.code} — ${assignment.commercial_price_table.name}`
            )
          ) : (
            metaItem("Tabela (ID)", assignment.commercial_price_table_id)
          )}
          {metaItem("Status da tabela", assignment.commercial_price_table?.status ?? "—")}
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", margin: "0 0 var(--space-3)" }}>
          Detalhes
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
          {metaItem(
            "Vigência",
            `${formatDate(assignment.valid_from)} → ${
              assignment.valid_to ? formatDate(assignment.valid_to) : "sem data final"
            }`
          )}
          {metaItem("Contrato", assignment.contract_reference ?? "—")}
          {metaItem("Observações", assignment.notes ?? "—")}
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", margin: "0 0 var(--space-3)" }}>
          Workflow
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
          {metaItem("Criada em", formatDateTime(assignment.created_at))}
          {assignment.submitted_at &&
            metaItem(
              "Enviada para revisão",
              `${formatDateTime(assignment.submitted_at)} · por ${shortId(assignment.submitted_by)}`
            )}
          {assignment.approved_at &&
            metaItem(
              "Aprovada",
              `${formatDateTime(assignment.approved_at)} · por ${shortId(assignment.approved_by)}`
            )}
          {assignment.published_at &&
            metaItem(
              "Publicada",
              `${formatDateTime(assignment.published_at)} · por ${shortId(assignment.published_by)}`
            )}
          {assignment.superseded_at &&
            metaItem(
              "Substituída",
              `${formatDateTime(assignment.superseded_at)} · por ${shortId(assignment.superseded_by)}`
            )}
          {assignment.cancelled_at &&
            metaItem(
              "Cancelada",
              `${formatDateTime(assignment.cancelled_at)} · por ${shortId(assignment.cancelled_by)}`
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
          status={assignment.status}
          type="assignment"
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
              <div>
                <label
                  htmlFor="client-assignment-edit-from"
                  style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
                >
                  Início da vigência *
                </label>
                <input
                  id="client-assignment-edit-from"
                  type="date"
                  value={editValidFrom}
                  onChange={(e) => setEditValidFrom(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  htmlFor="client-assignment-edit-to"
                  style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
                >
                  Fim da vigência (opcional)
                </label>
                <input
                  id="client-assignment-edit-to"
                  type="date"
                  value={editValidTo}
                  onChange={(e) => setEditValidTo(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="client-assignment-edit-contract"
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
              >
                Referência do contrato (opcional)
              </label>
              <input
                id="client-assignment-edit-contract"
                type="text"
                value={editContractReference}
                onChange={(e) => setEditContractReference(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                htmlFor="client-assignment-edit-notes"
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
              >
                Observações (opcional)
              </label>
              <textarea
                id="client-assignment-edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
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
    </div>
  );
}

export function ClientAssignmentDetailPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
