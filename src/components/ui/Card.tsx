import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";

export interface CardProps extends ComponentPropsWithRef<"div"> {
  tone?: "lowest" | "low" | "default" | "high";
  padding?: "none" | "compact" | "comfortable";
  interactive?: boolean;
}

export function Card({
  tone = "lowest",
  padding = "comfortable",
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cx("eg-card", className)}
      data-tone={tone}
      data-padding={padding}
      data-interactive={interactive || undefined}
    />
  );
}
