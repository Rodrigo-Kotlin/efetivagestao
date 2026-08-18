import type { Database } from "./database";

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type LegalEntity = Database["public"]["Tables"]["legal_entities"]["Row"];
export type BusinessUnit = Database["public"]["Tables"]["business_units"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type OrganizationMembership = Database["public"]["Tables"]["organization_memberships"]["Row"];
export type Role = Database["public"]["Tables"]["roles"]["Row"];
export type Permission = Database["public"]["Tables"]["permissions"]["Row"];
export type RolePermission = Database["public"]["Tables"]["role_permissions"]["Row"];
export type MembershipRole = Database["public"]["Tables"]["membership_roles"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

export type MembershipWithRoles = OrganizationMembership & {
  roles: (MembershipRole & { role: Role })[];
};

export type UserRoleContext = {
  roles: Role[];
  permissions: string[];
};
