import type { ReactNode } from "react";
import { cx } from "./cx";

export interface FormAlertProps {
  tone: "success" | "error" | "warning" | "info";
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  role?: string;
}

export function FormAlert({ tone, children, actions, className, role }: FormAlertProps) {
  return (
    <div
      role={role ?? (tone === "error" ? "alert" : "status")}
      className={cx("eg-form-alert", className)}
      data-tone={tone}
    >
      <div className="eg-form-alert__marker" aria-hidden="true" />
      <div>{children}</div>
      {actions ? <div className="eg-form-alert__actions">{actions}</div> : null}
    </div>
  );
}
