import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";

export interface EmptyStateProps extends Omit<ComponentPropsWithRef<"div">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  actions,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div {...props} className={cx("eg-empty-state", className)}>
      {icon ? <div className="eg-empty-state__icon" aria-hidden="true">{icon}</div> : null}
      <h3 className="eg-empty-state__title">{title}</h3>
      {description ? <p className="eg-empty-state__description">{description}</p> : null}
      {actions ? <div className="eg-empty-state__actions">{actions}</div> : null}
    </div>
  );
}
