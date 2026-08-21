import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, Dialog, ToastProvider, useToast } from "@/components/ui";

describe("Dialog destructive confirmation", () => {
  it("renders destructive header and confirm/cancel buttons", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Abrir dialog</Button>
          <Dialog
            open={open}
            onOpenChange={setOpen}
            title="Confirmar exclusao"
            description="Esta acao nao pode ser desfeita."
            destructive
            confirmLabel="Excluir"
            onConfirm={onConfirm}
          >
            <p>Tem certeza?</p>
          </Dialog>
        </>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Abrir dialog" }));
    const dialog = screen.getByRole("dialog", { name: "Confirmar exclusao" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Esta acao nao pode ser desfeita.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("closes dialog on cancel and restores focus", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Abrir</Button>
          <Dialog
            open={open}
            onOpenChange={setOpen}
            title="Confirmar"
            destructive
            confirmLabel="OK"
            onConfirm={vi.fn()}
          >
            <p>Conteudo</p>
          </Dialog>
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Abrir" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Confirmar" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("Toast system", () => {
  it("shows toast via useToast and dismisses it", async () => {
    const user = userEvent.setup();
    function ToastHarness() {
      const { addToast } = useToast();
      return (
        <>
          <Button onClick={() => addToast({ message: "Salvo com sucesso", tone: "success" })}>
            Mostrar toast
          </Button>
          <Button onClick={() => addToast({ message: "Erro", tone: "error", duration: 0 })}>
            Toast persistente
          </Button>
        </>
      );
    }

    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mostrar toast" }));
    expect(await screen.findByText("Salvo com sucesso")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dispensar" }));
    await screen.findByRole("status");
  });
});
