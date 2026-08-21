import { cx } from "./cx";

export interface SkeletonProps {
  variant?: "text" | "block" | "circle";
  lines?: number;
  className?: string;
}

export function Skeleton({ variant = "text", lines = 1, className }: SkeletonProps) {
  return (
    <div className={cx("eg-skeleton-group", className)} aria-hidden="true">
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <span key={index} className="eg-skeleton" data-variant={variant} />
      ))}
    </div>
  );
}
