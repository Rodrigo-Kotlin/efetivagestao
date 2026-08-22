import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";

export interface DetailGridProps extends ComponentPropsWithRef<"div"> {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

export function DetailGrid({
  children,
  columns = 2,
  className,
  ...props
}: DetailGridProps) {
  return (
    <div
      {...props}
      className={cx("eg-detail-grid", className)}
      data-columns={columns}
    >
      {children}
    </div>
  );
}

export interface DetailFieldProps extends ComponentPropsWithRef<"div"> {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  span?: 1 | 2 | 3 | "full";
  emptyText?: string;
}

export function DetailField({
  label,
  value,
  mono = false,
  span,
  emptyText = "—",
  className,
  ...props
}: DetailFieldProps) {
  const isEmpty = value === null || value === undefined || value === "";
  const display = isEmpty ? emptyText : value;

  return (
    <div
      {...props}
      className={cx("eg-detail-field", className)}
      data-span={span}
    >
      <dt className="eg-detail-field__label">{label}</dt>
      <dd
        className={cx("eg-detail-field__value", mono && "eg-detail-field__value--mono")}
        data-empty={isEmpty || undefined}
      >
        {display}
      </dd>
    </div>
  );
}
