import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CommercialPriceTablesPage } from "../pages/CommercialPriceTablesPage";

const mockNavigate = vi.fn();
const mockCan = vi.fn();

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
    userRoles: { roles: [], permissions: [] },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    can: mockCan,
    hasRole: () => false,
  }),
}));

vi.mock("../hooks/useCommercial", () => ({
  useCommercialTables: () => ({
    data: [],
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

describe("CommercialPriceTablesPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCan.mockReset();
  });

  it("renders the page heading", () => {
    mockCan.mockReturnValue(true);
    renderWithRouter(<CommercialPriceTablesPage />);
    expect(screen.getByRole("heading", { name: "Tabelas Comerciais" })).toBeInTheDocument();
  });

  it("renders the primary action Nova tabela", () => {
    mockCan.mockReturnValue(true);
    renderWithRouter(<CommercialPriceTablesPage />);
    expect(screen.getByRole("button", { name: /Nova tabela/i })).toBeInTheDocument();
  });

  it("navigates to /pricing/commercial/new when Nova tabela clicked", () => {
    mockCan.mockReturnValue(true);
    renderWithRouter(<CommercialPriceTablesPage />);
    fireEvent.click(screen.getByRole("button", { name: /Nova tabela/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/pricing/commercial/new");
  });

  it("hides create action without pricing.commercial.create permission", () => {
    mockCan.mockImplementation(() => false);
    renderWithRouter(<CommercialPriceTablesPage />);
    expect(screen.queryByRole("button", { name: /Nova tabela/i })).not.toBeInTheDocument();
  });
});
