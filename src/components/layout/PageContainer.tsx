import type { ComponentPropsWithRef } from "react";
import { cx } from "@/components/ui/cx";

export interface PageContainerProps extends ComponentPropsWithRef<"div"> {
  size?: "standard" | "wide";
}

export function PageContainer({ size = "standard", className, ...props }: PageContainerProps) {
  return <div {...props} className={cx("eg-page-container", className)} data-size={size} />;
}
