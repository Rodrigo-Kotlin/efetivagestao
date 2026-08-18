import { useNavigate } from "react-router-dom";
import { CatalogForm } from "../catalog/components/CatalogForm";

export function CatalogNewPage() {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <button
          onClick={() => navigate("/pricing/catalog")}
          style={{
            padding: "var(--space-1) var(--space-3)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            marginBottom: "var(--space-2)",
          }}
        >
          ← Voltar ao catálogo
        </button>
      </div>
      <CatalogForm mode="create" />
    </div>
  );
}
