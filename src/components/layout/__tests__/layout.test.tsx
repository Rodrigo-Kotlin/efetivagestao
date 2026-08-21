import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Button } from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout";

describe("application page layout", () => {
  it("supports standard, wide, and full page widths", () => {
    const { rerender } = render(<PageContainer data-testid="page" />);
    expect(screen.getByTestId("page")).toHaveAttribute("data-size", "standard");
    rerender(<PageContainer data-testid="page" size="wide" />);
    expect(screen.getByTestId("page")).toHaveAttribute("data-size", "wide");
    rerender(<PageContainer data-testid="page" size="full" />);
    expect(screen.getByTestId("page")).toHaveAttribute("data-size", "full");
  });

  it("renders semantic breadcrumbs and structured action regions", () => {
    render(
      <MemoryRouter>
        <PageHeader
          breadcrumbs={[{ label: "Preços & Exames", to: "/pricing" }, { label: "Custos" }]}
          title="Tabela de custos"
          description="Valores por fornecedor."
          primaryAction={<Button>Novo custo</Button>}
          secondaryActions={<Button variant="outlined">Exportar</Button>}
          overflowActions={<Button variant="text">Mais ações</Button>}
        />
      </MemoryRouter>
    );
    const breadcrumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(screen.getByRole("link", { name: "Preços & Exames" })).toHaveAttribute("href", "/pricing");
    expect(withinCurrentPage(breadcrumbs)).toHaveTextContent("Custos");
    expect(screen.getByRole("heading", { name: "Tabela de custos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo custo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mais ações" })).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Novo custo", "Exportar", "Mais ações"]);
  });
});

function withinCurrentPage(container: HTMLElement) {
  const current = container.querySelector<HTMLElement>("[aria-current='page']");
  expect(current).not.toBeNull();
  return current!;
}
