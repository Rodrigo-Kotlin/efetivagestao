import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";

export function Divider({ className, ...props }: ComponentPropsWithRef<"hr">) {
  return <hr {...props} className={cx("eg-divider", className)} />;
}
