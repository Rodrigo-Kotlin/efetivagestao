import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./Button";
import { cx } from "./cx";

const FOCUSABLE = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  dismissible?: boolean;
  /** When true, renders a destructive confirmation dialog with error-toned header. */
  destructive?: boolean;
  /** Label for the primary destructive action (e.g., "Excluir"). */
  confirmLabel?: string;
  /** Called when the destructive confirm button is clicked. Only used when `destructive` is true. */
  onConfirm?: () => void;
  /** Whether the confirm action is in a loading state. */
  confirmLoading?: boolean;
  /** Label for the destructive confirmation cancel button. */
  cancelLabel?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel = "Fechar",
  dismissible = true,
  destructive = false,
  confirmLabel = "Confirmar",
  onConfirm,
  confirmLoading = false,
  cancelLabel = "Cancelar",
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? panel)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        onOpenChangeRef.current(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [dismissible, open]);

  if (!open) return null;

  return (
    <div
      className="eg-dialog-backdrop"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div
        ref={panelRef}
        className="eg-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className={cx("eg-dialog__header", destructive && "eg-dialog__destructive-header")}>
          <div>
            <h2 className="eg-dialog__title" id={titleId}>{title}</h2>
            {description ? <p className="eg-dialog__description" id={descriptionId}>{description}</p> : null}
          </div>
          {dismissible ? <Button variant="text" size="compact" onClick={() => onOpenChange(false)}>{closeLabel}</Button> : null}
        </header>
        <div className="eg-dialog__content">{children}</div>
        {(destructive && onConfirm) || footer ? (
          <footer className="eg-dialog__footer">
            {destructive && onConfirm ? (
              <>
                <Button variant="text" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
                <Button variant="destructive" loading={confirmLoading} onClick={onConfirm}>{confirmLabel}</Button>
              </>
            ) : (
              <>{footer}</>
            )}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
