import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { cx } from "./cx";
import { FieldFrame } from "./FieldFrame";
import { fieldDescriptionId } from "./fieldDescription";

export interface SelectProps extends ComponentPropsWithRef<"select"> {
  label: ReactNode;
  supportingText?: ReactNode;
  error?: ReactNode;
  density?: "comfortable" | "compact";
}

export function Select({
  id: providedId,
  label,
  supportingText,
  error,
  density = "comfortable",
    required,
    className,
    "aria-invalid": ariaInvalid,
    "aria-describedby": providedDescription,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return (
    <FieldFrame
      controlId={id}
      label={label}
      required={required}
      supportingText={supportingText}
      error={error}
    >
      <select
        {...props}
        id={id}
        required={required}
        className={cx("eg-select", className)}
        data-density={density}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={fieldDescriptionId(id, error, supportingText, providedDescription)}
      >
        {children}
      </select>
    </FieldFrame>
  );
}
