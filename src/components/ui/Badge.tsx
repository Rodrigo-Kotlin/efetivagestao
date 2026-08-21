import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";

export type SemanticTone = "neutral" | "positive" | "warning" | "negative" | "info" | "accent";

export interface BadgeProps extends ComponentPropsWithRef<"span"> {
  tone?: SemanticTone;
  mono?: boolean;
}

export function Badge({ tone = "neutral", mono = false, className, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cx("eg-badge", className)}
      data-tone={tone}
      data-mono={mono || undefined}
    />
  );
}
