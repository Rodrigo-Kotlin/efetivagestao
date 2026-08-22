import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";

export interface FormSectionProps extends Omit<ComponentPropsWithRef<"fieldset">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function FormSection({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: FormSectionProps) {
  return (
    <fieldset
      {...props}
      className={cx("eg-form-section", className)}
    >
      <div className="eg-form-section__header">
        <div className="eg-form-section__title-group">
          <legend className="eg-form-section__title">{title}</legend>
          {description ? <p className="eg-form-section__description">{description}</p> : null}
        </div>
        {actions ? <div className="eg-form-section__actions">{actions}</div> : null}
      </div>
      {children}
    </fieldset>
  );
}
