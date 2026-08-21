import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";

export interface ToolbarProps extends ComponentPropsWithRef<"div"> {
  /** Optional label for toolbar semantics. */
  "aria-label"?: string;
}

export function Toolbar({ className, children, ...props }: ToolbarProps) {
  return (
    <div {...props} className={cx("eg-toolbar", className)} role="toolbar">
      {children}
    </div>
  );
}

export interface ToolbarSectionProps extends ComponentPropsWithRef<"div"> {}

export function ToolbarSection({ className, children, ...props }: ToolbarSectionProps) {
  return (
    <div {...props} className={cx("eg-toolbar__section", className)}>
      {children}
    </div>
  );
}

export function ToolbarDivider() {
  return <div className="eg-toolbar__divider" aria-hidden="true" />;
}

export function ToolbarSpacer() {
  return <div className="eg-toolbar__spacer" />;
}

export function ToolbarLabel({ children }: { children: ReactNode }) {
  return <span className="eg-toolbar__label">{children}</span>;
}
