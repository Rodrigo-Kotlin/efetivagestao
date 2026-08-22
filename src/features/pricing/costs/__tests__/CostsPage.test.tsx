import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CostsPage } from "../pages/CostsPage";

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

vi.mock("../hooks/useCosts", () => ({
  useCostTables: () => ({
    data: [],
    total: 0,
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

describe("CostsPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCan.mockReset();
  });

  it("renders the page heading", () => {
    mockCan.mockReturnValue(true);
    renderWithRouter(<CostsPage />);
    expect(screen.getByRole("heading", { name: "Custos" })).toBeInTheDocument();
  });

  it("renders the primary action Nova tabela de custo", () => {
    mockCan.mockReturnValue(true);
    renderWithRouter(<CostsPage />);
    expect(screen.getByRole("button", { name: /Nova tabela de custo/i })).toBeInTheDocument();
  });

  it("navigates to /pricing/costs/new when Nova tabela de custo clicked", () => {
    mockCan.mockReturnValue(true);
    renderWithRouter(<CostsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Nova tabela de custo/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/pricing/costs/new");
  });

  it("hides create action without pricing.cost.create permission", () => {
    mockCan.mockImplementation(() => false);
    renderWithRouter(<CostsPage />);
    expect(screen.queryByRole("button", { name: /Nova tabela de custo/i })).not.toBeInTheDocument();
  });
});
