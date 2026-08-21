// ============================================================
// ClientOverrideNewPage — negotiated item-level price override.
// Currency is fixed to BRL; price uses pt-BR money input.
// ============================================================

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CatalogItemSelector } from "../components/CatalogItemSelector";
import { createOverride } from "../api/clientPrices";
import { formatCurrency, parseMoneyInput } from "../utils/format";

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

  const [catalogItemId, setCatalogItemId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [reason, setReason] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
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
        Você não tem permissão para criar preços específicos.
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

  const parsedPrice = parseMoneyInput(priceInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogItemId) {
      setError("Selecione o item de catálogo.");
      return;
    }
    if (parsedPrice === null) {
      setError("Informe um preço válido (maior ou igual a zero) no formato pt-BR.");
      return;
    }
    if (!reason.trim()) {
      setError("Informe o motivo do preço específico.");
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
      const created = await createOverride({
        orgId,
        clientCompanyId,
        catalogItemId,
        priceAmount: parsedPrice,
        reason: reason.trim(),
        validFrom,
        validTo: validTo || null,
      });
      navigate(`/pricing/clients/overrides/${created}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar preço específico");
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
        Novo Preço Específico
      </h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
        Registra um preço negociado por item para este cliente. O registro é
        criado como rascunho e percorre o workflow de revisão e publicação.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} style={cardStyle}>
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <div>
            <label
              htmlFor="client-override-item"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Item de catálogo
            </label>
            <CatalogItemSelector
              orgId={orgId}
              value={catalogItemId}
              onChange={setCatalogItemId}
              disabled={submitting}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-3)" }}>
            <div>
              <label
                htmlFor="client-override-price"
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
              >
                Preço (R$)
              </label>
              <input
                id="client-override-price"
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                disabled={submitting}
                placeholder="0,00"
                style={inputStyle}
              />
              {priceInput !== "" && parsedPrice !== null && (
                <p
                  style={{
                    marginTop: "var(--space-1)",
                    marginBottom: 0,
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Prévia: {formatCurrency(parsedPrice)}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="client-override-currency"
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
              >
                Moeda
              </label>
              <input
                id="client-override-currency"
                type="text"
                value="BRL"
                readOnly
                aria-readonly="true"
                style={{ ...inputStyle, backgroundColor: "var(--color-surface-secondary, #F8FAFC)", color: "var(--color-text-secondary)" }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="client-override-reason"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
            >
              Motivo *
            </label>
            <textarea
              id="client-override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={submitting}
              placeholder="Descreva a negociação que justifica este preço"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
            <div>
              <label
                htmlFor="client-override-valid-from"
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
              >
                Início da vigência *
              </label>
              <input
                id="client-override-valid-from"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                disabled={submitting}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                htmlFor="client-override-valid-to"
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-1)" }}
              >
                Fim da vigência (opcional)
              </label>
              <input
                id="client-override-valid-to"
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                disabled={submitting}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

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
            {submitting ? "Criando..." : "Criar preço específico"}
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

export function ClientOverrideNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
