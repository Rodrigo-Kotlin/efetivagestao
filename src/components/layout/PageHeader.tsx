import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export interface PageHeaderProps extends Omit<ComponentPropsWithRef<"header">, "title"> {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header {...props} className={cx("eg-page-header", className)}>
      <div className="eg-page-header__copy">
        {eyebrow ? <p className="eg-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="eg-page-header__title">{title}</h1>
        {description ? <p className="eg-page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="eg-page-header__actions">{actions}</div> : null}
    </header>
  );
}
