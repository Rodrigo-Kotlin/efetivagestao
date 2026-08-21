import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";

export interface FieldGroupProps extends ComponentPropsWithRef<"div"> {
  columns?: 1 | 2;
}

export function FieldGroup({ columns = 1, className, ...props }: FieldGroupProps) {
  return (
    <div
      {...props}
      className={cx("eg-field-group", className)}
      data-columns={columns > 1 ? String(columns) : undefined}
    />
  );
}
