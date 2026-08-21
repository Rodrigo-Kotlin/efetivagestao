import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";
import type { SemanticTone } from "./Badge";

export interface AlertProps extends Omit<ComponentPropsWithRef<"div">, "title"> {
  tone?: Exclude<SemanticTone, "neutral" | "accent">;
  title?: ReactNode;
  actions?: ReactNode;
}

export function Alert({
  tone = "info",
  title,
  actions,
  role,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      {...props}
      role={role ?? (tone === "negative" ? "alert" : "status")}
      className={cx("eg-alert", className)}
      data-tone={tone}
    >
      <div className="eg-alert__marker" aria-hidden="true" />
      <div className="eg-alert__body">
        {title ? <strong className="eg-alert__title">{title}</strong> : null}
        <div className="eg-alert__content">{children}</div>
      </div>
      {actions ? <div className="eg-alert__actions">{actions}</div> : null}
    </div>
  );
}
