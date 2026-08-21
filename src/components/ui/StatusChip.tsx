import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";
import type { SemanticTone } from "./Badge";

export interface StatusChipProps extends ComponentPropsWithRef<"span"> {
  tone?: SemanticTone;
  icon?: ReactNode;
}

export function StatusChip({
  tone = "neutral",
  icon,
  className,
  children,
  ...props
}: StatusChipProps) {
  return (
    <span {...props} className={cx("eg-status-chip", className)} data-tone={tone}>
      {icon ? <span className="eg-status-chip__icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}
