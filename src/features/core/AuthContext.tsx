import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { Profile, Organization, OrganizationMembership, UserRoleContext, Role } from "@/types";
import { AuthContext, type AuthState } from "./auth-context";

export type { AuthState };

const EMPTY_ROLES: UserRoleContext = { roles: [], permissions: [] };

interface MembershipRoleRow {
  role_id: string;
  role: Role | null;
}

interface RolePermissionRow {
  permission: { code: string } | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [userRoles, setUserRoles] = useState<UserRoleContext>(EMPTY_ROLES);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (currentUser: User) => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: membershipData } = await supabase
        .from("organization_memberships")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("status", "active");

      if (membershipData) {
        setMemberships(membershipData);

        if (membershipData.length > 0) {
          const primaryMembership = membershipData[0]!;
          const { data: orgData } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", primaryMembership.organization_id)
            .single();

          if (orgData) {
            setActiveOrganization(orgData);
          }

          const { data: membershipRolesData } = await supabase
            .from("membership_roles")
            .select("role_id, role:roles(*)")
            .eq("membership_id", primaryMembership.id);

          if (membershipRolesData) {
            const typedRoles = membershipRolesData as unknown as MembershipRoleRow[];
            const roles = typedRoles
              .map((mr) => mr.role)
              .filter((r): r is Role => r !== null);

            const { data: rolePermsData } = await supabase
              .from("role_permissions")
              .select("permission:permissions(code)")
              .in(
                "role_id",
                roles.map((r) => r.id)
              );

            const typedPerms = (rolePermsData ?? []) as unknown as RolePermissionRow[];
            const permissions = [
              ...new Set(
                typedPerms
                  .map((rp) => rp.permission?.code)
                  .filter((code): code is string => code !== undefined)
              ),
            ];

            setUserRoles({ roles, permissions });
          }
        }
      }
    } catch (err) {
      logger.error("Erro ao carregar dados do usuário", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        loadUserData(currentSession.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, newSession: Session | null) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        loadUserData(newSession.user);
      } else {
        setProfile(null);
        setMemberships([]);
        setActiveOrganization(null);
        setUserRoles(EMPTY_ROLES);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logger.warn("Tentativa de login falhou", { error: error.message });
      if (error.message.includes("Invalid login")) {
        return { error: "Credenciais inválidas." };
      }
      if (error.message.includes("network") || error.message.includes("fetch")) {
        return { error: "Erro de conexão. Verifique sua internet." };
      }
      return { error: "Erro ao realizar login. Tente novamente." };
    }
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setMemberships([]);
    setActiveOrganization(null);
    setUserRoles(EMPTY_ROLES);
  }, []);

  const can = useCallback(
    (permission: string) => userRoles.permissions.includes(permission),
    [userRoles.permissions]
  );

  const hasRole = useCallback(
    (roleCode: string) => userRoles.roles.some((r) => r.code === roleCode),
    [userRoles.roles]
  );

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      memberships,
      activeOrganization,
      userRoles,
      loading,
      signIn,
      signOut,
      can,
      hasRole,
    }),
    [
      user,
      session,
      profile,
      memberships,
      activeOrganization,
      userRoles,
      loading,
      signIn,
      signOut,
      can,
      hasRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
