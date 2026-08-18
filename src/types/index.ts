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

// ============================================================
// Catalog types
// ============================================================
export type CatalogCategory = Database["public"]["Tables"]["catalog_categories"]["Row"];
export type CatalogCategoryInsert = Database["public"]["Tables"]["catalog_categories"]["Insert"];
export type CatalogCategoryUpdate = Database["public"]["Tables"]["catalog_categories"]["Update"];

export type CatalogItem = Database["public"]["Tables"]["catalog_items"]["Row"];
export type CatalogItemInsert = Database["public"]["Tables"]["catalog_items"]["Insert"];
export type CatalogItemUpdate = Database["public"]["Tables"]["catalog_items"]["Update"];

export type CatalogItemAlias = Database["public"]["Tables"]["catalog_item_aliases"]["Row"];
export type CatalogItemAliasInsert = Database["public"]["Tables"]["catalog_item_aliases"]["Insert"];
export type CatalogItemAliasUpdate = Database["public"]["Tables"]["catalog_item_aliases"]["Update"];

// ============================================================
// Catalog domain constants
// ============================================================
export const ITEM_TYPES = [
  { value: "laboratory_exam", label: "Exame Laboratorial", prefix: "EXA" },
  { value: "complementary_exam", label: "Exame Complementar", prefix: "EXC" },
  { value: "radiology", label: "Radiologia", prefix: "RAD" },
  { value: "clinical_procedure", label: "Procedimento Clínico", prefix: "PROC" },
  { value: "evaluation", label: "Avaliação", prefix: "AVL" },
  { value: "consultation", label: "Consulta", prefix: "CONS" },
  { value: "package", label: "Pacote", prefix: "PAC" },
  { value: "other_service", label: "Outro Serviço", prefix: "SRV" },
] as const;

export type ItemType = (typeof ITEM_TYPES)[number]["value"];

export const EXECUTION_TYPES = [
  { value: "own", label: "Própria" },
  { value: "outsourced", label: "Terceirizada" },
  { value: "hybrid", label: "Híbrida" },
] as const;

export type ExecutionType = (typeof EXECUTION_TYPES)[number]["value"];

export const ITEM_STATUSES = [
  { value: "draft", label: "Rascunho", color: "#F59E0B" },
  { value: "active", label: "Ativo", color: "#10B981" },
  { value: "inactive", label: "Inativo", color: "#6B7280" },
  { value: "archived", label: "Arquivado", color: "#9CA3AF" },
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number]["value"];

export const ALIAS_SOURCE_TYPES = [
  { value: "manual", label: "Manual" },
  { value: "legacy", label: "Legado" },
  { value: "internal", label: "Interno" },
] as const;

export type AliasSourceType = (typeof ALIAS_SOURCE_TYPES)[number]["value"];

export const COMMERCIAL_UNITS = [
  { value: "unidade", label: "Unidade" },
  { value: "exame", label: "Exame" },
  { value: "sessão", label: "Sessão" },
  { value: "hora", label: "Hora" },
  { value: "dia", label: "Dia" },
  { value: "mes", label: "Mês" },
  { value: "pacote", label: "Pacote" },
] as const;

export type CommercialUnit = (typeof COMMERCIAL_UNITS)[number]["value"];

// ============================================================
// Catalog composite types
// ============================================================
export type CatalogCategoryWithChildren = CatalogCategory & {
  children?: CatalogCategoryWithChildren[];
};

export type CatalogItemWithCategory = CatalogItem & {
  category?: CatalogCategory | null;
};

export type CatalogItemWithAliases = CatalogItem & {
  aliases?: CatalogItemAlias[];
  category?: CatalogCategory | null;
};

export type CatalogStats = {
  total_active: number;
  total_draft: number;
  total_inactive: number;
  total_categories: number;
};

export const CATALOG_PERMISSIONS = [
  "pricing.catalog.view",
  "pricing.catalog.create",
  "pricing.catalog.edit",
  "pricing.catalog.archive",
  "pricing.catalog.manage_categories",
] as const;
