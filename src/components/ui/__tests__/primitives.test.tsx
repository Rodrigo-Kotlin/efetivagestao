import { useState } from "react";
import { describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Select,
  StatusChip,
  Switch,
  Table,
  TextField,
} from "@/components/ui";
import { DesignSystemPage } from "@/pages/dev/DesignSystemPage";

describe("Efetiva UI primitives", () => {
  it("keeps button semantics while exposing hierarchy variants", () => {
    render(
      <>
        <Button>Salvar</Button>
        <Button variant="outlined" loading>Exportando</Button>
      </>
    );
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute("data-variant", "filled");
    expect(screen.getByRole("button", { name: "Exportando" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Exportando" })).toHaveAttribute("aria-busy", "true");
  });

  it("connects field labels, supporting text, and errors", () => {
    render(
      <>
        <span id="external-help">Ajuda externa</span>
        <TextField label="Código" supportingText="Identificador estável" aria-describedby="external-help" />
        <TextField label="Nome" error="Nome obrigatório" />
        <TextField label="Referência" aria-invalid="true" />
      </>
    );
    expect(screen.getByRole("textbox", { name: "Código" })).toHaveAccessibleDescription("Ajuda externa Identificador estável");
    expect(screen.getByRole("textbox", { name: "Nome" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("textbox", { name: "Nome" })).toHaveAccessibleDescription("Nome obrigatório");
    expect(screen.getByRole("textbox", { name: "Referência" })).toHaveAttribute("aria-invalid", "true");
  });

  it("associates a select with its visible label", () => {
    render(
      <Select label="Situação" defaultValue="active">
        <option value="active">Ativa</option>
      </Select>
    );
    expect(screen.getByRole("combobox", { name: "Situação" })).toHaveValue("active");
  });

  it("exposes status text instead of relying on color", () => {
    render(
      <>
        <StatusChip tone="positive">Ativa</StatusChip>
        <Badge tone="warning">Pendente</Badge>
      </>
    );
    expect(screen.getByText("Ativa").closest(".eg-status-chip")).toHaveAttribute("data-tone", "positive");
    expect(screen.getByText("Pendente")).toHaveAttribute("data-tone", "warning");
  });

  it("uses native switch semantics and labeling", async () => {
    const user = userEvent.setup();
    render(
      <>
        <span id="choice-help">Preferência local</span>
        <Switch label="Detalhes avançados" description="Mostra mais campos" aria-describedby="choice-help" />
        <Checkbox
          label="Aceitar revisão"
          description={<>Obrigatória <button type="button">Ver ajuda</button> <span role="button" tabIndex={0}>Atalho</span></>}
          aria-describedby="choice-help"
        />
      </>
    );
    const control = screen.getByRole("switch", { name: "Detalhes avançados" });
    await user.click(control.closest(".eg-switch") as HTMLElement);
    expect(control).toBeChecked();
    expect(control).toHaveAccessibleDescription("Preferência local Mostra mais campos");
    const checkbox = screen.getByRole("checkbox", { name: "Aceitar revisão" });
    expect(checkbox).toHaveAccessibleDescription("Preferência local Obrigatória Ver ajuda Atalho");
    await user.click(screen.getByRole("button", { name: "Ver ajuda" }));
    expect(checkbox).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Atalho" }));
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox.closest(".eg-choice") as HTMLElement);
    expect(checkbox).toBeChecked();
  });

  it("labels tables and makes only overflowing containers keyboard-scrollable", async () => {
    render(
      <Table caption="Itens comerciais">
        <thead><tr><th scope="col">Item</th></tr></thead>
        <tbody><tr><td>Exame</td></tr></tbody>
      </Table>
    );
    const table = screen.getByRole("table", { name: "Itens comerciais" });
    expect(table).toBeInTheDocument();
    expect(table.parentElement).not.toHaveAttribute("tabindex");
    expect(screen.getByRole("columnheader", { name: "Item" })).toHaveAttribute("scope", "col");

    Object.defineProperty(table.parentElement, "scrollWidth", { configurable: true, value: 500 });
    Object.defineProperty(table.parentElement, "clientWidth", { configurable: true, value: 300 });
    act(() => window.dispatchEvent(new Event("resize")));
    await waitFor(() => expect(table.parentElement).toHaveAttribute("tabindex", "0"));
    expect(table.parentElement).toHaveAttribute("role", "region");
    expect(table.parentElement).toHaveAccessibleName("Itens comerciais");
  });

  it("traps dialog focus, closes with Escape, and restores focus", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      const [value, setValue] = useState("");
      return (
        <>
          <Button onClick={() => setOpen(true)}>Abrir confirmação</Button>
          <Dialog open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)} title="Confirmar operação">
            <TextField label="Código de confirmação" value={value} onChange={(event) => setValue(event.target.value)} />
            <Button>Continuar</Button>
          </Dialog>
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Abrir confirmação" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Confirmar operação" });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    const input = screen.getByRole("textbox", { name: "Código de confirmação" });
    await user.type(input, "ABC");
    expect(input).toHaveValue("ABC");
    expect(input).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("renders the development showcase without business data", async () => {
    const user = userEvent.setup();
    render(<DesignSystemPage />);
    expect(screen.getByRole("heading", { name: "Efetiva Design System" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Amostra de preços comerciais" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Abrir diálogo de exemplo" }));
    expect(screen.getByRole("dialog", { name: "Confirmar publicação" })).toBeInTheDocument();
  });
});
