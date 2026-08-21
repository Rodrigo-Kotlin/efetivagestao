import type { ReactNode } from "react";
import { cx } from "./cx";

export interface Filter {
  key: string;
  label: ReactNode;
  active?: boolean;
  value?: ReactNode;
}

export interface FilterBarProps {
  filters: Filter[];
  activeCount?: number;
  onFilterClick?: (key: string) => void;
  onReset?: () => void;
  /** Render a custom filter trigger for mobile. Falls back to inline chips. */
  mobileTrigger?: ReactNode;
  className?: string;
}

export function FilterBar({
  filters,
  activeCount = 0,
  onFilterClick,
  onReset,
  mobileTrigger,
  className,
}: FilterBarProps) {
  return (
    <div className={cx("eg-filter-bar", className)}>
      {mobileTrigger}
      {filters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          className="eg-filter-chip"
          data-active={filter.active || undefined}
          onClick={() => onFilterClick?.(filter.key)}
          aria-pressed={filter.active || undefined}
        >
          {filter.label}
          {filter.value ? <span>{filter.value}</span> : null}
        </button>
      ))}
      {activeCount > 0 && onReset ? (
        <button type="button" className="eg-filter-reset" onClick={onReset}>
          Limpar{activeCount > 1 ? ` (${activeCount})` : ""}
        </button>
      ) : null}
    </div>
  );
}
