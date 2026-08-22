import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PolicyForm } from "../components/PolicyForm";
import { PolicyVersionForm } from "../components/PolicyVersionForm";
import { PolicyComponentEditor } from "../components/PolicyComponentEditor";
import type { PricingPolicyComponent } from "../types/pricing-policy.types";

const h = vi.hoisted(() => {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
    range: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: undefined,
  };
  return { chain };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
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

beforeEach(() => {
  vi.clearAllMocks();
  canMock = () => true;
});

function renderPolicyForm(onSubmit: (data: unknown) => void) {
  return render(
    <MemoryRouter>
      <PolicyForm onSubmit={onSubmit} onCancel={() => {}} />
    </MemoryRouter>
  );
}

function renderVersionForm(onSubmit: (data: unknown) => void) {
  return render(
    <MemoryRouter>
      <PolicyVersionForm onSubmit={onSubmit} onCancel={() => {}} />
    </MemoryRouter>
  );
}

describe("Policy form validation (UI-FORM01..02)", () => {
  it("UI-FORM01: default scope submits without category/item", () => {
    const onSubmit = vi.fn();
    renderPolicyForm(onSubmit);

    fireEvent.change(screen.getByLabelText(/^Código/), { target: { value: "POL teste 1" } });
    fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: "Política padrão" } });
    fireEvent.change(screen.getByLabelText(/^Escopo/), { target: { value: "default" } });

    fireEvent.click(screen.getByRole("button", { name: "Criar Política" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      code: "POL-TESTE-1",
      scopeType: "default",
    }));
  });

  it("UI-FORM01b: category scope without category selection shows error", () => {
    const onSubmit = vi.fn();
    renderPolicyForm(onSubmit);

    fireEvent.change(screen.getByLabelText(/^Código/), { target: { value: "POL-CAT" } });
    fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: "Política por categoria" } });
    fireEvent.change(screen.getByLabelText(/^Escopo/), { target: { value: "category" } });

    fireEvent.click(screen.getByRole("button", { name: "Criar Política" }));

    expect(screen.getByText("Selecione a categoria do catálogo para o escopo de categoria.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("UI-FORM02: code is normalized (uppercase, spaces → dashes, invalid chars removed)", () => {
    const onSubmit = vi.fn();
    renderPolicyForm(onSubmit);

    fireEvent.change(screen.getByLabelText(/^Código/), { target: { value: "  pol preço #1  " } });
    fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: "Política" } });
    fireEvent.change(screen.getByLabelText(/^Escopo/), { target: { value: "default" } });

    fireEvent.click(screen.getByRole("button", { name: "Criar Política" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ code: "POL-PREO-1" }));
  });

  it("UI-FORM02b: switching scope clears the selector", () => {
    const onSubmit = vi.fn();
    renderPolicyForm(onSubmit);

    fireEvent.change(screen.getByLabelText(/^Código/), { target: { value: "POL-X" } });
    fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: "Política X" } });
    fireEvent.change(screen.getByLabelText(/^Escopo/), { target: { value: "catalog_item" } });

    expect(screen.getByLabelText(/^Buscar item/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Escopo/), { target: { value: "default" } });

    expect(screen.queryByLabelText(/^Buscar item/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Buscar categoria/)).not.toBeInTheDocument();
  });
});

describe("Version form method-dependent fields (UI-FORM03..04)", () => {
  it("UI-FORM03: target_margin shows margem-alvo field only", () => {
    renderVersionForm(() => {});

    fireEvent.change(screen.getByLabelText(/^Método/), { target: { value: "target_margin" } });

    expect(screen.getByLabelText(/^Margem-alvo/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Markup/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Preço fixo/)).not.toBeInTheDocument();
  });

  it("UI-FORM03b: markup shows markup field only", () => {
    renderVersionForm(() => {});

    fireEvent.change(screen.getByLabelText(/^Método/), { target: { value: "markup" } });

    expect(screen.getByLabelText(/^Markup/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Margem-alvo/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Preço fixo/)).not.toBeInTheDocument();
  });

  it("UI-FORM03c: fixed_price shows preço fixo field only", () => {
    renderVersionForm(() => {});

    fireEvent.change(screen.getByLabelText(/^Método/), { target: { value: "fixed_price" } });

    expect(screen.getByLabelText(/^Preço fixo/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Margem-alvo/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Markup/)).not.toBeInTheDocument();
  });

  it("UI-FORM04: percent input converts 20 → 0.20 and sends method-specific nulls", () => {
    const onSubmit = vi.fn();
    renderVersionForm(onSubmit);

    fireEvent.change(screen.getByLabelText(/^Vigência inicial/), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText(/^Método/), { target: { value: "target_margin" } });
    fireEvent.change(screen.getByLabelText(/^Margem-alvo/), { target: { value: "20" } });

    fireEvent.click(screen.getByRole("button", { name: "Criar Versão" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      pricing_method: "target_margin",
      target_margin_rate: 0.2,
      markup_rate: null,
      fixed_price: null,
    }));
  });

  it("UI-FORM04b: markup percent input converts 25 → 0.25", () => {
    const onSubmit = vi.fn();
    renderVersionForm(onSubmit);

    fireEvent.change(screen.getByLabelText(/^Vigência inicial/), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText(/^Método/), { target: { value: "markup" } });
    fireEvent.change(screen.getByLabelText(/^Markup/), { target: { value: "25" } });

    fireEvent.click(screen.getByRole("button", { name: "Criar Versão" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      pricing_method: "markup",
      target_margin_rate: null,
      markup_rate: 0.25,
      fixed_price: null,
    }));
  });

  it("UI-FORM04c: rounding mode none requires no step; nearest requires positive step", () => {
    const onSubmit = vi.fn();
    renderVersionForm(onSubmit);

    fireEvent.change(screen.getByLabelText(/^Vigência inicial/), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText(/^Método/), { target: { value: "target_margin" } });
    fireEvent.change(screen.getByLabelText(/^Margem-alvo/), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText(/^Arredondamento/), { target: { value: "nearest" } });

    fireEvent.click(screen.getByRole("button", { name: "Criar Versão" }));

    expect(screen.getByText("Informe um passo de arredondamento maior que zero.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^Passo de arredondamento/), { target: { value: "0.10" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar Versão" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ rounding_mode: "nearest", rounding_step: 0.1 }));
  });
});

describe("Component editor type-dependent fields (UI-FORM05)", () => {
  const components: PricingPolicyComponent[] = [
    {
      id: "comp-1",
      organization_id: "org-1",
      pricing_policy_version_id: "version-1",
      name: "Taxa de coleta",
      description: null,
      component_type: "fixed",
      fixed_amount: 5,
      rate: null,
      sort_order: 0,
      created_by: "user-1",
      created_at: "2026-01-01T00:00:00Z",
      updated_by: "user-1",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ];

  function renderEditor(onAdd: (data: unknown) => Promise<void>) {
    return render(
      <MemoryRouter>
        <PolicyComponentEditor
          versionId="version-1"
          components={components}
          onAdd={onAdd}
          onDelete={() => Promise.resolve()}
        />
      </MemoryRouter>
    );
  }

  it("UI-FORM05: fixed type requires fixed_amount and sends rate null", async () => {
    const onAdd = vi.fn(() => Promise.resolve());
    renderEditor(onAdd);

    fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: "Logística" } });
    fireEvent.change(screen.getByLabelText(/^Tipo/), { target: { value: "fixed" } });
    fireEvent.change(screen.getByLabelText(/^Valor fixo/), { target: { value: "3.50" } });

    fireEvent.click(screen.getByRole("button", { name: /Adicionar componente/ }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
        componentType: "fixed",
        fixedAmount: 3.5,
        rate: null,
      }));
    });
  });

  it("UI-FORM05b: percentage type requires rate and sends fixed_amount null", async () => {
    const onAdd = vi.fn(() => Promise.resolve());
    renderEditor(onAdd);

    fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: "Sobretaxa" } });
    fireEvent.change(screen.getByLabelText(/^Tipo/), { target: { value: "percentage_of_base_cost" } });
    fireEvent.change(screen.getByLabelText(/^Taxa percentual/), { target: { value: "5" } });

    fireEvent.click(screen.getByRole("button", { name: /Adicionar componente/ }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
        componentType: "percentage_of_base_cost",
        fixedAmount: null,
        rate: 0.05,
      }));
    });
  });

  it("UI-FORM05c: fixed without amount shows error", async () => {
    const onAdd = vi.fn(() => Promise.resolve());
    renderEditor(onAdd);

    fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: "Logística" } });
    fireEvent.change(screen.getByLabelText(/^Tipo/), { target: { value: "fixed" } });

    fireEvent.click(screen.getByRole("button", { name: /Adicionar componente/ }));

    expect(await screen.findByText("Informe o valor fixo do componente.")).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
