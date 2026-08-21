import type { ComponentPropsWithRef } from "react";
import { cx } from "@/components/ui/cx";

export interface ClusterProps extends ComponentPropsWithRef<"div"> {
  gap?: "1" | "2" | "3" | "4" | "6" | "8";
  justify?: "start" | "center" | "between" | "end";
  align?: "start" | "center" | "end";
}

export function Cluster({
  gap = "2",
  justify = "start",
  align = "center",
  className,
  ...props
}: ClusterProps) {
  return (
    <div
      {...props}
      className={cx("eg-cluster", className)}
      data-gap={gap}
      data-justify={justify}
      data-align={align}
    />
  );
}
