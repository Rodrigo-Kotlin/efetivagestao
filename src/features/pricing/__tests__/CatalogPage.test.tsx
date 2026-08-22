import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CatalogPage } from "../pages/CatalogPage";

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

describe("CatalogPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders the page heading", () => {
    renderWithRouter(<CatalogPage />);
    expect(screen.getByRole("heading", { name: "Exames" })).toBeInTheDocument();
  });

  it("renders the primary action Novo exame", () => {
    renderWithRouter(<CatalogPage />);
    expect(screen.getByRole("button", { name: /Novo exame/i })).toBeInTheDocument();
  });

  it("navigates to /pricing/catalog/new when Novo exame clicked", () => {
    renderWithRouter(<CatalogPage />);
    fireEvent.click(screen.getByRole("button", { name: /Novo exame/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/pricing/catalog/new");
  });
});
