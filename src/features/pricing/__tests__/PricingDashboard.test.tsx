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
    userRoles: { roles: [], permissions: ["pricing.catalog.view", "pricing.supplier.view"] },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    can: (perm: string) => ["pricing.catalog.view", "pricing.supplier.view"].includes(perm),
    hasRole: () => false,
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
    expect(screen.getByRole("heading", { name: "Preços & Exames" })).toBeInTheDocument();
  });

  it("renders the MVP description", () => {
    renderWithRouter(<PricingDashboard />);
    expect(screen.getByText(/Cadastre fornecedores e exames/)).toBeInTheDocument();
  });

  it("renders exactly four MVP cards", () => {
    renderWithRouter(<PricingDashboard />);
    expect(screen.getByText("Fornecedores")).toBeInTheDocument();
    expect(screen.getByText("Exames")).toBeInTheDocument();
    expect(screen.getByText("Custos & Comparativo")).toBeInTheDocument();
    expect(screen.getByText("Tabela de Preços")).toBeInTheDocument();
  });

  it("Fornecedores card navigates to /pricing/suppliers", () => {
    renderWithRouter(<PricingDashboard />);
    const card = screen.getByRole("link", { name: "Fornecedores" });
    expect(card).toHaveAttribute("href", "/pricing/suppliers");
  });

  it("Exames card navigates to /pricing/catalog", () => {
    renderWithRouter(<PricingDashboard />);
    const card = screen.getByRole("link", { name: "Exames" });
    expect(card).toHaveAttribute("href", "/pricing/catalog");
  });

  it("Custos & Comparativo is not navigational and shows Em implantação", () => {
    renderWithRouter(<PricingDashboard />);
    const card = screen.getByLabelText("Custos & Comparativo — Em implantação");
    expect(card.tagName).not.toBe("A");
    expect(screen.getAllByText("Em implantação").length).toBe(2);
  });

  it("Tabela de Preços is not navigational and shows Em implantação", () => {
    renderWithRouter(<PricingDashboard />);
    const card = screen.getByLabelText("Tabela de Preços — Em implantação");
    expect(card.tagName).not.toBe("A");
  });

  it("does not render advanced pricing modules", () => {
    renderWithRouter(<PricingDashboard />);
    expect(screen.queryByText("Políticas de Preço")).not.toBeInTheDocument();
    expect(screen.queryByText("Simulador de Preço")).not.toBeInTheDocument();
    expect(screen.queryByText("Tabelas Comerciais")).not.toBeInTheDocument();
    expect(screen.queryByText("Clientes")).not.toBeInTheDocument();
    expect(screen.queryByText("Importações")).not.toBeInTheDocument();
    expect(screen.queryByText("Conciliação")).not.toBeInTheDocument();
    expect(screen.queryByText("Mercado")).not.toBeInTheDocument();
  });

  it("does not render old KPI summary", () => {
    renderWithRouter(<PricingDashboard />);
    expect(screen.queryByText("Itens Ativos")).not.toBeInTheDocument();
    expect(screen.queryByText("Rascunhos")).not.toBeInTheDocument();
    expect(screen.queryByText("Inativos")).not.toBeInTheDocument();
    expect(screen.queryByText("Categorias")).not.toBeInTheDocument();
    expect(screen.queryByText("Resumo")).not.toBeInTheDocument();
    expect(screen.queryByText("Próximos recursos")).not.toBeInTheDocument();
  });
});
