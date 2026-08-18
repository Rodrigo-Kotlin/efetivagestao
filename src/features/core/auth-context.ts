import { createContext } from "react";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile, Organization, OrganizationMembership, UserRoleContext } from "@/types";

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  memberships: OrganizationMembership[];
  activeOrganization: Organization | null;
  userRoles: UserRoleContext;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  can: (permission: string) => boolean;
  hasRole: (roleCode: string) => boolean;
}

export const AuthContext = createContext<AuthState | null>(null);
