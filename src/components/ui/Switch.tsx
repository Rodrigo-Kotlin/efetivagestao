import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { activateChoiceFromRow } from "./choiceInteraction";
import { cx } from "./cx";

export interface SwitchProps extends Omit<ComponentPropsWithRef<"input">, "type" | "role"> {
  label: ReactNode;
  description?: ReactNode;
}

export function Switch({
  id: providedId,
  label,
  description,
  className,
  "aria-describedby": providedDescription,
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;
  const describedBy = [providedDescription, descriptionId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="eg-switch" onClick={activateChoiceFromRow}>
      <input
        {...props}
        id={id}
        type="checkbox"
        role="switch"
        className={cx("eg-switch__input", className)}
        aria-describedby={describedBy}
      />
      <span className="eg-switch__track" aria-hidden="true"><span /></span>
      <span>
        <label className="eg-switch__label" htmlFor={id}>{label}</label>
        {description ? <span className="eg-switch__description" id={descriptionId}>{description}</span> : null}
      </span>
    </div>
  );
}
