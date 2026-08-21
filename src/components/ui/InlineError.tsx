import type { ReactNode } from "react";

export interface InlineErrorProps {
  id?: string;
  children: ReactNode;
  className?: string;
}

export function InlineError({ id, children, className }: InlineErrorProps) {
  return (
    <p id={id} role="alert" className={`eg-inline-error ${className ?? ""}`.trim()}>
      <svg className="eg-inline-error__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <line x1="8" y1="4.5" x2="8" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
      </svg>
      {children}
    </p>
  );
}
