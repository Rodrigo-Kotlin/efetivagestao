import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { VersionDetailPage } from "../pages/VersionDetailPage";
import type { CostTableVersionWithItems } from "@/types";

const h = vi.hoisted(() => {
  const rpc = vi.fn();
  let versionRow: Record<string, unknown> | null = null;

  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    range: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: versionRow, error: null })),
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
  },
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

function makeVersion(status: string): CostTableVersionWithItems {
  return {
    id: "version-1",
    organization_id: "org-1",
    cost_table_id: "table-1",
    version_number: 2,
    version_label: null,
    source_date: null,
    valid_from: "2026-01-01",
    valid_to: "2026-12-31",
    status: status as CostTableVersionWithItems["status"],
    source_file_name: null,
    source_file_hash: null,
    source_document_id: null,
    notes: null,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    approved_by: null,
    approved_at: null,
    published_by: null,
    published_at: null,
    superseded_at: null,
    items: [],
    cost_table: {
      id: "table-1",
      organization_id: "org-1",
      supplier_company_id: "supplier-1",
      code: "TAB-001",
      name: "Tabela 2026",
      description: null,
      status: "active",
      created_by: "user-1",
      created_at: "2026-01-01T00:00:00Z",
      updated_by: "user-1",
      updated_at: "2026-01-01T00:00:00Z",
      archived_at: null,
      archived_by: null,
      supplier: {} as CostTableVersionWithItems["cost_table"]["supplier"],
    },
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <VersionDetailPage />
    </MemoryRouter>
  );
}

async function loadPage() {
  renderPage();
  await screen.findByText("Versão 2");
}

beforeEach(() => {
  h.rpc.mockReset();
  h.rpc.mockResolvedValue({ error: null, data: null });
  canMock = () => true;
  mockNavigate.mockReset();
});

describe("VersionDetailPage workflow (UI-WF01..06)", () => {
  it("UI-WF01: draft submit calls fn_submit_cost_version", async () => {
    h.setVersionRow(makeVersion("draft"));
    await loadPage();

    fireEvent.click(screen.getByText("Enviar para Revisão"));

    await waitFor(() => {
      expect(h.rpc).toHaveBeenCalledWith("fn_submit_cost_version", { p_version_id: "version-1" });
    });
  });

  it("UI-WF02: under_review approve calls fn_approve_cost_version", async () => {
    h.setVersionRow(makeVersion("under_review"));
    await loadPage();

    fireEvent.click(screen.getByText("Aprovar"));

    await waitFor(() => {
      expect(h.rpc).toHaveBeenCalledWith("fn_approve_cost_version", { p_version_id: "version-1" });
    });
  });

  it("UI-WF03: approved publish calls fn_publish_cost_version", async () => {
    h.setVersionRow(makeVersion("approved"));
    await loadPage();

    fireEvent.click(screen.getByText("Publicar"));

    await waitFor(() => {
      expect(h.rpc).toHaveBeenCalledWith("fn_publish_cost_version", { p_version_id: "version-1" });
    });
  });

  it("UI-WF04: publish action hidden without pricing.cost.publish", async () => {
    canMock = (permission) => permission !== "pricing.cost.publish";
    h.setVersionRow(makeVersion("approved"));
    await loadPage();

    expect(screen.queryByText("Publicar")).not.toBeInTheDocument();
  });

  it("UI-WF05: RPC failure surfaces a friendly error message", async () => {
    h.rpc.mockResolvedValueOnce({
      error: { message: "Version must have at least one cost item" },
      data: null,
    });
    h.setVersionRow(makeVersion("draft"));
    await loadPage();

    fireEvent.click(screen.getByText("Enviar para Revisão"));

    expect(await screen.findByText("Adicione ao menos um item de custo antes de enviar para revisão.")).toBeInTheDocument();
  });

  it("UI-WF06: successful submit refetches authoritative state", async () => {
    h.setVersionRow(makeVersion("draft"));
    await loadPage();

    const singleCallsBefore = (h.chain.single as ReturnType<typeof vi.fn>).mock.calls.length;

    h.setVersionRow(makeVersion("under_review"));
    fireEvent.click(screen.getByText("Enviar para Revisão"));

    await waitFor(() => {
      const singleCallsAfter = (h.chain.single as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(singleCallsAfter).toBeGreaterThan(singleCallsBefore);
    });
    expect(await screen.findByText("Em Revisão")).toBeInTheDocument();
  });
});
