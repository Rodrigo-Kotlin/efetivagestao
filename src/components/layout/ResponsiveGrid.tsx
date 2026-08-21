import type { ComponentPropsWithRef } from "react";
import { cx } from "@/components/ui/cx";

export interface ResponsiveGridProps extends ComponentPropsWithRef<"div"> {
  minItemWidth?: "small" | "medium" | "large";
  gap?: "3" | "4" | "6" | "8";
}

export function ResponsiveGrid({
  minItemWidth = "medium",
  gap = "4",
  className,
  ...props
}: ResponsiveGridProps) {
  return (
    <div
      {...props}
      className={cx("eg-responsive-grid", className)}
      data-min-item-width={minItemWidth}
      data-gap={gap}
    />
  );
}
