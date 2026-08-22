import type { ComponentPropsWithRef, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cx } from "@/components/ui/cx";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export type PageHeaderVariant = "standard" | "compact" | "entity";

export interface PageHeaderProps extends Omit<ComponentPropsWithRef<"header">, "title"> {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  breadcrumbs?: readonly BreadcrumbItem[];
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  overflowActions?: ReactNode;
  actions?: ReactNode;
  variant?: PageHeaderVariant;
  meta?: ReactNode;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  overflowActions,
  actions,
  variant = "standard",
  meta,
  className,
  ...props
}: PageHeaderProps) {
  const hasActions = primaryAction || secondaryActions || overflowActions || actions;
  return (
    <header {...props} className={cx("eg-page-header", className)} data-variant={variant}>
      <div className="eg-page-header__copy">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="eg-breadcrumbs" aria-label="Breadcrumb">
            <ol>
              {breadcrumbs.map((item, index) => {
                const isCurrent = index === breadcrumbs.length - 1;
                return (
                  <li key={`${item.label}-${index}`}>
                    {item.to && !isCurrent ? <Link to={item.to}>{item.label}</Link> : <span aria-current={isCurrent ? "page" : undefined}>{item.label}</span>}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
        {eyebrow ? <p className="eg-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="eg-page-header__title">{title}</h1>
        {description ? <p className="eg-page-header__description">{description}</p> : null}
        {meta ? <div className="eg-page-header__meta">{meta}</div> : null}
      </div>
      {hasActions ? (
        <div className="eg-page-header__actions">
          {primaryAction ? <div className="eg-page-header__primary-action">{primaryAction}</div> : null}
          {secondaryActions || actions ? <div className="eg-page-header__secondary-actions">{secondaryActions}{actions}</div> : null}
          {overflowActions ? <div className="eg-page-header__overflow-actions">{overflowActions}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
