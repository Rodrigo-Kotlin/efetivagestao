import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";

vi.mock("@/features/core/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: { id: "test-user", email: "test@example.com" },
    session: {},
    profile: { full_name: "Test User" },
    memberships: [],
    activeOrganization: { name: "Test Org" },
    userRoles: { roles: [], permissions: [] },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    can: () => false,
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

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title", () => {
    renderWithRouter(<HomePage />);
    expect(screen.getByText("Efetiva Gestão")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    renderWithRouter(<HomePage />);
    expect(screen.getByText("Plataforma Integrada de Gestão Empresarial")).toBeInTheDocument();
  });

  it("renders all 12 module cards across sections", () => {
    renderWithRouter(<HomePage />);
    const availableList = screen.getByRole("list", { name: /módulos disponíveis/i });
    const futureList = screen.getByRole("list", { name: /próximos módulos/i });
    const availableCards = availableList.querySelectorAll('[role="listitem"]');
    const futureCards = futureList.querySelectorAll('[role="listitem"]');
    expect(availableCards.length + futureCards.length).toBe(12);
  });

  it("renders Preços & Exames as active with link to /pricing", () => {
    renderWithRouter(<HomePage />);
    const pricingCard = screen.getByRole("listitem", { name: /preços & exames/i });
    expect(pricingCard).toHaveAttribute("href", "/pricing");
    expect(pricingCard.tagName).toBe("A");
  });

  it("renders Clientes & CRM as coming soon", () => {
    renderWithRouter(<HomePage />);
    const clientesCard = screen.getByRole("listitem", { name: /clientes & crm/i });
    expect(within(clientesCard).getByText("Clientes & CRM")).toBeInTheDocument();
    expect(within(clientesCard).getByText("Em breve")).toBeInTheDocument();
    expect(clientesCard.tagName).not.toBe("A");
  });

  it("does not allow navigation for coming-soon modules", () => {
    renderWithRouter(<HomePage />);
    const comingSoonCards = screen.getAllByText("Em breve");
    expect(comingSoonCards.length).toBeGreaterThan(0);
    comingSoonCards.forEach((badge) => {
      const card = badge.closest('[role="listitem"]');
      expect(card?.tagName).not.toBe("A");
    });
  });
});
