import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";
import type { ButtonVariant } from "./Button";

export interface IconButtonProps extends ComponentPropsWithRef<"button"> {
  "aria-label": string;
  variant?: ButtonVariant;
  size?: "compact" | "comfortable";
}

export function IconButton({
  variant = "text",
  size = "comfortable",
  type = "button",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={cx("eg-icon-button", className)}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  );
}
