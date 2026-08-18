import { useNavigate } from "react-router-dom";
import { CategoryManager } from "../catalog/components/CategoryManager";

export function CategoriesPage() {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ marginBottom: "var(--space-4)" }}>
        <button
          onClick={() => navigate("/pricing")}
          style={{
            padding: "var(--space-1) var(--space-3)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
          }}
        >
          ← Voltar a Preços & Exames
        </button>
      </div>
      <CategoryManager />
    </div>
  );
}
