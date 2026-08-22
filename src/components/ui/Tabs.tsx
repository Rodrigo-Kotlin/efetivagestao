import {
  createContext,
  useContext,
  useId,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { cx } from "./cx";

export interface TabItem {
  key: string;
  label: ReactNode;
  panel: ReactNode;
  disabled?: boolean;
}

export interface SimpleTabsProps {
  items: TabItem[];
  defaultActiveKey: string;
  onChange?: (key: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function SimpleTabs({
  items,
  defaultActiveKey,
  onChange,
  className,
  ariaLabel,
}: SimpleTabsProps) {
  const baseId = useId();
  const [activeKey, setActiveKey] = useState(defaultActiveKey);

  const setActive = (key: string) => {
    setActiveKey(key);
    onChange?.(key);
  };

  const enabledItems = items.filter((i) => !i.disabled);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = enabledItems.findIndex((i) => i.key === activeKey);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % enabledItems.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = enabledItems.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextKey = enabledItems[nextIndex]?.key;
    if (nextKey) setActive(nextKey);
  };

  const activeItem = items.find((i) => i.key === activeKey);

  return (
    <div className={cx("eg-tabs", className)} data-active-key={activeKey}>
      <div
        role="tablist"
        aria-label={ariaLabel ?? "Tabs"}
        className="eg-tab-list"
        onKeyDown={handleKeyDown}
      >
        {items.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.key}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.key}`}
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              className="eg-tab"
              data-state={isActive ? "active" : "inactive"}
              onClick={() => !item.disabled && setActive(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeItem ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.key}`}
          aria-labelledby={`${baseId}-tab-${activeItem.key}`}
          tabIndex={0}
          className="eg-tab-panel"
        >
          {activeItem.panel}
        </div>
      ) : null}
    </div>
  );
}

interface CompoundTabsContextValue {
  baseId: string;
  activeKey: string;
  setActive: (key: string) => void;
  getPanelId: (key: string) => string;
  getTabId: (key: string) => string;
}

const CompoundTabsContext = createContext<CompoundTabsContextValue | null>(null);

function useCompoundTabs() {
  const ctx = useContext(CompoundTabsContext);
  if (!ctx) throw new Error("Tab components must be used within Tabs");
  return ctx;
}

export interface TabsProps {
  defaultActiveKey: string;
  children: ReactNode;
  onChange?: (key: string) => void;
  className?: string;
}

export function Tabs({ defaultActiveKey, children, onChange, className }: TabsProps) {
  const baseId = useId();
  const [activeKey, setActiveKey] = useState(defaultActiveKey);

  const setActive = (key: string) => {
    setActiveKey(key);
    onChange?.(key);
  };

  const ctx: CompoundTabsContextValue = {
    baseId,
    activeKey,
    setActive,
    getPanelId: (key: string) => `${baseId}-panel-${key}`,
    getTabId: (key: string) => `${baseId}-tab-${key}`,
  };

  return (
    <CompoundTabsContext.Provider value={ctx}>
      <div className={cx("eg-tabs", className)} data-active-key={activeKey}>
        {children}
      </div>
    </CompoundTabsContext.Provider>
  );
}

export interface TabListProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function TabList({ children, label = "Tabs", className }: TabListProps) {
  const { activeKey, setActive } = useCompoundTabs();
  const items = Array.isArray(children) ? children : [children];

  const focusableItems = items.filter(
    (child): child is ReactElement<{ tabKey: string; disabled?: boolean }> =>
      React_isValidElement(child) && !(child.props as { disabled?: boolean }).disabled,
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabledKeys = focusableItems.map((child) => (child.props as { tabKey: string }).tabKey);
    const currentIndex = enabledKeys.indexOf(activeKey);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % enabledKeys.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + enabledKeys.length) % enabledKeys.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = enabledKeys.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextKey = enabledKeys[nextIndex];
    if (nextKey) setActive(nextKey);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx("eg-tab-list", className)}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

export interface TabProps {
  tabKey: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Tab({ tabKey, children, disabled, className }: TabProps) {
  const { activeKey, setActive, getTabId, getPanelId } = useCompoundTabs();
  const isActive = activeKey === tabKey;
  return (
    <button
      type="button"
      role="tab"
      id={getTabId(tabKey)}
      aria-selected={isActive}
      aria-controls={getPanelId(tabKey)}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      className={cx("eg-tab", className)}
      data-state={isActive ? "active" : "inactive"}
      onClick={() => !disabled && setActive(tabKey)}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  tabKey: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ tabKey, children, className }: TabPanelProps) {
  const { getPanelId, getTabId } = useCompoundTabs();
  return (
    <div
      role="tabpanel"
      id={getPanelId(tabKey)}
      aria-labelledby={getTabId(tabKey)}
      tabIndex={0}
      className={cx("eg-tab-panel", className)}
    >
      {children}
    </div>
  );
}

function React_isValidElement(value: unknown): value is ReactElement {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "props" in value &&
    (value as { type: unknown }).type !== undefined
  );
}
