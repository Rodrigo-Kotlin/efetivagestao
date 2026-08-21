import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";

export interface FormActionsProps extends ComponentPropsWithRef<"div"> {
  /** Content before the gap, usually primary action. */
  leading?: ReactNode;
}

export function FormActions({ leading, className, children, ...props }: FormActionsProps) {
  return (
    <div {...props} className={cx("eg-form-actions", className)}>
      {leading}
      {children}
    </div>
  );
}
