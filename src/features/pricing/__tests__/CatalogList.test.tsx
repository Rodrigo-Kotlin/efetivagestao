import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CatalogList } from "../catalog/components/CatalogList";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@/features/core/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: { id: "test-user", email: "test@example.com" },
    session: {},
    profile: { full_name: "Test User" },
    memberships: [],
    activeOrganization: { id: "org-1", name: "Test Org" },
    userRoles: { roles: [], permissions: ["pricing.catalog.view"] },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    can: () => true,
    hasRole: () => false,
  }),
}));

vi.mock("@/features/pricing/catalog/hooks/useCatalog", () => ({
  useCatalogItems: () => ({
    data: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 0,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
}

describe("CatalogList", () => {
  it("renders empty state when no items", () => {
    renderWithRouter(<CatalogList />);
    expect(screen.getByText("Nenhum item cadastrado.")).toBeInTheDocument();
  });

  it("has search input", () => {
    renderWithRouter(<CatalogList />);
    expect(screen.getByLabelText("Buscar catálogo")).toBeInTheDocument();
  });

  it("has filter selects", () => {
    renderWithRouter(<CatalogList />);
    expect(screen.getByLabelText("Filtrar por tipo")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por status")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por execução")).toBeInTheDocument();
  });
});
