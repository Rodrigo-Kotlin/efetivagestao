import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { cx } from "./cx";
import { FieldFrame } from "./FieldFrame";
import { fieldDescriptionId } from "./fieldDescription";

export interface TextFieldProps extends Omit<ComponentPropsWithRef<"input">, "multiline"> {
  label: ReactNode;
  supportingText?: ReactNode;
  error?: ReactNode;
  density?: "comfortable" | "compact";
  multiline?: boolean;
  rows?: number;
}

export function TextField({
  id: providedId,
  label,
  supportingText,
  error,
  density = "comfortable",
  multiline = false,
  rows = 3,
  required,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": providedDescription,
  ...props
}: TextFieldProps) {
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
      {multiline ? (
        <textarea
          {...(props as ComponentPropsWithRef<"textarea">)}
          id={id}
          required={required}
          rows={rows}
          className={cx("eg-input", className)}
          data-density={density}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={fieldDescriptionId(id, error, supportingText, providedDescription)}
        />
      ) : (
        <input
          {...props}
          id={id}
          required={required}
          className={cx("eg-input", className)}
          data-density={density}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={fieldDescriptionId(id, error, supportingText, providedDescription)}
        />
      )}
    </FieldFrame>
  );
}
