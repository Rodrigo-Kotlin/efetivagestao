import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PricingPoliciesPage } from "../pages/PricingPoliciesPage";

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

vi.mock("../hooks/usePricingPolicies", () => ({
  usePricingPolicies: () => ({
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

describe("PricingPoliciesPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCan.mockReset();
  });

  it("renders the page heading", () => {
    mockCan.mockReturnValue(true);
    renderWithRouter(<PricingPoliciesPage />);
    expect(screen.getByRole("heading", { name: "Políticas de Preço" })).toBeInTheDocument();
  });

  it("renders the primary action Nova política", () => {
    mockCan.mockReturnValue(true);
    renderWithRouter(<PricingPoliciesPage />);
    expect(screen.getByRole("button", { name: /Nova política/i })).toBeInTheDocument();
  });

  it("navigates to /pricing/policies/new when Nova política clicked", () => {
    mockCan.mockReturnValue(true);
    renderWithRouter(<PricingPoliciesPage />);
    fireEvent.click(screen.getByRole("button", { name: /Nova política/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/pricing/policies/new");
  });

  it("hides create action without pricing.policy.create permission", () => {
    mockCan.mockImplementation(() => false);
    renderWithRouter(<PricingPoliciesPage />);
    expect(screen.queryByRole("button", { name: /Nova política/i })).not.toBeInTheDocument();
  });
});
