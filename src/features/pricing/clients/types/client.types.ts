// ============================================================
// Client Pricing — shared types, display constants,
// permissions, and DTOs for the client pricing UI module.
// ============================================================
// Migrations 037–040 are authoritative for all backend shapes.
// The UI never invents backend fields.

// ------------------------------------------------------------
// Domain enums (mirror DB CHECK constraints)
// ------------------------------------------------------------

export type ClientProfileStatus = "active" | "inactive" | "blocked";

export type ClientWorkflowStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "scheduled"
  | "active"
  | "superseded"
  | "cancelled";

export type ClientAssignmentResolverStatus =
  | "RESOLVED"
  | "CLIENT_NOT_FOUND"
  | "ASSIGNMENT_NOT_FOUND";

export type ClientOverrideResolverStatus =
  | "RESOLVED"
  | "CLIENT_NOT_FOUND"
  | "ITEM_NOT_FOUND"
  | "OVERRIDE_NOT_FOUND";

// ------------------------------------------------------------
// Display constants
// ------------------------------------------------------------

export interface DisplayOption<V extends string = string> {
  value: V;
  label: string;
  color: string;
}

export const CLIENT_PROFILE_STATUSES: DisplayOption<ClientProfileStatus>[] = [
  { value: "active", label: "Ativo", color: "#10B981" },
  { value: "inactive", label: "Inativo", color: "#6B7280" },
  { value: "blocked", label: "Bloqueado", color: "#EF4444" },
];

export const CLIENT_WORKFLOW_STATUSES: DisplayOption<ClientWorkflowStatus>[] = [
  { value: "draft", label: "Rascunho", color: "#F59E0B" },
  { value: "under_review", label: "Em revisão", color: "#3B82F6" },
  { value: "approved", label: "Aprovada", color: "#8B5CF6" },
  { value: "scheduled", label: "Agendada", color: "#EC4899" },
  { value: "active", label: "Ativa", color: "#10B981" },
  { value: "superseded", label: "Substituída", color: "#6B7280" },
  { value: "cancelled", label: "Cancelada", color: "#EF4444" },
];

export const CLIENT_ASSIGNMENT_RESOLVER_STATUSES: DisplayOption<ClientAssignmentResolverStatus>[] = [
  { value: "RESOLVED", label: "Resolvido", color: "#10B981" },
  { value: "CLIENT_NOT_FOUND", label: "Cliente não encontrado", color: "#EF4444" },
  { value: "ASSIGNMENT_NOT_FOUND", label: "Nenhuma atribuição", color: "#6B7280" },
];

export const CLIENT_OVERRIDE_RESOLVER_STATUSES: DisplayOption<ClientOverrideResolverStatus>[] = [
  { value: "RESOLVED", label: "Resolvido", color: "#10B981" },
  { value: "CLIENT_NOT_FOUND", label: "Cliente não encontrado", color: "#EF4444" },
  { value: "ITEM_NOT_FOUND", label: "Item não encontrado", color: "#EF4444" },
  { value: "OVERRIDE_NOT_FOUND", label: "Nenhum preço específico", color: "#6B7280" },
];

// ------------------------------------------------------------
// Permissions (RBAC codes — backend authoritative)
// ------------------------------------------------------------

export const CLIENT_PERMISSIONS = {
  view: "pricing.client.view",
  create: "pricing.client.create",
  edit: "pricing.client.edit",
  review: "pricing.client.review",
  approve: "pricing.client.approve",
  publish: "pricing.client.publish",
} as const;

// ------------------------------------------------------------
// Row shapes (1:1 with table columns)
// ------------------------------------------------------------

export interface ClientProfile {
  company_id: string;
  organization_id: string;
  status: ClientProfileStatus;
  commercial_notes: string | null;
  status_reason: string | null;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface ClientAssignment {
  id: string;
  organization_id: string;
  client_company_id: string;
  commercial_price_table_id: string;
  status: ClientWorkflowStatus;
  valid_from: string;
  valid_to: string | null;
  contract_reference: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_by: string | null;
  published_at: string | null;
  superseded_by: string | null;
  superseded_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
}

export interface ClientOverride {
  id: string;
  organization_id: string;
  client_company_id: string;
  catalog_item_id: string;
  price_amount: number;
  currency: string;
  reason: string;
  status: ClientWorkflowStatus;
  valid_from: string;
  valid_to: string | null;
  item_code_snapshot: string;
  item_name_snapshot: string;
  item_type_snapshot: string;
  source_reference_date: string | null;
  source_commercial_price_table_id: string | null;
  source_commercial_price_table_version_id: string | null;
  source_commercial_price_item_id: string | null;
  source_table_price_amount: number | null;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_by: string | null;
  published_at: string | null;
  superseded_by: string | null;
  superseded_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
}

// ------------------------------------------------------------
// Composite / derived shapes
// ------------------------------------------------------------

export interface ClientWithCompany extends ClientProfile {
  company?: {
    id: string;
    legal_name: string | null;
    trade_name: string | null;
    tax_id: string | null;
    status: string;
  } | null;
  assignment_count?: number;
  override_count?: number;
}

export interface ClientAssignmentDetail extends ClientAssignment {
  commercial_price_table?: {
    id: string;
    code: string;
    name: string;
    status: string;
  } | null;
}

export interface ClientOverrideDetail extends ClientOverride {
  catalog_item?: {
    id: string;
    code: string;
    name: string;
    item_type: string;
    status: string;
  } | null;
}

// ------------------------------------------------------------
// Resolver result shapes
// ------------------------------------------------------------

export interface AssignmentResolverResult {
  status: ClientAssignmentResolverStatus;
  organization_id: string;
  client_company_id: string;
  reference_date: string;
  client?: {
    company_id: string;
    company_status: string;
    client_profile_status: string;
  };
  assignment?: {
    id: string;
    status: string;
    commercial_price_table_id: string;
    valid_from: string;
    valid_to: string | null;
  };
}

export interface OverrideResolverResult {
  status: ClientOverrideResolverStatus;
  organization_id: string;
  client_company_id: string;
  catalog_item_id: string;
  reference_date: string;
  client?: {
    company_id: string;
    company_status: string;
    client_profile_status: string;
  };
  override?: {
    id: string;
    status: string;
    valid_from: string;
    valid_to: string | null;
  };
  item?: {
    catalog_item_id: string;
    status: string;
    item_code_snapshot: string;
    item_name_snapshot: string;
    item_type_snapshot: string;
  };
  price_amount?: number;
  currency?: string;
  reason?: string;
  workflow?: Record<string, string | null>;
  provenance?: {
    source_reference_date: string;
    source_commercial_price_table_id: string;
    source_commercial_price_table_version_id: string;
    source_commercial_price_item_id: string;
    source_table_price_amount: number;
  } | null;
}

// ------------------------------------------------------------
// Company selector option
// ------------------------------------------------------------

export interface CompanyOption {
  id: string;
  legal_name: string | null;
  trade_name: string | null;
  tax_id: string | null;
  status: string;
  is_supplier: boolean;
}

// ------------------------------------------------------------
// Commercial table selector option
// ------------------------------------------------------------

export interface CommercialTableOption {
  id: string;
  code: string;
  name: string;
  status: string;
}

// ------------------------------------------------------------
// Catalog item selector option
// ------------------------------------------------------------

export interface CatalogItemOption {
  id: string;
  code: string;
  name: string;
  item_type: string;
  status: string;
}

// ------------------------------------------------------------
// API DTOs
// ------------------------------------------------------------

export interface CreateClientProfileInput {
  companyId: string;
  orgId: string;
}

export interface SetClientProfileStatusInput {
  clientCompanyId: string;
  status: ClientProfileStatus;
  reason: string;
}

export interface CreateAssignmentInput {
  orgId: string;
  clientCompanyId: string;
  commercialPriceTableId: string;
  validFrom: string;
  validTo: string | null;
  contractReference: string | null;
  notes: string | null;
}

export interface UpdateAssignmentInput {
  assignmentId: string;
  validFrom: string;
  validTo: string | null;
  contractReference: string | null;
  notes: string | null;
}

export interface CreateOverrideInput {
  orgId: string;
  clientCompanyId: string;
  catalogItemId: string;
  priceAmount: number;
  reason: string;
  validFrom: string;
  validTo: string | null;
}

export interface UpdateOverrideInput {
  overrideId: string;
  priceAmount: number;
  reason: string;
  validFrom: string;
  validTo: string | null;
}

export interface CaptureProvenanceInput {
  overrideId: string;
  referenceDate: string;
}

export interface ResolveAssignmentInput {
  orgId: string;
  clientCompanyId: string;
  referenceDate: string;
}

export interface ResolveOverrideInput {
  orgId: string;
  clientCompanyId: string;
  catalogItemId: string;
  referenceDate: string;
}

// ------------------------------------------------------------
// Permission sets (UX helper)
// ------------------------------------------------------------

export interface ClientPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canReview: boolean;
  canApprove: boolean;
  canPublish: boolean;
}

// ------------------------------------------------------------
// Status reason transition map
// ------------------------------------------------------------

export const STATUS_TRANSITIONS: Record<ClientProfileStatus, ClientProfileStatus[]> = {
  active: ["inactive", "blocked"],
  inactive: ["active", "blocked"],
  blocked: ["active", "inactive"],
};
