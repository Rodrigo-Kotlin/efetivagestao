import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SupplierList } from "../components/SupplierList";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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
    userRoles: { roles: [], permissions: ["pricing.supplier.view"] },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    can: () => true,
    hasRole: () => false,
  }),
}));

vi.mock("../hooks/useSuppliers", () => ({
  useSuppliers: () => ({
    data: [],
    total: 0,
    page: 1,
    pageSize: 25,
    loading: false,
    error: null,
    setPage: vi.fn(),
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

describe("SupplierList", () => {
  it("renders the title", () => {
    renderWithRouter(<SupplierList />);
    expect(screen.getByText("Fornecedores")).toBeInTheDocument();
  });

  it("renders empty state when no suppliers", () => {
    renderWithRouter(<SupplierList />);
    expect(screen.getByText(/Nenhum fornecedor cadastrado/)).toBeInTheDocument();
  });

  it("renders Novo Fornecedor button", () => {
    renderWithRouter(<SupplierList />);
    expect(screen.getByText("Novo Fornecedor")).toBeInTheDocument();
  });

  it("has search input", () => {
    renderWithRouter(<SupplierList />);
    expect(screen.getByLabelText(/Buscar fornecedores/)).toBeInTheDocument();
  });

  it("has filter selects", () => {
    renderWithRouter(<SupplierList />);
    expect(screen.getByLabelText(/Filtrar por categoria/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filtrar por status/)).toBeInTheDocument();
  });
});
