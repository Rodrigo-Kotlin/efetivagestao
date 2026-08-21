import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";

const authState = vi.hoisted(() => ({
  permissions: [] as string[],
  online: true,
  signOut: vi.fn(async () => undefined),
}));

vi.mock("@/features/core/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "ana@efetiva.test" },
    profile: { full_name: "Ana Souza" },
    activeOrganization: { id: "org-1", name: "Efetiva Matriz" },
    signOut: authState.signOut,
    can: (permission: string) => authState.permissions.includes(permission),
  }),
}));

vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => authState.online,
}));

function renderShell(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="*" element={<h1>Conteúdo da rota</h1>} />
        </Route>
        <Route path="/login" element={<h1>Login</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("adaptive application shell", () => {
  beforeEach(() => {
    authState.permissions = [];
    authState.online = true;
    authState.signOut.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows only available and RBAC-authorized modules", () => {
    renderShell();
    const navigation = screen.getByRole("navigation", { name: "Navegação principal", hidden: true });
    expect(within(navigation).getByRole("link", { name: "Dashboard", hidden: true })).toBeInTheDocument();
    expect(within(navigation).queryByRole("link", { name: "Preços & Exames", hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Clientes & CRM")).not.toBeInTheDocument();
    expect(screen.queryByText("Configurações")).not.toBeInTheDocument();
  });

  it("marks a parent module active for nested direct routes", () => {
    authState.permissions = ["pricing.commercial.view"];
    renderShell("/pricing/commercial/table-1");
    const pricingLink = screen.getByRole("link", { name: "Preços & Exames", hidden: true });
    expect(pricingLink).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Tabelas comerciais")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo da rota")).toBeInTheDocument();
  });

  it("opens the mobile drawer, closes it with Escape, and restores focus", async () => {
    const user = userEvent.setup();
    renderShell();
    const trigger = screen.getByRole("button", { name: "Abrir navegação" });
    await user.click(trigger);
    const drawer = screen.getByRole("dialog", { name: "Efetiva Gestão" });
    expect(drawer).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Efetiva Gestão" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes temporary navigation after route selection", async () => {
    const user = userEvent.setup();
    authState.permissions = ["pricing.catalog.view"];
    renderShell();
    await user.click(screen.getByRole("button", { name: "Abrir navegação" }));
    const drawer = screen.getByRole("dialog", { name: "Efetiva Gestão" });
    await user.click(within(drawer).getByRole("link", { name: "Preços & Exames" }));
    expect(screen.queryByRole("dialog", { name: "Efetiva Gestão" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("main")).toHaveFocus());
  });

  it("operates the user menu by keyboard and preserves identity context", async () => {
    const user = userEvent.setup();
    renderShell();
    const trigger = screen.getByRole("button", { name: "Abrir menu do usuário" });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    const menu = screen.getByRole("menu", { name: "Abrir menu do usuário" });
    expect(within(menu).getByText("ana@efetiva.test")).toBeInTheDocument();
    expect(within(menu).getByText("Efetiva Matriz")).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Sair" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Sair" })).toHaveFocus();
    await user.tab();
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("dismisses temporary navigation when the persistent rail breakpoint activates", async () => {
    const user = userEvent.setup();
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      media: "(min-width: 48rem)",
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    renderShell();
    const trigger = screen.getByRole("button", { name: "Abrir navegação" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Efetiva Gestão" })).toBeInTheDocument();
    act(() => listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent)));
    expect(screen.queryByRole("dialog", { name: "Efetiva Gestão" })).not.toBeInTheDocument();
    expect(trigger).not.toHaveFocus();
  });

  it("signs out through the existing auth flow", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole("button", { name: "Abrir menu do usuário" }));
    await user.click(screen.getByRole("menuitem", { name: "Sair" }));
    expect(authState.signOut).toHaveBeenCalledOnce();
    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
  });

  it("preserves the integrated offline alert", () => {
    authState.online = false;
    renderShell();
    expect(screen.getByRole("alert")).toHaveTextContent("Você está offline");
  });
});
