import { NavLink } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { AppIcon } from "./AppIcon";
import { getVisibleNavigation } from "./navigation";

export function AppNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth();
  const items = getVisibleNavigation(can);
  const primaryItems = items.filter((item) => item.placement === "primary");
  const utilityItems = items.filter((item) => item.placement === "utility");

  const renderItem = (item: (typeof items)[number]) => (
    <li key={item.label}>
      <NavLink
        to={item.path!}
        end={item.path === "/"}
        title={item.label}
        className={({ isActive }) => `eg-app-nav__link${isActive ? " is-active" : ""}`}
        onClick={onNavigate}
      >
        <span className="eg-app-nav__icon">{item.icon ? <AppIcon name={item.icon} /> : null}</span>
        <span className="eg-app-nav__label">{item.label}</span>
      </NavLink>
    </li>
  );

  return (
    <nav className="eg-app-nav" aria-label="Navegação principal">
      <ul className="eg-app-nav__list">{primaryItems.map(renderItem)}</ul>
      {utilityItems.length > 0 ? <ul className="eg-app-nav__list eg-app-nav__list--utility">{utilityItems.map(renderItem)}</ul> : null}
    </nav>
  );
}
