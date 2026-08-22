import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PricingPolicyVersionDetailPage } from "../pages/PricingPolicyVersionDetailPage";

const h = vi.hoisted(() => {
  const rpc = vi.fn();
  let versionRow: Record<string, unknown> | null = null;
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    range: vi.fn(() => chain),
    update: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: versionRow, error: null })),
    then: undefined,
  };
  return {
    rpc,
    chain,
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

function renderPage() {
  return render(
    <MemoryRouter>
      <PricingPolicyVersionDetailPage />
    </MemoryRouter>
  );
}

async function loadPage() {
  renderPage();
  await screen.findByRole("heading", { name: /Versão v1/ });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.rpc.mockReset();
  h.rpc.mockResolvedValue({ error: null, data: null });
  canMock = () => true;
  mockNavigate.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("Pricing policy version workflow (UI-WF01..09)", () => {
  it("UI-WF01: draft submit calls fn_submit_pricing_policy_version", async () => {
    h.setVersionRow(makeVersion("draft"));
    await loadPage();

    fireEvent.click(screen.getByText("Enviar para revisão"));

    await waitFor(() => {
      expect(h.rpc).toHaveBeenCalledWith("fn_submit_pricing_policy_version", { p_version_id: "version-1" });
    });
  });

  it("UI-WF02: under_review approve calls fn_approve_pricing_policy_version", async () => {
    h.setVersionRow(makeVersion("under_review"));
    await loadPage();

    fireEvent.click(screen.getByText("Aprovar"));

    await waitFor(() => {
      expect(h.rpc).toHaveBeenCalledWith("fn_approve_pricing_policy_version", { p_version_id: "version-1" });
    });
  });

  it("UI-WF03: approved publish calls fn_publish_pricing_policy_version", async () => {
    h.setVersionRow(makeVersion("approved"));
    await loadPage();

    fireEvent.click(screen.getByText("Publicar / Agendar"));

    await waitFor(() => {
      expect(h.rpc).toHaveBeenCalledWith("fn_publish_pricing_policy_version", { p_version_id: "version-1" });
    });
  });

  it("UI-WF04: cancel from draft calls fn_cancel_pricing_policy_version", async () => {
    h.setVersionRow(makeVersion("draft"));
    await loadPage();

    fireEvent.click(screen.getByText("Cancelar"));

    await waitFor(() => {
      expect(h.rpc).toHaveBeenCalledWith("fn_cancel_pricing_policy_version", { p_version_id: "version-1" });
    });
  });

  it("UI-WF05: under_review return_to_draft calls fn_return_pricing_policy_version_to_draft", async () => {
    h.setVersionRow(makeVersion("under_review"));
    await loadPage();

    fireEvent.click(screen.getByText("Voltar para rascunho"));

    await waitFor(() => {
      expect(h.rpc).toHaveBeenCalledWith("fn_return_pricing_policy_version_to_draft", { p_version_id: "version-1" });
    });
  });

  it("UI-WF06: terminal states hide all workflow actions", async () => {
    for (const status of ["active", "superseded", "cancelled", "scheduled"]) {
      cleanup();
      vi.clearAllMocks();
      canMock = () => true;
      h.rpc.mockResolvedValue({ error: null, data: null });

      h.setVersionRow(makeVersion(status));
      renderPage();
      await screen.findByRole("heading", { name: /Versão v1/ });

      expect(screen.queryByText("Enviar para revisão")).not.toBeInTheDocument();
      expect(screen.queryByText("Aprovar")).not.toBeInTheDocument();
      expect(screen.queryByText("Publicar / Agendar")).not.toBeInTheDocument();
      expect(screen.queryByText("Cancelar")).not.toBeInTheDocument();
    }
  });

  it("UI-WF07: RPC failure surfaces a friendly mapped error", async () => {
    h.rpc.mockResolvedValueOnce({
      error: { message: "Only approved versions can be published" },
      data: null,
    });
    h.setVersionRow(makeVersion("approved"));
    await loadPage();

    fireEvent.click(screen.getByText("Publicar / Agendar"));

    expect(await screen.findByText("Somente versões aprovadas podem ser publicadas.")).toBeInTheDocument();
  });

  it("UI-WF08: publish action hidden without pricing.policy.publish", async () => {
    canMock = (p) => p !== "pricing.policy.publish";
    h.setVersionRow(makeVersion("approved"));
    await loadPage();

    expect(screen.queryByText("Publicar / Agendar")).not.toBeInTheDocument();
  });

  it("UI-WF09: successful action refetches authoritative state", async () => {
    h.setVersionRow(makeVersion("draft"));
    await loadPage();

    const singleCallsBefore = (h.chain.single as ReturnType<typeof vi.fn>).mock.calls.length;

    h.setVersionRow(makeVersion("under_review"));
    fireEvent.click(screen.getByText("Enviar para revisão"));

    await waitFor(() => {
      const singleCallsAfter = (h.chain.single as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(singleCallsAfter).toBeGreaterThan(singleCallsBefore);
    });
    // The status badge now uses statusLabel mapping: "under_review" → "Em revisão"
    expect(await screen.findByText("Em revisão")).toBeInTheDocument();
  });
});