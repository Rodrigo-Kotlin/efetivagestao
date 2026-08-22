import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailGrid, DetailField } from "@/components/ui/DetailGrid";

describe("DetailGrid", () => {
  it("renders children inside a grid", () => {
    render(
      <DetailGrid columns={2}>
        <DetailField label="Field A" value="Value A" />
        <DetailField label="Field B" value="Value B" />
      </DetailGrid>,
    );
    expect(screen.getByText("Field A")).toBeInTheDocument();
    expect(screen.getByText("Value A")).toBeInTheDocument();
    expect(screen.getByText("Field B")).toBeInTheDocument();
    expect(screen.getByText("Value B")).toBeInTheDocument();
  });

  it("applies data-columns attribute", () => {
    const { container } = render(
      <DetailGrid columns={3} data-testid="grid">
        <DetailField label="A" value="1" />
      </DetailGrid>,
    );
    expect(container.querySelector('[data-testid="grid"]')).toHaveAttribute("data-columns", "3");
  });
});

describe("DetailField", () => {
  it("renders label and value as dt/dd", () => {
    render(<DetailField label="Razão Social" value="Empresa XYZ" />);
    const term = screen.getByText("Razão Social");
    const def = screen.getByText("Empresa XYZ");
    expect(term.tagName).toBe("DT");
    expect(def.tagName).toBe("DD");
  });

  it("renders empty text when value is empty", () => {
    render(<DetailField label="Campo" value="" />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("—")).toHaveAttribute("data-empty");
  });

  it("renders empty text when value is null", () => {
    render(<DetailField label="Campo" value={null as unknown as string} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("supports custom emptyText", () => {
    render(<DetailField label="Campo" value="" emptyText="N/A" />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("renders span attribute when provided", () => {
    const { container } = render(
      <DetailGrid columns={2}>
        <DetailField label="A" value="1" span={2} />
      </DetailGrid>,
    );
    expect(container.querySelector('[data-span="2"]')).toBeInTheDocument();
  });

  it("renders mono font for mono values", () => {
    render(<DetailField label="CNPJ" value="12.345.678/0001-90" mono />);
    const value = screen.getByText("12.345.678/0001-90");
    expect(value.className).toContain("mono");
  });
});
