import { Link, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/features/core/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function MainLayout() {
  const { user, profile, activeOrganization, signOut } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {!isOnline && (
        <div
          role="alert"
          style={{
            backgroundColor: "var(--color-warning)",
            color: "var(--color-text)",
            textAlign: "center",
            padding: "var(--space-2)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
          }}
        >
          Você está offline. Algumas funcionalidades podem estar indisponíveis.
        </div>
      )}

      <header
        style={{
          backgroundColor: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          padding: "var(--space-4) var(--space-6)",
          position: "sticky",
          top: 0,
          zIndex: "var(--z-header)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              textDecoration: "none",
              color: "var(--color-text)",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                backgroundColor: "var(--color-primary)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-inverse)",
                fontWeight: "var(--font-bold)",
                fontSize: "var(--text-lg)",
              }}
              aria-hidden="true"
            >
              E
            </div>
            <div>
              <div
                style={{
                  fontWeight: "var(--font-bold)",
                  fontSize: "var(--text-lg)",
                  lineHeight: 1.2,
                }}
              >
                Efetiva Gestão
              </div>
              {activeOrganization && (
                <div
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.2,
                  }}
                >
                  {activeOrganization.name}
                </div>
              )}
            </div>
          </Link>

          {user && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
                aria-label="Menu do usuário"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3)",
                  backgroundColor: "transparent",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text)",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--color-primary-100)",
                    color: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "var(--font-semibold)",
                    fontSize: "var(--text-xs)",
                  }}
                  aria-hidden="true"
                >
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? user.email?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <span style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {profile?.full_name ?? user.email}
                </span>
              </button>

              {menuOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 10 }}
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <nav
                    role="menu"
                    aria-label="Menu do usuário"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "100%",
                      marginTop: "var(--space-2)",
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-lg)",
                      minWidth: "200px",
                      zIndex: 20,
                      overflow: "hidden",
                    }}
                  >
                    {user.email && (
                      <div
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          borderBottom: "1px solid var(--color-border-light)",
                          fontSize: "var(--text-xs)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {user.email}
                      </div>
                    )}
                    <button
                      onClick={handleSignOut}
                      role="menuitem"
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "var(--space-3) var(--space-4)",
                        backgroundColor: "transparent",
                        border: "none",
                        fontSize: "var(--text-sm)",
                        color: "var(--color-error)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      Sair
                    </button>
                  </nav>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: "1400px",
          width: "100%",
          margin: "0 auto",
          padding: "var(--space-6) var(--space-4)",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
