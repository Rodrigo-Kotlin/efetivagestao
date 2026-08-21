// ============================================================
// CUI-CWF01..CUI-CWF08 — Workflow button behavior tests for the
// client pricing WorkflowActions component (assignments + overrides).
// Terminal statuses render nothing; every button is permission-gated.
// ============================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkflowActions } from "../components/WorkflowActions";
import type { ClientPermissions, ClientWorkflowStatus } from "../types/client.types";

function perms(overrides: Partial<ClientPermissions> = {}): ClientPermissions {
  return {
    canView: true,
    canCreate: false,
    canEdit: false,
    canReview: false,
    canApprove: false,
    canPublish: false,
    ...overrides,
  };
}

function renderActions(
  status: ClientWorkflowStatus,
  permissions: ClientPermissions,
  onAction: (action: string) => void = vi.fn()
) {
  return render(
    <MemoryRouter>
      <WorkflowActions
        status={status}
        type="assignment"
        permissions={permissions}
        onAction={onAction}
        pending={false}
      />
    </MemoryRouter>
  );
}

describe("Workflow actions by status (CUI-CWF01..06)", () => {
  it("CUI-CWF01: draft shows submit + cancel buttons", () => {
    const onAction = vi.fn();
    renderActions("draft", perms({ canEdit: true }), onAction);
    expect(screen.getByText("Enviar para revisão")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("CUI-CWF02: under_review shows return, approve, cancel buttons", () => {
    renderActions(
      "under_review",
      perms({ canReview: true, canApprove: true })
    );
    expect(screen.getByText("Voltar para rascunho")).toBeInTheDocument();
    expect(screen.getByText("Aprovar")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("CUI-CWF03: approved shows publish + cancel buttons", () => {
    renderActions(
      "approved",
      perms({ canReview: true, canPublish: true })
    );
    expect(screen.getByText("Publicar / Agendar")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("CUI-CWF04: active shows no workflow buttons", () => {
    const { container } = renderActions(
      "active",
      perms({ canEdit: true, canReview: true, canApprove: true, canPublish: true })
    );
    expect(container.querySelector("button")).toBeNull();
    expect(screen.queryByText("Publicar / Agendar")).not.toBeInTheDocument();
    expect(screen.queryByText("Enviar para revisão")).not.toBeInTheDocument();
  });

  it("CUI-CWF05: superseded shows no workflow buttons", () => {
    const { container } = renderActions(
      "superseded",
      perms({ canEdit: true, canReview: true, canApprove: true, canPublish: true })
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("CUI-CWF06: cancelled shows no workflow buttons", () => {
    const { container } = renderActions(
      "cancelled",
      perms({ canEdit: true, canReview: true, canApprove: true, canPublish: true })
    );
    expect(container.querySelector("button")).toBeNull();
  });
});

describe("Workflow permission gating (CUI-CWF07..08)", () => {
  it("CUI-CWF07: publish button hidden without pricing.client.publish permission", () => {
    // canReview granted so the Cancel button proves the component rendered.
    renderActions("approved", perms({ canReview: true }));
    expect(screen.queryByText("Publicar / Agendar")).not.toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("CUI-CWF08: approve button hidden without pricing.client.approve permission", () => {
    renderActions("under_review", perms({ canReview: true }));
    expect(screen.queryByText("Aprovar")).not.toBeInTheDocument();
    expect(screen.getByText("Voltar para rascunho")).toBeInTheDocument();
  });
});

describe("Workflow extras", () => {
  it("WF-extra: action click invokes onAction with kind", () => {
    const onAction = vi.fn();
    renderActions("draft", perms({ canEdit: true }), onAction);
    fireEvent.click(screen.getByText("Enviar para revisão"));
    expect(onAction).toHaveBeenCalledWith("submit");
  });

  it("WF-extra: scheduled is also terminal (no buttons)", () => {
    const { container } = renderActions(
      "scheduled",
      perms({ canEdit: true, canReview: true, canApprove: true, canPublish: true })
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("WF-extra: pending disables visible buttons", () => {
    render(
      <MemoryRouter>
        <WorkflowActions
          status="draft"
          type="override"
          permissions={perms({ canEdit: true })}
          onAction={vi.fn()}
          pending={true}
        />
      </MemoryRouter>
    );
    const btn = screen.getByText("Enviar para revisão") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
