import { useParams, useNavigate } from "react-router-dom";
import { CatalogDetail } from "../catalog/components/CatalogDetail";

export function CatalogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate("/pricing/catalog");
    return null;
  }

  return (
    <div>
      <div style={{ marginBottom: "var(--space-4)" }}>
        <button
          onClick={() => navigate("/pricing/catalog")}
          style={{
            padding: "var(--space-1) var(--space-3)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
          }}
        >
          ← Voltar ao catálogo
        </button>
      </div>
      <CatalogDetail itemId={id} />
    </div>
  );
}
