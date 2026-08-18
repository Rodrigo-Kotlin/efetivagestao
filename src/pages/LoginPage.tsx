import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";

export function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
        role="status"
        aria-label="Carregando"
      >
        <p style={{ color: "var(--color-text-secondary)" }}>Carregando...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "var(--space-4)",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "var(--space-8)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              backgroundColor: "var(--color-primary)",
              borderRadius: "var(--radius-lg)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-inverse)",
              fontWeight: "var(--font-bold)",
              fontSize: "var(--text-2xl)",
              marginBottom: "var(--space-4)",
            }}
            aria-hidden="true"
          >
            E
          </div>
          <h1
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--font-bold)",
              color: "var(--color-text)",
              marginBottom: "var(--space-1)",
            }}
          >
            Efetiva Gestão
          </h1>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
            }}
          >
            Plataforma Integrada de Gestão Empresarial
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              role="alert"
              style={{
                backgroundColor: "#FEF2F2",
                color: "var(--color-error)",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                marginBottom: "var(--space-4)",
                border: "1px solid #FECACA",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: "var(--space-4)" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-medium)",
                color: "var(--color-text)",
                marginBottom: "var(--space-1)",
              }}
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-base)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text)",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "var(--space-6)" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-medium)",
                color: "var(--color-text)",
                marginBottom: "var(--space-1)",
              }}
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-base)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text)",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "var(--space-3)",
              backgroundColor: isSubmitting ? "var(--color-primary-light)" : "var(--color-primary)",
              color: "var(--color-text-inverse)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-semibold)",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.8 : 1,
            }}
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
