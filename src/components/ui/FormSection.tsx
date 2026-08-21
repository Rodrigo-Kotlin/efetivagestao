import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";

export interface FormSectionProps extends Omit<ComponentPropsWithRef<"fieldset">, "title"> {
  title: ReactNode;
  description?: ReactNode;
}

export function FormSection({
  title,
  description,
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
        <legend className="eg-form-section__title">{title}</legend>
        {description ? <p className="eg-form-section__description">{description}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}
