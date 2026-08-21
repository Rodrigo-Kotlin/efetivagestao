// ============================================================
// CUI-CRBAC01..CUI-CRBAC08 — RBAC tests for the client pricing UI.
// Role→permission maps mirror supabase/migrations/038_client_pricing_security.sql:
//   admin: all six · manager: all except publish
//   operator/viewer: view only.
// ============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ClientPricingListPage } from "../pages/ClientPricingListPage";
import { ClientPricingDetailPage } from "../pages/ClientPricingDetailPage";
import { ClientLookupPage } from "../pages/ClientLookupPage";
import { WorkflowActions } from "../components/WorkflowActions";
import {
  CLIENT_PERMISSIONS,
  type ClientPermissions,
} from "../types/client.types";

const h = vi.hoisted(() => {
  const rpc = vi.fn();
  // Configurable results, read at await time:
  //   single → maybeSingle/single terminals (row lookups)
  //   range  → paginated lists terminated by .range()
  //   list   → any other directly-awaited builder (.order/.in/.eq/...)
  const state = {
    list: { data: [] as unknown[], error: null as null, count: 0 },
    range: { data: [] as unknown[], error: null as null, count: 0 },
    single: { data: null as unknown, error: null as unknown },
  };
  const makeChain = () => {
    const ops: string[] = [];
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const name of [
      "select",
      "eq",
      "order",
      "range",
      "limit",
      "in",
      "ilike",
      "insert",
      "update",
      "delete",
    ]) {
      chain[name] = vi.fn(() => {
        ops.push(name);
        return chain;
      });
    }
    chain.maybeSingle = vi.fn(() => Promise.resolve(state.single));
    chain.single = vi.fn(() => Promise.resolve(state.single));
    (chain as unknown as { then: unknown }).then = (
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => {
      const result = ops[ops.length - 1] === "range" ? state.range : state.list;
      return Promise.resolve(result).then(onFulfilled, onRejected);
    };
    return chain;
  };
  return { rpc, from: vi.fn((_table: string) => makeChain()), state };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => h.rpc(...args),
    from: (table: string) => h.from(table),
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "u1" } }, error: null })) },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

let canMock: (permission: string) => boolean;

// Stable identity across renders — mirrors AuthContext's useCallback'd can.
// A fresh arrow per render would re-trigger useClientList's effect loop.
const ORG = { id: "org-1" };
const stableCan = (permission: string) => canMock(permission);

vi.mock("@/features/core/useAuth", () => ({
  useAuth: () => ({
    activeOrganization: ORG,
    can: stableCan,
  }),
}));

const PROFILE_ROW = {
  company_id: "company-1",
  organization_id: "org-1",
  status: "active",
  commercial_notes: null,
  status_reason: null,
  created_by: "u1",
  created_at: "2026-01-01T00:00:00Z",
  updated_by: "u1",
  updated_at: "2026-01-10T12:00:00Z",
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    "pricing.client.view",
    "pricing.client.create",
    "pricing.client.edit",
    "pricing.client.review",
    "pricing.client.approve",
    "pricing.client.publish",
  ],
  manager: [
    "pricing.client.view",
    "pricing.client.create",
    "pricing.client.edit",
    "pricing.client.review",
    "pricing.client.approve",
  ],
  operator: ["pricing.client.view"],
  viewer: ["pricing.client.view"],
};

function permissionsFromRole(role: string): ClientPermissions {
  const granted = new Set(ROLE_PERMISSIONS[role] ?? []);
  return {
    canView: granted.has(CLIENT_PERMISSIONS.view),
    canCreate: granted.has(CLIENT_PERMISSIONS.create),
    canEdit: granted.has(CLIENT_PERMISSIONS.edit),
    canReview: granted.has(CLIENT_PERMISSIONS.review),
    canApprove: granted.has(CLIENT_PERMISSIONS.approve),
    canPublish: granted.has(CLIENT_PERMISSIONS.publish),
  };
}

function renderDetailPage() {
  return render(
    <MemoryRouter initialEntries={["/pricing/clients/company-1"]}>
      <Routes>
        <Route path="/pricing/clients/:id" element={<ClientPricingDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  h.rpc.mockReset();
  h.rpc.mockResolvedValue({ data: null, error: null });
  h.state.list = { data: [], error: null, count: 0 };
  h.state.range = { data: [], error: null, count: 0 };
  h.state.single = { data: null, error: null };
  canMock = () => true;
});

describe("RBAC gating (CUI-CRBAC01..05)", () => {
  it("CUI-CRBAC01: list page blocked without pricing.client.view", () => {
    canMock = (p) => p !== CLIENT_PERMISSIONS.view;
    render(
      <MemoryRouter>
        <ClientPricingListPage />
      </MemoryRouter>
    );
    expect(
      screen.getByText("Você não tem permissão para acessar esta página.")
    ).toBeInTheDocument();
  });

  it("CUI-CRBAC02: create button hidden without pricing.client.create", async () => {
    canMock = (p) => p === CLIENT_PERMISSIONS.view;
    render(
      <MemoryRouter>
        <ClientPricingListPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("Nenhum cliente encontrado.")).toBeInTheDocument();
    });
    expect(screen.queryByText("Novo Cliente")).not.toBeInTheDocument();
    expect(screen.queryByText("Criar o primeiro cliente")).not.toBeInTheDocument();
  });

  it("CUI-CRBAC02b: create button visible with pricing.client.create", async () => {
    canMock = (p) =>
      p === CLIENT_PERMISSIONS.view || p === CLIENT_PERMISSIONS.create;
    render(
      <MemoryRouter>
        <ClientPricingListPage />
      </MemoryRouter>
    );
    expect(await screen.findByText("Novo Cliente")).toBeInTheDocument();
  });

  it("CUI-CRBAC03: detail page blocked without pricing.client.view", () => {
    canMock = (p) => p !== CLIENT_PERMISSIONS.view;
    renderDetailPage();
    expect(
      screen.getByText("Você não tem permissão para acessar esta página.")
    ).toBeInTheDocument();
  });

  it("CUI-CRBAC04: lookup page blocked without pricing.client.view", () => {
    canMock = (p) => p !== CLIENT_PERMISSIONS.view;
    render(
      <MemoryRouter>
        <ClientLookupPage />
      </MemoryRouter>
    );
    expect(
      screen.getByText("Você não tem permissão para acessar esta página.")
    ).toBeInTheDocument();
  });

  it("CUI-CRBAC05: status change button hidden without pricing.client.edit (detail page with only view permission)", async () => {
    canMock = (p) => p === CLIENT_PERMISSIONS.view;
    h.state.single = { data: PROFILE_ROW, error: null };
    renderDetailPage();
    expect(await screen.findByText("Resumo do perfil")).toBeInTheDocument();
    expect(screen.queryByText("Alterar status")).not.toBeInTheDocument();
  });

  it("CUI-CRBAC05b: status change button visible with pricing.client.edit", async () => {
    canMock = () => true;
    h.state.single = { data: PROFILE_ROW, error: null };
    renderDetailPage();
    expect(await screen.findByText("Alterar status")).toBeInTheDocument();
  });
});

describe("Role permission sets (CUI-CRBAC06..08)", () => {
  it("CUI-CRBAC06: admin has all 6 permissions", () => {
    const adminPerms = ROLE_PERMISSIONS.admin;
    for (const code of Object.values(CLIENT_PERMISSIONS)) {
      expect(adminPerms).toContain(code);
    }
    expect(adminPerms).toHaveLength(6);
  });

  it("CUI-CRBAC07: manager lacks pricing.client.publish", () => {
    const managerPerms = ROLE_PERMISSIONS.manager;
    expect(managerPerms).not.toContain(CLIENT_PERMISSIONS.publish);
    expect(managerPerms).toContain(CLIENT_PERMISSIONS.view);
    expect(managerPerms).toContain(CLIENT_PERMISSIONS.create);
    expect(managerPerms).toContain(CLIENT_PERMISSIONS.edit);
    expect(managerPerms).toContain(CLIENT_PERMISSIONS.review);
    expect(managerPerms).toContain(CLIENT_PERMISSIONS.approve);
    expect(managerPerms).toHaveLength(5);

    // Behavioral: manager-derived permissions never surface the publish button.
    render(
      <MemoryRouter>
        <WorkflowActions
          status="approved"
          type="assignment"
          permissions={permissionsFromRole("manager")}
          onAction={vi.fn()}
          pending={false}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText("Publicar / Agendar")).not.toBeInTheDocument();
  });

  it("CUI-CRBAC08: operator/viewer are read-only", () => {
    for (const role of ["operator", "viewer"]) {
      expect(ROLE_PERMISSIONS[role]).toEqual([CLIENT_PERMISSIONS.view]);
    }

    // Behavioral: read-only roles get no workflow buttons at all.
    const onAction = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <WorkflowActions
          status="draft"
          type="assignment"
          permissions={permissionsFromRole("operator")}
          onAction={onAction}
          pending={false}
        />
      </MemoryRouter>
    );
    expect(container.querySelector("button")).toBeNull();

    const viewerRender = render(
      <MemoryRouter>
        <WorkflowActions
          status="under_review"
          type="override"
          permissions={permissionsFromRole("viewer")}
          onAction={onAction}
          pending={false}
        />
      </MemoryRouter>
    );
    expect(viewerRender.container.querySelector("button")).toBeNull();
    expect(onAction).not.toHaveBeenCalled();
  });
});
