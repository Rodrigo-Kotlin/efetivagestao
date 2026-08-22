import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SuppliersPage } from "../pages/SuppliersPage";

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

describe("SuppliersPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders the page heading", () => {
    renderWithRouter(<SuppliersPage />);
    expect(screen.getByRole("heading", { name: "Fornecedores" })).toBeInTheDocument();
  });

  it("renders the primary action Novo Fornecedor", () => {
    renderWithRouter(<SuppliersPage />);
    expect(screen.getByRole("button", { name: /Novo Fornecedor/i })).toBeInTheDocument();
  });

  it("navigates to /pricing/suppliers/new when Novo Fornecedor clicked", () => {
    renderWithRouter(<SuppliersPage />);
    fireEvent.click(screen.getByRole("button", { name: /Novo Fornecedor/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/pricing/suppliers/new");
  });
});
