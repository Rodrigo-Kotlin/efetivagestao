import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { activateChoiceFromRow } from "./choiceInteraction";
import { cx } from "./cx";

export interface CheckboxProps extends Omit<ComponentPropsWithRef<"input">, "type"> {
  label: ReactNode;
  description?: ReactNode;
}

export function Checkbox({
  id: providedId,
  label,
  description,
  className,
  "aria-describedby": providedDescription,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;
  const describedBy = [providedDescription, descriptionId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="eg-choice" onClick={activateChoiceFromRow}>
      <input
        {...props}
        id={id}
        type="checkbox"
        className={cx("eg-choice__control", className)}
        aria-describedby={describedBy}
      />
      <div>
        <label className="eg-choice__label" htmlFor={id}>{label}</label>
        {description ? <p className="eg-choice__description" id={descriptionId}>{description}</p> : null}
      </div>
    </div>
  );
}
