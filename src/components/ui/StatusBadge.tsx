import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";
import { statusLabel, statusTone } from "./statusTone";

export interface StatusBadgeProps extends Omit<ComponentPropsWithRef<"span">, "children"> {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  const tone = statusTone(status);
  const text = label ?? statusLabel(status);
  return (
    <span
      {...props}
      className={cx("eg-badge", className)}
      data-tone={tone}
    >
      {text}
    </span>
  );
}
