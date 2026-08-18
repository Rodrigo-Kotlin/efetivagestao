import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/features/core/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { router } from "@/routes";

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
