import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { cx } from "./cx";

export interface RadioProps extends Omit<ComponentPropsWithRef<"input">, "type"> {
  label: ReactNode;
}

export function Radio({ id: providedId, label, className, ...props }: RadioProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return (
    <label className="eg-radio" htmlFor={id}>
      <input {...props} id={id} type="radio" className={cx("eg-radio__control", className)} />
      <span>{label}</span>
    </label>
  );
}
