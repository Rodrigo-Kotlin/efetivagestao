import { cx } from "./cx";

export interface SpinnerProps {
  label?: string;
  size?: "small" | "medium" | "large";
  className?: string;
}

export function Spinner({ label = "Carregando", size = "medium", className }: SpinnerProps) {
  return (
    <span className={cx("eg-spinner-wrap", className)} role="status">
      <span className="eg-spinner" data-size={size} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
