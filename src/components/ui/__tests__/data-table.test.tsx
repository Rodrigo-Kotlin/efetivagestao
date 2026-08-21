import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, DataTable, Kanban } from "@/components/ui";

type Row = { id: string; name: string; status: string; value: number };

const ROWS: Row[] = [
  { id: "1", name: "Item A", status: "Ativo", value: 100 },
  { id: "2", name: "Item B", status: "Pendente", value: 200 },
  { id: "3", name: "Item C", status: "Cancelado", value: 50 },
];

const COLUMNS = [
  { key: "name", header: "Nome", sortable: true, priority: true },
  { key: "status", header: "Situacao", priority: true },
  { key: "value", header: "Valor", align: "right" as const, sortable: true },
];

function renderTable(overrides: Record<string, unknown> = {}) {
  return render(
    <DataTable<Row>
      columns={COLUMNS}
      data={ROWS}
      keyExtractor={(row) => row.id}
      caption="Itens de teste"
      {...overrides}
    />,
  );
}

describe("DataTable", () => {
  it("renders rows with sortable headers and aria-sort", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderTable({ sort: { key: "name", direction: "asc" }, onSortChange });
    const nameHeader = screen.getByRole("columnheader", { name: /Nome/ });
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByRole("columnheader", { name: /Valor/ })).not.toHaveAttribute("aria-sort");
    await user.click(nameHeader);
    expect(onSortChange).toHaveBeenCalledWith({ key: "name", direction: "desc" });
  });

  it("clears sort on third click", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderTable({ sort: { key: "name", direction: "desc" }, onSortChange });
    await user.click(screen.getByRole("columnheader", { name: /Nome/ }));
    expect(onSortChange).toHaveBeenCalledWith(null);
  });

  it("renders pagination and navigates pages", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderTable({ page: 1, pageSize: 2, total: 5, onPageChange });
    expect(screen.getByText("5 registros")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "3" })).not.toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "1" }));
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it("disables previous button on first page", () => {
    renderTable({ page: 0, pageSize: 2, total: 5, onPageChange: vi.fn() });
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();
  });

  it("supports bulk selection with select-all checkbox", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderTable({ selectedKeys: new Set<string>(), onSelectionChange });
    const selectAll = screen.getByRole("checkbox", { name: "Selecionar todos" });
    await user.click(selectAll);
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["1", "2", "3"]));
  });

  it("deselects all when all are selected", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderTable({ selectedKeys: new Set(["1", "2", "3"]), onSelectionChange });
    await user.click(screen.getByRole("checkbox", { name: "Selecionar todos" }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it("toggles individual row selection", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderTable({ selectedKeys: new Set<string>(), onSelectionChange });
    await user.click(screen.getByRole("checkbox", { name: "Selecionar linha 1" }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["1"]));
  });

  it("shows selection bar count when rows are selected", () => {
    renderTable({ selectedKeys: new Set(["1", "3"]), onSelectionChange: vi.fn() });
    expect(screen.getByText("2 selecionados")).toBeInTheDocument();
  });

  it("shows empty state when data is empty", () => {
    renderTable({ data: [] });
    expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
  });

  it("renders loading skeleton rows", () => {
    renderTable({ loading: true });
    const table = screen.getByRole("table", { name: "Itens de teste" });
    expect(table.querySelectorAll("tbody tr")).toHaveLength(5);
  });

  it("renders row actions", () => {
    renderTable({
      renderRowActions: (row: Row) => <Button size="compact">Editar {row.name}</Button>,
    });
    expect(screen.getByRole("button", { name: "Editar Item A" })).toBeInTheDocument();
  });

  it("renders cards mode", () => {
    renderTable({ cardsMode: true });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Itens de teste" })).toBeInTheDocument();
    expect(screen.getByText("Item A")).toBeInTheDocument();
  });

  it("renders custom toolbar", () => {
    renderTable({ toolbar: <Button>Novo item</Button> });
    expect(screen.getByRole("button", { name: "Novo item" })).toBeInTheDocument();
  });
});

describe("Kanban", () => {
  it("renders columns with titles, counts, and cards", () => {
    render(
      <Kanban
        columns={[
          {
            key: "todo",
            title: "A fazer",
            count: 2,
            cards: [
              { id: "k1", title: "Tarefa 1", meta: <span>Alta</span> },
              { id: "k2", title: "Tarefa 2" },
            ],
          },
          {
            key: "done",
            title: "Concluido",
            count: 1,
            totalValue: <span>R$ 5.000</span>,
            cards: [{ id: "k3", title: "Tarefa 3" }],
          },
        ]}
      />,
    );
    expect(screen.getByText("A fazer")).toBeInTheDocument();
    expect(screen.getByText("Concluido")).toBeInTheDocument();
    expect(screen.getByText("Tarefa 1")).toBeInTheDocument();
    expect(screen.getByText("Tarefa 2")).toBeInTheDocument();
    expect(screen.getByText("Tarefa 3")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
    expect(screen.getByText("R$ 5.000")).toBeInTheDocument();
  });
});
