import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function ThrowingComponent(): React.ReactNode {
  throw new Error("Test error");
}

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={["/test"]}>
      <Routes>
        <Route path="/test" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ErrorBoundary", () => {
  it("renders fallback UI when child throws", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    expect(screen.getByText("Recarregar Página")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("renders children when no error", () => {
    renderWithRouter(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });
});
