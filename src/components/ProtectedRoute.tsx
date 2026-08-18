import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
