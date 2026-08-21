import { useEffect, useId, useRef, useState, type ComponentPropsWithRef, type ReactNode } from "react";
import { cx } from "./cx";

export interface TableProps extends ComponentPropsWithRef<"table"> {
  caption: ReactNode;
  captionHidden?: boolean;
  density?: "comfortable" | "compact";
}

export function Table({
  caption,
  captionHidden = false,
  density = "compact",
  className,
  children,
  ...props
}: TableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const captionId = useId();
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScrollable = () => {
      setIsScrollable(container.scrollWidth > container.clientWidth);
    };
    updateScrollable();

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateScrollable);
    observer?.observe(container);
    const table = container.querySelector("table");
    if (table) observer?.observe(table);
    window.addEventListener("resize", updateScrollable);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateScrollable);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="eg-table-container"
      role={isScrollable ? "region" : undefined}
      aria-labelledby={isScrollable ? captionId : undefined}
      tabIndex={isScrollable ? 0 : undefined}
    >
      <table {...props} className={cx("eg-table", className)} data-density={density}>
        <caption id={captionId} className={captionHidden ? "sr-only" : "eg-table__caption"}>{caption}</caption>
        {children}
      </table>
    </div>
  );
}
