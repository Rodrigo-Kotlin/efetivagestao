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
import { SuppliersPage } from "@/features/pricing/suppliers/pages/SuppliersPage";
import { SupplierNewPage } from "@/features/pricing/suppliers/pages/SupplierNewPage";
import { SupplierDetailPage } from "@/features/pricing/suppliers/pages/SupplierDetailPage";
import { SupplierEditPage } from "@/features/pricing/suppliers/pages/SupplierEditPage";
import { CostsPage } from "@/features/pricing/costs/pages/CostsPage";
import { CostNewPage } from "@/features/pricing/costs/pages/CostNewPage";
import { CostDetailPage } from "@/features/pricing/costs/pages/CostDetailPage";
import { VersionDetailPage } from "@/features/pricing/costs/pages/VersionDetailPage";
import { VersionNewPage } from "@/features/pricing/costs/pages/VersionNewPage";

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
          {
            path: "/pricing/suppliers",
            element: <SuppliersPage />,
          },
          {
            path: "/pricing/suppliers/new",
            element: <SupplierNewPage />,
          },
          {
            path: "/pricing/suppliers/:id",
            element: <SupplierDetailPage />,
          },
          {
            path: "/pricing/suppliers/:id/edit",
            element: <SupplierEditPage />,
          },
          {
            path: "/pricing/costs",
            element: <CostsPage />,
          },
          {
            path: "/pricing/costs/new",
            element: <CostNewPage />,
          },
          {
            path: "/pricing/costs/:id",
            element: <CostDetailPage />,
          },
          {
            path: "/pricing/costs/:id/versions/new",
            element: <VersionNewPage />,
          },
          {
            path: "/pricing/costs/versions/:id",
            element: <VersionDetailPage />,
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
