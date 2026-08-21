// ============================================================
// ClientPricingNewPage — create a client profile from a company.
// ============================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CompanySelector } from "../components/CompanySelector";
import { createClientProfile } from "../api/clientPrices";

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4)",
  maxWidth: "640px",
};

function Inner() {
  const navigate = useNavigate();
  const { activeOrganization, can } = useAuth();
  const orgId = activeOrganization?.id;
  const [companyId, setCompanyId] = useState<string | null>(null);
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
        Você não tem permissão para criar clientes.
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      setError("Selecione uma empresa para criar o cliente.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createClientProfile({ companyId, orgId });
      navigate(`/pricing/clients/${companyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar cliente");
      setSubmitting(false);
    }
  };

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
      <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", marginBottom: "var(--space-2)" }}>
        Novo Cliente
      </h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
        Cria um perfil de cliente a partir de uma empresa ativa que ainda não
        possui perfil de cliente nesta organização.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} style={cardStyle}>
        <div style={{ marginBottom: "var(--space-3)" }}>
          <label
            htmlFor="client-new-company"
            style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}
          >
            Empresa (sem perfil de cliente)
          </label>
          <CompanySelector
            orgId={orgId}
            value={companyId}
            onChange={setCompanyId}
            disabled={submitting}
            excludeExisting
          />
        </div>

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
              marginBottom: "var(--space-3)",
            }}
          >
            <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: "var(--space-2)" }}>
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
            {submitting ? "Criando..." : "Criar cliente"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/pricing/clients")}
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

export function ClientPricingNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
