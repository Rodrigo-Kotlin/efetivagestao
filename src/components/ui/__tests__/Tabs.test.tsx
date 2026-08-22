import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SimpleTabs } from "@/components/ui/Tabs";

describe("SimpleTabs", () => {
  const items = [
    { key: "tab1", label: "Tab 1", panel: <div>Content 1</div> },
    { key: "tab2", label: "Tab 2", panel: <div>Content 2</div> },
    { key: "tab3", label: "Tab 3", panel: <div>Content 3</div> },
  ];

  it("renders tabs with correct ARIA roles", () => {
    render(<SimpleTabs items={items} defaultActiveKey="tab1" />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("marks active tab with aria-selected=true", () => {
    render(<SimpleTabs items={items} defaultActiveKey="tab2" />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[2]).toHaveAttribute("aria-selected", "false");
  });

  it("renders the panel for the active tab", () => {
    render(<SimpleTabs items={items} defaultActiveKey="tab2" />);
    expect(screen.getByText("Content 2")).toBeInTheDocument();
    expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
  });

  it("switches tab on click", async () => {
    const user = userEvent.setup();
    render(<SimpleTabs items={items} defaultActiveKey="tab1" />);
    await user.click(screen.getByRole("tab", { name: "Tab 3" }));
    expect(screen.getByText("Content 3")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tab 3" })).toHaveAttribute("aria-selected", "true");
  });

  it("calls onChange when tab changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SimpleTabs items={items} defaultActiveKey="tab1" onChange={onChange} />);
    await user.click(screen.getByRole("tab", { name: "Tab 2" }));
    expect(onChange).toHaveBeenCalledWith("tab2");
  });

  it("navigates with ArrowRight key", () => {
    render(<SimpleTabs items={items} defaultActiveKey="tab1" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Tab 2" })).toHaveAttribute("aria-selected", "true");
  });

  it("navigates with ArrowLeft key", () => {
    render(<SimpleTabs items={items} defaultActiveKey="tab2" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Tab 1" })).toHaveAttribute("aria-selected", "true");
  });

  it("navigates with Home key", () => {
    render(<SimpleTabs items={items} defaultActiveKey="tab3" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "Home" });
    expect(screen.getByRole("tab", { name: "Tab 1" })).toHaveAttribute("aria-selected", "true");
  });

  it("navigates with End key", () => {
    render(<SimpleTabs items={items} defaultActiveKey="tab1" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "End" });
    expect(screen.getByRole("tab", { name: "Tab 3" })).toHaveAttribute("aria-selected", "true");
  });

  it("respects disabled tabs", async () => {
    const user = userEvent.setup();
    const disabledItems = [
      { key: "tab1", label: "Tab 1", panel: <div>Content 1</div> },
      { key: "tab2", label: "Tab 2", panel: <div>Content 2</div>, disabled: true },
      { key: "tab3", label: "Tab 3", panel: <div>Content 3</div> },
    ];
    render(<SimpleTabs items={disabledItems} defaultActiveKey="tab1" />);
    const tab2 = screen.getByRole("tab", { name: "Tab 2" });
    expect(tab2).toBeDisabled();
    await user.click(tab2);
    expect(tab2).toHaveAttribute("aria-selected", "false");
  });
});
