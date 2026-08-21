import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";
import { cx } from "./cx";

const MenuCloseContext = createContext<(() => void) | null>(null);

export interface DropdownMenuProps {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}

export function DropdownMenu({ label, trigger, children, align = "end", className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<"first" | "last">("first");

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']:not([disabled])") ?? []);
    const initialItem = initialFocusRef.current === "last" ? items.at(-1) : items[0];
    initialItem?.focus();

    const handlePointerDown = (event: MouseEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) close();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']:not([disabled])") ?? []);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "Tab") {
      requestAnimationFrame(close);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || items.length === 0) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (event.key === "ArrowDown") nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    if (event.key === "ArrowUp") nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    items[nextIndex]?.focus();
  };

  return (
    <div ref={rootRef} className={cx("eg-dropdown", className)}>
      <button
        ref={triggerRef}
        type="button"
        className="eg-dropdown__trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          initialFocusRef.current = "first";
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            initialFocusRef.current = event.key === "ArrowUp" ? "last" : "first";
            setOpen(true);
          }
        }}
      >
        {trigger}
      </button>
      {open ? (
        <MenuCloseContext.Provider value={close}>
          <div
            ref={menuRef}
            id={menuId}
            className="eg-dropdown__menu"
            data-align={align}
            role="menu"
            aria-label={label}
            onKeyDown={handleMenuKeyDown}
          >
            {children}
          </div>
        </MenuCloseContext.Provider>
      ) : null}
    </div>
  );
}

export interface MenuItemProps extends ComponentPropsWithRef<"button"> {
  tone?: "default" | "destructive";
}

export function MenuItem({ tone = "default", className, onClick, ...props }: MenuItemProps) {
  const close = useContext(MenuCloseContext);
  return (
    <button
      {...props}
      type="button"
      role="menuitem"
      className={cx("eg-dropdown__item", className)}
      data-tone={tone}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) close?.();
      }}
    />
  );
}
