import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";
import { KPI } from "./KPI";

export interface MetricCardProps extends ComponentPropsWithRef<"div"> {
  label: ReactNode;
  value: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendLabel?: ReactNode;
  context?: ReactNode;
  icon?: ReactNode;
  interactive?: boolean;
  asChild?: boolean;
  surface?: "flat" | "tonal" | "outlined";
  className?: string;
}

export function MetricCard({
  label,
  value,
  trend,
  trendLabel,
  context,
  icon,
  interactive = false,
  surface = "flat",
  className,
  ...props
}: MetricCardProps) {
  return (
    <div
      {...props}
      className={cx("eg-metric-card", className)}
      data-interactive={interactive || undefined}
      data-surface={surface}
    >
      <KPI
        label={label}
        value={value}
        trend={trend}
        trendLabel={trendLabel}
        context={context}
        icon={icon}
      />
    </div>
  );
}
