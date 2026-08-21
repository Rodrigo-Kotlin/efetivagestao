import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Button,
  FieldGroup,
  FilterBar,
  FormActions,
  FormAlert,
  FormSection,
  InlineError,
  KPI,
  SearchField,
  StatusBadge,
  Toolbar,
  ToolbarDivider,
  ToolbarLabel,
  ToolbarSection,
  ToolbarSpacer,
} from "@/components/ui";
import { statusTone } from "@/components/ui/statusTone";

describe("statusTone ERP vocabulary", () => {
  it("maps Brazilian status strings to correct tones", () => {
    expect(statusTone("Ativo")).toBe("positive");
    expect(statusTone("Aprovado")).toBe("positive");
    expect(statusTone("Pago")).toBe("positive");
    expect(statusTone("Publicado")).toBe("positive");
    expect(statusTone("Rascunho")).toBe("warning");
    expect(statusTone("Pendente")).toBe("warning");
    expect(statusTone("Em revisão")).toBe("info");
    expect(statusTone("Inativo")).toBe("negative");
    expect(statusTone("Cancelado")).toBe("negative");
    expect(statusTone("Bloqueado")).toBe("negative");
    expect(statusTone("Substituído")).toBe("negative");
    expect(statusTone("Agendado")).toBe("info");
    expect(statusTone("unknown_value")).toBe("neutral");
  });
});

describe("StatusBadge", () => {
  it("renders status text and maps to correct tone", () => {
    render(<StatusBadge status="Ativo" />);
    expect(screen.getByText("Ativo")).toHaveAttribute("data-tone", "positive");
  });

  it("renders Cancelado with negative tone", () => {
    render(<StatusBadge status="Cancelado" />);
    expect(screen.getByText("Cancelado")).toHaveAttribute("data-tone", "negative");
  });
});

describe("SearchField", () => {
  it("renders with search input and clear button appears on value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} />);
    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("placeholder", "Buscar\u2026");
    expect(screen.queryByRole("button", { name: "Limpar busca" })).not.toBeInTheDocument();
    await user.type(input, " teste");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows clear button when value is non-empty", () => {
    render(<SearchField value="hello" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Limpar busca" })).toBeInTheDocument();
  });

  it("clears value when clear button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchField value="hello" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("KPI", () => {
  it("renders label, value, trend, and context", () => {
    render(
      <KPI label="Receita" value="R$ 12.500" trend="up" trendLabel="+12%" context="vs. mes anterior" />,
    );
    expect(screen.getByText("Receita")).toBeInTheDocument();
    expect(screen.getByText("R$ 12.500")).toBeInTheDocument();
    expect(screen.getByText("+12%")).toBeInTheDocument();
    expect(screen.getByText("vs. mes anterior")).toBeInTheDocument();
  });
});

describe("Form components", () => {
  it("FormSection renders fieldset with legend and description", () => {
    render(
      <FormSection title="Dados gerais" description="Informacoes basicas.">
        <input />
      </FormSection>,
    );
    expect(screen.getByText("Dados gerais")).toBeInTheDocument();
    expect(screen.getByText("Informacoes basicas.")).toBeInTheDocument();
  });

  it("FieldGroup renders with optional columns", () => {
    const { rerender } = render(<FieldGroup data-testid="fg"><input /></FieldGroup>);
    expect(screen.getByTestId("fg")).not.toHaveAttribute("data-columns");
    rerender(<FieldGroup columns={2} data-testid="fg"><input /></FieldGroup>);
    expect(screen.getByTestId("fg")).toHaveAttribute("data-columns", "2");
  });

  it("FormActions renders with leading action", () => {
    render(
      <FormActions leading={<Button>Salvar</Button>}>
        <Button variant="text">Cancelar</Button>
      </FormActions>,
    );
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("InlineError renders with alert role and icon", () => {
    render(<InlineError id="err-1">Campo obrigatorio</InlineError>);
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Campo obrigatorio");
    expect(error.querySelector("svg")).toBeInTheDocument();
  });

  it("FormAlert renders with correct tone and optional actions", () => {
    render(
      <FormAlert tone="success" actions={<Button size="compact">Ver</Button>}>
        Dados salvos com sucesso.
      </FormAlert>,
    );
    const alert = screen.getByRole("status");
    expect(alert).toHaveAttribute("data-tone", "success");
    expect(alert).toHaveTextContent("Dados salvos com sucesso.");
    expect(screen.getByRole("button", { name: "Ver" })).toBeInTheDocument();
  });

  it("FormAlert error tone uses alert role", () => {
    render(<FormAlert tone="error">Erro ao salvar.</FormAlert>);
    expect(screen.getByRole("alert")).toHaveAttribute("data-tone", "error");
  });
});

describe("Toolbar", () => {
  it("renders with role=toolbar and sections", () => {
    render(
      <Toolbar aria-label="Acoes da tabela">
        <ToolbarSection><Button size="compact">Novo</Button></ToolbarSection>
        <ToolbarDivider />
        <ToolbarLabel>Total: 10</ToolbarLabel>
        <ToolbarSpacer />
        <Button variant="text" size="compact">Mais</Button>
      </Toolbar>,
    );
    expect(screen.getByRole("toolbar", { name: "Acoes da tabela" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo" })).toBeInTheDocument();
    expect(screen.getByText("Total: 10")).toBeInTheDocument();
  });
});

describe("FilterBar", () => {
  it("renders filter chips and reset button with active count", async () => {
    const user = userEvent.setup();
    const onFilterClick = vi.fn();
    const onReset = vi.fn();
    render(
      <FilterBar
        filters={[
          { key: "status", label: "Situacao", active: true, value: "Ativo" },
          { key: "type", label: "Tipo" },
        ]}
        activeCount={1}
        onFilterClick={onFilterClick}
        onReset={onReset}
      />,
    );
    expect(screen.getByRole("button", { name: /Situacao/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Limpar")).toBeInTheDocument();
    await user.click(screen.getByText("Limpar"));
    expect(onReset).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Tipo/ }));
    expect(onFilterClick).toHaveBeenCalledWith("type");
  });

  it("shows count in reset label when activeCount > 1", () => {
    render(
      <FilterBar
        filters={[{ key: "a", label: "A", active: true }, { key: "b", label: "B", active: true }]}
        activeCount={2}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByText("Limpar (2)")).toBeInTheDocument();
  });
});
