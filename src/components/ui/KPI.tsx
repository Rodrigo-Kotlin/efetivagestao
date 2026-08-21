import type { ReactNode } from "react";
import { cx } from "./cx";

export interface KPIProps {
  label: ReactNode;
  value: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendLabel?: ReactNode;
  context?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function KPI({
  label,
  value,
  trend,
  trendLabel,
  context,
  icon,
  className,
}: KPIProps) {
  return (
    <div className={cx("eg-kpi", className)}>
      <div className="eg-kpi__header">
        {icon ? <div className="eg-kpi__icon" aria-hidden="true">{icon}</div> : null}
        <span className="eg-kpi__label">{label}</span>
      </div>
      <div className="eg-kpi__value">{value}</div>
      {trend ? (
        <span className="eg-kpi__trend" data-trend={trend}>
          {trend === "up" ? "\u2191" : trend === "down" ? "\u2193" : "\u2192"}
          {trendLabel ? <span>{trendLabel}</span> : null}
        </span>
      ) : null}
      {context ? <span className="eg-kpi__context">{context}</span> : null}
    </div>
  );
}
