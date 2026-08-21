import { useCallback, useId, useRef, type ReactNode } from "react";
import { cx } from "./cx";
import { Spinner } from "./Spinner";

export interface SearchFieldProps {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  debounceMs?: number;
  className?: string;
  "aria-label"?: string;
}

export function SearchField({
  label = "Buscar",
  value,
  onChange,
  placeholder = "Buscar…",
  loading = false,
  debounceMs,
  className,
  "aria-label": ariaLabel,
}: SearchFieldProps) {
  const inputId = useId();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      if (debounceMs && debounceMs > 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onChange(next), debounceMs);
      } else {
        onChange(next);
      }
    },
    [onChange, debounceMs],
  );

  const handleClear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange("");
  }, [onChange]);

  return (
    <div className={cx("eg-search-field", className)}>
      <span className="eg-search-field__icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="5.25" stroke="currentColor" strokeWidth="1.5" />
          <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <label htmlFor={inputId} className="sr-only">{label}</label>
      <input
        id={inputId}
        type="search"
        className="eg-input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={ariaLabel ?? String(label)}
        aria-busy={loading || undefined}
        data-has-loading={loading || undefined}
        data-has-clear={value.length > 0 || undefined}
      />
      {loading ? (
        <span className="eg-search-field__loading">
          <Spinner size="small" />
        </span>
      ) : null}
      {value.length > 0 ? (
        <button
          type="button"
          className="eg-search-field__clear"
          aria-label="Limpar busca"
          onClick={handleClear}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
