export function PricingPage() {
  return (
    <div>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: "var(--font-bold)",
          color: "var(--color-text)",
          marginBottom: "var(--space-4)",
        }}
      >
        Preços & Exames
      </h1>
      <div
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-8)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            backgroundColor: "var(--color-primary-100)",
            borderRadius: "var(--radius-full)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "var(--space-4)",
            fontSize: "var(--text-2xl)",
          }}
          aria-hidden="true"
        >
          🚧
        </div>
        <h2
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: "var(--font-semibold)",
            color: "var(--color-text)",
            marginBottom: "var(--space-2)",
          }}
        >
          Módulo em preparação
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            maxWidth: "400px",
            margin: "0 auto",
          }}
        >
          O módulo de Catálogo, Custos e Preços está sendo desenvolvido e estará disponível
          em breve.
        </p>
      </div>
    </div>
  );
}
