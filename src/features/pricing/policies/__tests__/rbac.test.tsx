import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PricingPoliciesPage } from "../pages/PricingPoliciesPage";
import { PricingPolicyVersionDetailPage } from "../pages/PricingPolicyVersionDetailPage";
import { PriceSimulatorPage } from "../pages/PriceSimulatorPage";

const h = vi.hoisted(() => {
  const rpc = vi.fn();
  let listRows: Record<string, unknown>[] = [];
  let versionRow: Record<string, unknown> | null = null;

  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    range: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: versionRow, error: null })),
    then: undefined,
  };

  return {
    rpc,
    chain,
    getListRows: () => listRows,
    setListRows: (rows: Record<string, unknown>[]) => { listRows = rows; },
    getVersionRow: () => versionRow,
    setVersionRow: (v: Record<string, unknown> | null) => { versionRow = v; },
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => h.rpc(...args),
    from: vi.fn(() => h.chain),
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1" } }, error: null })) },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

let canMock: (permission: string) => boolean;

vi.mock("@/features/core/useAuth", () => ({
  useAuth: () => ({
    activeOrganization: { id: "org-1" },
    can: (permission: string) => canMock(permission),
  }),
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "version-1" }),
  };
});

function makeVersion(status: string): Record<string, unknown> {
  return {
    id: "version-1",
    organization_id: "org-1",
    pricing_policy_id: "policy-1",
    version_number: 1,
    valid_from: "2026-01-01",
    valid_to: "2026-12-31",
    status,
    pricing_method: "target_margin",
    target_margin_rate: 0.2,
    markup_rate: null,
    fixed_price: null,
    minimum_margin_rate: 0.1,
    maximum_discount_rate: 0.1,
    rounding_mode: "none",
    rounding_step: null,
    notes: null,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    approved_by: null,
    approved_at: null,
    published_by: null,
    published_at: null,
    superseded_at: null,
    policy: {
      id: "policy-1",
      organization_id: "org-1",
      code: "POL-001",
      name: "Política padrão",
      description: null,
      scope_type: "default",
      catalog_category_id: null,
      catalog_item_id: null,
      status: "active",
      created_by: "user-1",
      created_at: "2026-01-01T00:00:00Z",
      updated_by: "user-1",
      updated_at: "2026-01-01T00:00:00Z",
    },
    components: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.rpc.mockReset();
  h.rpc.mockResolvedValue({ data: null, error: null });
  canMock = () => true;
  mockNavigate.mockReset();
});

describe("RBAC gating (UI-RBAC01..06)", () => {
  it("UI-RBAC01: policies page blocked without pricing.policy.view", () => {
    canMock = (p) => p !== "pricing.policy.view";
    render(
      <MemoryRouter>
        <PricingPoliciesPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Você não tem permissão/)).toBeInTheDocument();
  });

  it("UI-RBAC02: create button hidden without pricing.policy.create", async () => {
    (h.chain.range as Mock).mockResolvedValue({ data: h.getListRows(), error: null, count: 0 });
    canMock = (p) => p !== "pricing.policy.create";
    h.setListRows([]);

    render(
      <MemoryRouter>
        <PricingPoliciesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Nova política/i })).not.toBeInTheDocument();
    });
  });

  it("UI-RBAC02b: create button visible with pricing.policy.create", async () => {
    (h.chain.range as Mock).mockResolvedValue({ data: h.getListRows(), error: null, count: 0 });
    h.setListRows([]);

    render(
      <MemoryRouter>
        <PricingPoliciesPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("button", { name: /Nova política/i })).toBeInTheDocument();
  });

  it("UI-RBAC03: draft edit button hidden without pricing.policy.edit", async () => {
    h.setVersionRow(makeVersion("draft"));
    canMock = (p) => p !== "pricing.policy.edit";

    render(
      <MemoryRouter>
        <PricingPolicyVersionDetailPage />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: /Versão v1/ });
    expect(screen.queryByText("Editar rascunho")).not.toBeInTheDocument();
    expect(screen.queryByText("Enviar para revisão")).not.toBeInTheDocument();
  });

  it("UI-RBAC04: review actions hidden without pricing.policy.review", async () => {
    h.setVersionRow(makeVersion("under_review"));
    canMock = (p) => p !== "pricing.policy.review" && p !== "pricing.policy.approve";

    render(
      <MemoryRouter>
        <PricingPolicyVersionDetailPage />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: /Versão v1/ });
    expect(screen.queryByText("Voltar para rascunho")).not.toBeInTheDocument();
    expect(screen.queryByText("Aprovar")).not.toBeInTheDocument();
  });

  it("UI-RBAC05: approve hidden without pricing.policy.approve (review allowed)", async () => {
    h.setVersionRow(makeVersion("under_review"));
    canMock = (p) => p !== "pricing.policy.approve";

    render(
      <MemoryRouter>
        <PricingPolicyVersionDetailPage />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: /Versão v1/ });
    expect(screen.queryByText("Aprovar")).not.toBeInTheDocument();
    expect(screen.getByText("Voltar para rascunho")).toBeInTheDocument();
  });

  it("UI-RBAC06: simulator page blocked without pricing.calculate", () => {
    canMock = (p) => p !== "pricing.calculate";
    render(
      <MemoryRouter>
        <PriceSimulatorPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Você não tem permissão/)).toBeInTheDocument();
  });
});
