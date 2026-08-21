import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Alert, Drawer, IconButton } from "@/components/ui";
import { useAuth } from "@/features/core/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { AppIcon } from "./app-shell/AppIcon";
import { AppNavigation } from "./app-shell/AppNavigation";
import { getRouteContext } from "./app-shell/routeContext";
import { UserMenu } from "./app-shell/UserMenu";
import "./app-shell/app-shell.css";

export function MainLayout() {
  const { user, profile, activeOrganization, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const restoreMobileNavigationFocus = useRef(true);
  const routeContext = getRouteContext(location.pathname);
  const userName = profile?.full_name ?? user?.email ?? "Usuário";

  useEffect(() => {
    restoreMobileNavigationFocus.current = false;
    setMobileNavigationOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const persistentNavigation = window.matchMedia("(min-width: 48rem)");
    const closeTemporaryNavigation = (event: MediaQueryListEvent | MediaQueryList) => {
      if (!event.matches) return;
      restoreMobileNavigationFocus.current = false;
      setMobileNavigationOpen(false);
    };
    persistentNavigation.addEventListener("change", closeTemporaryNavigation);
    closeTemporaryNavigation(persistentNavigation);
    return () => persistentNavigation.removeEventListener("change", closeTemporaryNavigation);
  }, []);

  const openMobileNavigation = () => {
    restoreMobileNavigationFocus.current = true;
    setMobileNavigationOpen(true);
  };

  const handleMobileNavigation = () => {
    restoreMobileNavigationFocus.current = false;
    setMobileNavigationOpen(false);
    requestAnimationFrame(() => document.getElementById("main-content")?.focus());
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="eg-app-shell">
      <a className="eg-skip-link" href="#main-content">Ir para o conteúdo</a>

      <aside className="eg-shell-drawer" aria-label="Barra lateral da aplicação">
        <div className="eg-shell-brand">
          <Link to="/" className="eg-shell-brand__link" aria-label="Efetiva Gestão, Dashboard">
            <span className="eg-shell-brand__mark" aria-hidden="true">E</span>
            <span className="eg-shell-brand__copy">
              <strong>Efetiva Gestão</strong>
              <small>Gestão empresarial</small>
            </span>
          </Link>
          {activeOrganization ? (
            <div className="eg-shell-organization">
              <span>Organização ativa</span>
              <strong title={activeOrganization.name}>{activeOrganization.name}</strong>
            </div>
          ) : null}
        </div>
        <AppNavigation />
      </aside>

      <div className="eg-shell-main">
        {!isOnline ? (
          <Alert tone="warning" role="alert" className="eg-offline-banner eg-shell-offline">
            Você está offline. Algumas funcionalidades podem estar indisponíveis.
          </Alert>
        ) : null}

        <header className="eg-top-app-bar">
          <IconButton
            className="eg-top-app-bar__nav-control"
            aria-label="Abrir navegação"
            onClick={openMobileNavigation}
          >
            <AppIcon name="menu" />
          </IconButton>
          <div className="eg-top-app-bar__context" aria-live="polite">
            <small>{routeContext.section}</small>
            <strong>{routeContext.page}</strong>
          </div>
          {user ? (
            <UserMenu
              name={userName}
              email={user.email}
              organization={activeOrganization?.name}
              onSignOut={handleSignOut}
            />
          ) : null}
        </header>

        <main className="eg-shell-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <Drawer
        open={mobileNavigationOpen}
        onOpenChange={setMobileNavigationOpen}
        title="Efetiva Gestão"
        description={activeOrganization?.name}
        restoreFocus={restoreMobileNavigationFocus.current}
      >
        <div className="eg-mobile-navigation">
          <AppNavigation onNavigate={handleMobileNavigation} />
        </div>
      </Drawer>
    </div>
  );
}
