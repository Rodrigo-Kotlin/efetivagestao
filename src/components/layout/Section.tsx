import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export interface SectionProps extends Omit<ComponentPropsWithRef<"section">, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function Section({
  title,
  description,
  actions,
  className,
  children,
  "aria-labelledby": providedLabelledBy,
  ...props
}: SectionProps) {
  const titleId = useId();
  return (
    <section
      {...props}
      className={cx("eg-section", className)}
      aria-labelledby={providedLabelledBy ?? (title ? titleId : undefined)}
    >
      {title || description || actions ? (
        <div className="eg-section__header">
          <div>
            {title ? <h2 className="eg-section__title" id={titleId}>{title}</h2> : null}
            {description ? <p className="eg-section__description">{description}</p> : null}
          </div>
          {actions ? <div className="eg-section__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
