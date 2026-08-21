import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";

export type ButtonVariant = "filled" | "tonal" | "outlined" | "text" | "destructive";
export type ButtonSize = "compact" | "comfortable";

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "filled",
  size = "comfortable",
  loading = false,
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx("eg-button", className)}
      data-variant={variant}
      data-size={size}
      data-full-width={fullWidth || undefined}
    >
      {loading ? <span className="eg-button__spinner" aria-hidden="true" /> : leadingIcon}
      <span>{children}</span>
      {!loading && trailingIcon}
    </button>
  );
}
