import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/layouts/MainLayout";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { PricingDashboard } from "@/features/pricing/pages/PricingDashboard";
import { CatalogPage } from "@/features/pricing/pages/CatalogPage";
import { CatalogNewPage } from "@/features/pricing/pages/CatalogNewPage";
import { CatalogDetailPage } from "@/features/pricing/pages/CatalogDetailPage";
import { CatalogEditPage } from "@/features/pricing/pages/CatalogEditPage";
import { CategoriesPage } from "@/features/pricing/pages/CategoriesPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: "/",
            element: <HomePage />,
          },
          {
            path: "/pricing",
            element: <PricingDashboard />,
          },
          {
            path: "/pricing/catalog",
            element: <CatalogPage />,
          },
          {
            path: "/pricing/catalog/new",
            element: <CatalogNewPage />,
          },
          {
            path: "/pricing/catalog/:id",
            element: <CatalogDetailPage />,
          },
          {
            path: "/pricing/catalog/:id/edit",
            element: <CatalogEditPage />,
          },
          {
            path: "/pricing/categories",
            element: <CategoriesPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
