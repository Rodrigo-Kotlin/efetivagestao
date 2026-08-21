import type { ComponentPropsWithRef } from "react";
import { cx } from "@/components/ui/cx";

export interface StackProps extends ComponentPropsWithRef<"div"> {
  gap?: "1" | "2" | "3" | "4" | "6" | "8";
  align?: "stretch" | "start" | "center" | "end";
}

export function Stack({ gap = "4", align = "stretch", className, ...props }: StackProps) {
  return <div {...props} className={cx("eg-stack", className)} data-gap={gap} data-align={align} />;
}
