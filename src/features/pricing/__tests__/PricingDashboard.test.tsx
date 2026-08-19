import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PricingDashboard } from "../pages/PricingDashboard";

vi.mock("@/features/core/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: { id: "test-user", email: "test@example.com" },
    session: {},
    profile: { full_name: "Test User" },
    memberships: [],
    activeOrganization: { id: "org-1", name: "Test Org" },
    userRoles: { roles: [], permissions: ["pricing.catalog.view", "pricing.supplier.view", "pricing.cost.view"] },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    can: (perm: string) => ["pricing.catalog.view", "pricing.supplier.view", "pricing.cost.view"].includes(perm),
    hasRole: () => false,
  }),
}));

vi.mock("@/features/pricing/catalog/hooks/useCatalog", () => ({
  useCatalogStats: () => ({
    stats: { total_active: 10, total_draft: 3, total_inactive: 2, total_categories: 5 },
    loading: false,
    error: null,
  }),
}));

function renderWithRouter(ui: React.ReactElement, route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
}

describe("PricingDashboard", () => {
  it("renders the page title", () => {
    renderWithRouter(<PricingDashboard />);
    expect(screen.getByText("Preços & Exames")).toBeInTheDocument();
  });

  it("renders the description", () => {
    renderWithRouter(<PricingDashboard />);
    expect(screen.getByText(/Catálogo, custos, margens/)).toBeInTheDocument();
  });

  it("shows catalog stats", () => {
    renderWithRouter(<PricingDashboard />);
    expect(screen.getByText("Itens Ativos")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Rascunhos")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders Catálogo Mestre as available", () => {
    renderWithRouter(<PricingDashboard />);
    expect(screen.getByText("Catálogo Mestre")).toBeInTheDocument();
    const availableBadges = screen.getAllByText("Disponível");
    expect(availableBadges.length).toBeGreaterThanOrEqual(2);
  });

  it("renders Fornecedores as available and future modules as coming soon", () => {
    renderWithRouter(<PricingDashboard />);
    expect(screen.getByText("Fornecedores")).toBeInTheDocument();
    const availableBadges = screen.getAllByText("Disponível");
    expect(availableBadges.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Custos")).toBeInTheDocument();
    const comingSoonBadges = screen.getAllByText("Em breve");
    expect(comingSoonBadges.length).toBeGreaterThan(0);
  });
});
