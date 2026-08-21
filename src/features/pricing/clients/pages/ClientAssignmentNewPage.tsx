// ============================================================
// ClientAssignmentNewPage — assign a commercial table to a client.
// ============================================================

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommercialTableSelector } from "../components/CommercialTableSelector";
import { createAssignment } from "../api/clientPrices";

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4)",
  maxWidth: "640px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
  fontFamily: "inherit",
};

function Inner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;
  const clientCompanyId = id ?? null;

  const [tableId, setTableId] = useState<string | null>(null);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [contractReference, setContractReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!can("pricing.client.create")) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Você não tem permissão para criar atribuições.
      </div>
    );
  }

  if (!orgId) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Selecione uma organização ativa.
      </div>
    );
  }

  if (!clientCompanyId) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Cliente não informado.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableId) {
      setError("Selecione a tabela comercial.");
      return;
    }
    if (!validFrom) {
      setError("Informe o início da vigência.");
      return;
    }
    if (validTo && validTo <= validFrom) {
      setError("A data final deve ser posterior à data inicial.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createAssignment({
        orgId,
        clientCompanyId,
        commercialPriceTableId: tableId,
        validFrom,
        validTo: validTo || null,
        contractReference: contractReference.trim() || null,
        notes: notes.trim() || null,
      });
      navigate(`/pricing/clients/assignments/${created}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar atribuição");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(`/pricing/clients/${clientCompanyId}`)}
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
      <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", marginBottom: "var(--space-2)" }}>
        Nova Atribuição de Tabela
      </h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
        Atribui uma tabela comercial estável ao cliente. O registro é criado
        como rascunho e percorre o workflow de revisão e publicação.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} style={cardStyle}>
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <div>
            <label
              htmlFor="client-assignment-table"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Tabela comercial
            </label>
            <CommercialTableSelector
              orgId={orgId}
              value={tableId}
              onChange={setTableId}
              disabled={submitting}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
            <div>
              <label
                htmlFor="client-assignment-valid-from"
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
              >
                Início da vigência *
              </label>
              <input
                id="client-assignment-valid-from"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                disabled={submitting}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                htmlFor="client-assignment-valid-to"
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
              >
                Fim da vigência (opcional)
              </label>
              <input
                id="client-assignment-valid-to"
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                disabled={submitting}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="client-assignment-contract"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Referência do contrato (opcional)
            </label>
            <input
              id="client-assignment-contract"
              type="text"
              value={contractReference}
              onChange={(e) => setContractReference(e.target.value)}
              disabled={submitting}
              placeholder="Ex.: CT-2026-014"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="client-assignment-notes"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Observações (opcional)
            </label>
            <textarea
              id="client-assignment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={submitting}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </div>

        <p
          style={{
            marginTop: "var(--space-3)",
            marginBottom: 0,
            fontSize: "var(--text-xs)",
            color: "var(--color-text-secondary)",
          }}
        >
          A versão aplicável será determinada automaticamente pela vigência da
          tabela comercial.
        </p>

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

        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-text-inverse)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Criando..." : "Criar atribuição"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/pricing/clients/${clientCompanyId}`)}
            disabled={submitting}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              cursor: submitting ? "default" : "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export function ClientAssignmentNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
