import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";
import { statusTone } from "./statusTone";

export interface StatusBadgeProps extends ComponentPropsWithRef<"span"> {
  status: string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const tone = statusTone(status);
  return (
    <span
      {...props}
      className={cx("eg-badge", className)}
      data-tone={tone}
    >
      {status}
    </span>
  );
}
