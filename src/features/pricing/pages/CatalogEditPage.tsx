import { useParams, useNavigate } from "react-router-dom";
import { useCatalogItem } from "../catalog/hooks/useCatalog";
import { CatalogForm } from "../catalog/components/CatalogForm";

export function CatalogEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { item, loading, error } = useCatalogItem(id ?? null);

  if (!id) {
    navigate("/pricing/catalog");
    return null;
  }

  if (loading) {
    return <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>Carregando item...</div>;
  }

  if (error || !item) {
    return (
      <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
        <p style={{ color: "#991B1B" }}>{error ?? "Item não encontrado."}</p>
        <button onClick={() => navigate("/pricing/catalog")} style={{ marginTop: "var(--space-2)", padding: "var(--space-2) var(--space-3)", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}>
          Voltar ao catálogo
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <button
          onClick={() => navigate(`/pricing/catalog/${id}`)}
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
          ← Voltar ao item
        </button>
      </div>
      <CatalogForm mode="edit" initialData={item} />
    </div>
  );
}
