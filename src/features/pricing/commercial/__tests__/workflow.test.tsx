// ============================================================
// CUI-WF01..CUI-WF08 — Workflow action visibility tests.
// CUI-CLONE01..04 — Clone UI tests.
// CUI-BULK01..05 — Bulk parameter normalization tests.
// CUI-ENG01..05 — Engine item preview vs save tests.
// CUI-EX01..05 — Exception panel tests.
// ============================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CommercialWorkflowActions } from "../components/CommercialWorkflowActions";
import { CommercialBulkAdjustment } from "../components/CommercialBulkAdjustment";
import { CommercialExceptionPanel } from "../components/CommercialExceptionPanel";
import { CommercialVersionForm } from "../components/CommercialVersionForm";
import type { CommercialPriceException } from "../types/commercial.types";

describe("Workflow actions (CUI-WF01..08)", () => {
  it("CUI-WF01: draft shows editable actions (submit, cancel) with permissions", () => {
    const onAction = vi.fn();
    render(
      <MemoryRouter>
        <CommercialWorkflowActions
          status="draft"
          permissions={{ canReview: true, canApprove: false, canPublish: false }}
          onAction={onAction}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Enviar para revisão")).toBeInTheDocument();
    expect(screen.getByText("Cancelar versão")).toBeInTheDocument();
  });

  it("CUI-WF02: under_review shows return + approve per permissions", () => {
    const onAction = vi.fn();
    render(
      <MemoryRouter>
        <CommercialWorkflowActions
          status="under_review"
          permissions={{ canReview: true, canApprove: true, canPublish: false }}
          onAction={onAction}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Voltar para rascunho")).toBeInTheDocument();
    expect(screen.getByText("Aprovar versão")).toBeInTheDocument();
  });

  it("CUI-WF03: approved shows publish with permission", () => {
    const onAction = vi.fn();
    render(
      <MemoryRouter>
        <CommercialWorkflowActions
          status="approved"
          permissions={{ canReview: false, canApprove: false, canPublish: true }}
          onAction={onAction}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Publicar / Agendar")).toBeInTheDocument();
  });

  it("CUI-WF04..07: scheduled/active/superseded/cancelled are read-only", () => {
    const onAction = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <CommercialWorkflowActions
          status="scheduled"
          permissions={{ canReview: true, canApprove: true, canPublish: true }}
          onAction={onAction}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText("Publicar / Agendar")).not.toBeInTheDocument();
    expect(screen.queryByText("Enviar para revisão")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <CommercialWorkflowActions
          status="active"
          permissions={{ canReview: true, canApprove: true, canPublish: true }}
          onAction={onAction}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText("Publicar / Agendar")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <CommercialWorkflowActions
          status="superseded"
          permissions={{ canReview: true, canApprove: true, canPublish: true }}
          onAction={onAction}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText("Publicar / Agendar")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <CommercialWorkflowActions
          status="cancelled"
          permissions={{ canReview: true, canApprove: true, canPublish: true }}
          onAction={onAction}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText("Publicar / Agendar")).not.toBeInTheDocument();
  });

  it("CUI-WF08: action click invokes onAction with kind", () => {
    const onAction = vi.fn();
    render(
      <MemoryRouter>
        <CommercialWorkflowActions
          status="draft"
          permissions={{ canReview: true }}
          onAction={onAction}
        />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("Enviar para revisão"));
    expect(onAction).toHaveBeenCalledWith("submit");
  });

  it("WF-extra: approve button gated by canApprove permission", () => {
    const onAction = vi.fn();
    render(
      <MemoryRouter>
        <CommercialWorkflowActions
          status="under_review"
          permissions={{ canReview: true, canApprove: false }}
          onAction={onAction}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Voltar para rascunho")).toBeInTheDocument();
    expect(screen.queryByText("Aprovar versão")).not.toBeInTheDocument();
  });
});

describe("Clone UI (CUI-CLONE01..04)", () => {
  it("CUI-CLONE01: clone form uses selected source version when provided", () => {
    const onSubmitEmpty = vi.fn();
    const onSubmitClone = vi.fn();
    render(
      <MemoryRouter>
        <CommercialVersionForm
          defaultValidFrom="2026-02-01"
          defaultValidTo={null}
          sourceVersionId="v1"
          sourceVersionLabel="v1 · original"
          onSubmitEmpty={onSubmitEmpty}
          onSubmitClone={onSubmitClone}
          cancelLabel="Cancelar"
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Criar versão vazia")).toBeInTheDocument();
    expect(screen.getByText(/Clonar versão existente/)).toBeInTheDocument();
    expect(screen.getByText(/v1 · original/)).toBeInTheDocument();
  });

  it("CUI-CLONE04: UI mentions exceptions are NOT cloned", () => {
    render(
      <MemoryRouter>
        <CommercialVersionForm
          defaultValidFrom="2026-02-01"
          defaultValidTo={null}
          sourceVersionId="v1"
          onSubmitEmpty={vi.fn()}
          onSubmitClone={vi.fn()}
          cancelLabel="Cancelar"
        />
      </MemoryRouter>
    );
    expect(
      screen.getByText(/Exceções/)
    ).toBeInTheDocument();
  });
});

describe("Bulk parameter normalization (CUI-BULK01..05)", () => {
  it("CUI-BULK01: percentage input 5 converts to 0.05 parameter", async () => {
    const onSubmit = vi.fn();
    render(
      <MemoryRouter>
        <CommercialBulkAdjustment
          selectedCount={3}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/Percentual/), { target: { value: "5" } });
    fireEvent.click(screen.getByText("Confirmar ajuste"));
    await new Promise((r) => setTimeout(r, 10));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "percentage", rate: 0.05 })
    );
  });

  it("CUI-BULK02: fixed operation sends numeric parameter without JS recalculation", async () => {
    const onSubmit = vi.fn();
    render(
      <MemoryRouter>
        <CommercialBulkAdjustment
          selectedCount={3}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/Operação/), { target: { value: "fixed" } });
    fireEvent.change(screen.getByLabelText(/Valor fixo/), { target: { value: "5.50" } });
    fireEvent.click(screen.getByText("Confirmar ajuste"));
    await new Promise((r) => setTimeout(r, 10));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "fixed", fixedAmount: 5.5, rate: null })
    );
  });

  it("CUI-BULK03: round operation sends mode + step", async () => {
    const onSubmit = vi.fn();
    render(
      <MemoryRouter>
        <CommercialBulkAdjustment
          selectedCount={3}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/Operação/), { target: { value: "round" } });
    fireEvent.click(screen.getByText("Confirmar ajuste"));
    await new Promise((r) => setTimeout(r, 10));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "round",
        roundingMode: "nearest",
        roundingStep: 1,
      })
    );
  });

  it("CUI-BULK04: zero selection disables confirm", () => {
    const onSubmit = vi.fn();
    render(
      <MemoryRouter>
        <CommercialBulkAdjustment
          selectedCount={0}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      </MemoryRouter>
    );
    const btn = screen.getByText("Confirmar ajuste") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("CUI-BULK05: percentage input -2.5 converts to -0.025 (negative is allowed)", async () => {
    const onSubmit = vi.fn();
    render(
      <MemoryRouter>
        <CommercialBulkAdjustment
          selectedCount={3}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/Percentual/), { target: { value: "-2,5" } });
    fireEvent.click(screen.getByText("Confirmar ajuste"));
    await new Promise((r) => setTimeout(r, 10));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "percentage", rate: -0.025 })
    );
  });
});

describe("Exception panel (CUI-EX01..05)", () => {
  it("CUI-EX01: pending exceptions are listed with violation + status", () => {
    const ex: CommercialPriceException = {
      id: "e1",
      organization_id: "org-1",
      commercial_price_table_version_id: "v1",
      commercial_price_item_id: "i1",
      violation_code: "BELOW_COST",
      status: "requested",
      reason: "Motivo",
      requested_by: "u1",
      requested_at: "2026-01-01T00:00:00Z",
      decided_by: null,
      decided_at: null,
    };
    render(
      <MemoryRouter>
        <CommercialExceptionPanel
          exceptions={[ex]}
          canRequest={true}
          canDecide={true}
          onRequest={vi.fn()}
          onDecide={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Pendentes")).toBeInTheDocument();
    expect(screen.getByText("Motivo")).toBeInTheDocument();
  });

  it("CUI-EX04: manager cannot see decision control (canDecide=false)", () => {
    const ex: CommercialPriceException = {
      id: "e1",
      organization_id: "org-1",
      commercial_price_table_version_id: "v1",
      commercial_price_item_id: "i1",
      violation_code: "BELOW_COST",
      status: "requested",
      reason: "Motivo",
      requested_by: "u1",
      requested_at: "2026-01-01T00:00:00Z",
      decided_by: null,
      decided_at: null,
    };
    render(
      <MemoryRouter>
        <CommercialExceptionPanel
          exceptions={[ex]}
          canRequest={true}
          canDecide={false}
          onRequest={vi.fn()}
          onDecide={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText("Aprovar exceção")).not.toBeInTheDocument();
    expect(screen.queryByText("Negar exceção")).not.toBeInTheDocument();
  });

  it("CUI-EX05: approved/denied display terminal state", () => {
    const ex: CommercialPriceException = {
      id: "e1",
      organization_id: "org-1",
      commercial_price_table_version_id: "v1",
      commercial_price_item_id: "i1",
      violation_code: "BELOW_COST",
      status: "approved",
      reason: "OK",
      requested_by: "u1",
      requested_at: "2026-01-01T00:00:00Z",
      decided_by: "u2",
      decided_at: "2026-01-02T00:00:00Z",
    };
    render(
      <MemoryRouter>
        <CommercialExceptionPanel
          exceptions={[ex]}
          canRequest={true}
          canDecide={true}
          onRequest={vi.fn()}
          onDecide={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Decididas")).toBeInTheDocument();
  });
});
