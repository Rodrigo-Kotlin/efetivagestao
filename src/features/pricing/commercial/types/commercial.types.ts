// ============================================================
// Commercial Price Tables — shared types, display constants,
// permissions, and DTOs for the commercial UI module.
// ============================================================
// All RPC parameter shapes match migrations 034/035 exactly.
// All shapes used by components are derived from these types —
// the UI never invents backend fields.

import type { Json } from "@/types/database";

// ------------------------------------------------------------
// Domain enums (mirror DB CHECK constraints)
// ------------------------------------------------------------

export type CommercialTableStatus = "active" | "inactive";

export type CommercialVersionStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "scheduled"
  | "active"
  | "superseded"
  | "cancelled";

export type CommercialItemOrigin = "manual" | "pricing_engine";

export type CommercialExceptionStatus = "requested" | "approved" | "denied";

export type CommercialViolationCode =
  | "BELOW_COST"
  | "BELOW_MINIMUM_MARGIN"
  | "COMMERCIAL_DEVIATION";

export type CommercialResolverStatus =
  | "RESOLVED"
  | "TABLE_NOT_FOUND"
  | "VERSION_NOT_FOUND"
  | "PRICE_NOT_FOUND";

export type BulkOperation = "percentage" | "fixed" | "round";
export type RoundingMode = "nearest" | "up" | "down";

export type CommercialWorkflowAction =
  | "submit"
  | "return_to_draft"
  | "approve"
  | "cancel"
  | "publish";

// ------------------------------------------------------------
// Display constants
// ------------------------------------------------------------

export interface DisplayOption<V extends string = string> {
  value: V;
  label: string;
  color: string;
}

export const COMMERCIAL_TABLE_STATUSES: DisplayOption<CommercialTableStatus>[] = [
  { value: "active", label: "Ativa", color: "#16A34A" },
  { value: "inactive", label: "Inativa", color: "#6B7280" },
];

export const COMMERCIAL_VERSION_STATUSES: DisplayOption<CommercialVersionStatus>[] = [
  { value: "draft", label: "Rascunho", color: "#F59E0B" },
  { value: "under_review", label: "Em revisão", color: "#2563EB" },
  { value: "approved", label: "Aprovada", color: "#10B981" },
  { value: "scheduled", label: "Agendada", color: "#0EA5E9" },
  { value: "active", label: "Ativa", color: "#16A34A" },
  { value: "superseded", label: "Substituída", color: "#6B7280" },
  { value: "cancelled", label: "Cancelada", color: "#DC2626" },
];

export const COMMERCIAL_ITEM_ORIGINS: DisplayOption<CommercialItemOrigin>[] = [
  { value: "manual", label: "Manual", color: "#6B7280" },
  { value: "pricing_engine", label: "Motor de Precificação", color: "#7C3AED" },
];

export const COMMERCIAL_EXCEPTION_STATUSES: DisplayOption<CommercialExceptionStatus>[] = [
  { value: "requested", label: "Pendente", color: "#F59E0B" },
  { value: "approved", label: "Aprovada", color: "#10B981" },
  { value: "denied", label: "Negada", color: "#DC2626" },
];

export const COMMERCIAL_VIOLATION_CODES: DisplayOption<CommercialViolationCode>[] = [
  { value: "BELOW_COST", label: "Preço abaixo do custo", color: "#DC2626" },
  { value: "BELOW_MINIMUM_MARGIN", label: "Margem abaixo da mínima", color: "#F59E0B" },
  { value: "COMMERCIAL_DEVIATION", label: "Preço comercial abaixo da referência", color: "#2563EB" },
];

export const COMMERCIAL_WORKFLOW_ACTIONS: DisplayOption<CommercialWorkflowAction>[] = [
  { value: "submit", label: "Enviar para revisão", color: "#2563EB" },
  { value: "return_to_draft", label: "Voltar para rascunho", color: "#6B7280" },
  { value: "approve", label: "Aprovar versão", color: "#10B981" },
  { value: "cancel", label: "Cancelar versão", color: "#DC2626" },
  { value: "publish", label: "Publicar", color: "#8B5CF6" },
];

export const BULK_OPERATIONS: DisplayOption<BulkOperation>[] = [
  { value: "percentage", label: "Ajuste percentual", color: "#2563EB" },
  { value: "fixed", label: "Ajuste fixo", color: "#0EA5E9" },
  { value: "round", label: "Arredondamento", color: "#7C3AED" },
];

export const ROUNDING_MODES: DisplayOption<RoundingMode>[] = [
  { value: "nearest", label: "Mais próximo", color: "#6B7280" },
  { value: "up", label: "Para cima", color: "#6B7280" },
  { value: "down", label: "Para baixo", color: "#6B7280" },
];

export const BULK_ROUNDING_STEPS: number[] = [1.0, 0.5, 0.1];

// ------------------------------------------------------------
// Permissions (RBAC codes — backend authoritative)
// ------------------------------------------------------------

export const COMMERCIAL_PERMISSIONS = {
  view: "pricing.commercial.view",
  create: "pricing.commercial.create",
  edit: "pricing.commercial.edit",
  review: "pricing.commercial.review",
  approve: "pricing.commercial.approve",
  publish: "pricing.commercial.publish",
  exceptionApprove: "pricing.commercial.exception_approve",
} as const;

export const ENGINE_PERMISSION = "pricing.calculate";

// ------------------------------------------------------------
// Row shapes (1:1 with table columns)
// ------------------------------------------------------------

export interface CommercialPriceTable {
  id: string;
  organization_id: string;
  code: string;
  code_normalized: string;
  name: string;
  description: string | null;
  status: CommercialTableStatus;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface CommercialPriceTableVersion {
  id: string;
  organization_id: string;
  commercial_price_table_id: string;
  version_number: number;
  version_label: string | null;
  valid_from: string;
  valid_to: string | null;
  status: CommercialVersionStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  published_by: string | null;
  published_at: string | null;
  superseded_by: string | null;
  superseded_at: string | null;
}

export interface CommercialPriceItem {
  id: string;
  organization_id: string;
  commercial_price_table_version_id: string;
  catalog_item_id: string;
  price_amount: number;
  currency: string;
  item_code_snapshot: string;
  item_name_snapshot: string;
  item_type_snapshot: string;
  origin_type: CommercialItemOrigin;
  source_commercial_price_item_id: string | null;
  source_reference_date: string | null;
  source_supplier_company_id: string | null;
  source_cost_table_id: string | null;
  source_cost_version_id: string | null;
  source_cost_version_number: number | null;
  source_pricing_policy_id: string | null;
  source_pricing_policy_version_id: string | null;
  source_policy_version_number: number | null;
  source_calculated_price: number | null;
  source_total_cost: number | null;
  source_margin_rate: number | null;
  source_markup_rate: number | null;
  source_effective_price: number | null;
  pricing_snapshot: Json | null;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface CommercialPriceException {
  id: string;
  organization_id: string;
  commercial_price_table_version_id: string;
  commercial_price_item_id: string;
  violation_code: CommercialViolationCode;
  status: CommercialExceptionStatus;
  reason: string;
  requested_by: string;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
}

// ------------------------------------------------------------
// Composite / derived shapes
// ------------------------------------------------------------

export interface CommercialPriceTableWithCounts extends CommercialPriceTable {
  version_count?: number;
  current_version?: CommercialPriceTableVersion | null;
  scheduled_version?: CommercialPriceTableVersion | null;
}

export interface CommercialPriceVersionDetail extends CommercialPriceTableVersion {
  table?: Pick<
    CommercialPriceTable,
    "id" | "code" | "name" | "status" | "organization_id"
  > | null;
  item_count?: number;
  exceptions?: CommercialPriceException[];
  items?: CommercialPriceItem[];
}

export interface PublishReadinessResult {
  version_id: string;
  organization_id: string;
  status: CommercialVersionStatus;
  ready: boolean;
  blockers: string[];
  warnings: string[];
  item_count: number;
  pending_exception_count: number;
  denied_exception_count: number;
  required_exception_count: number;
  missing_exception_codes: string[];
}

export interface CommercialPriceResolverProvenance {
  source_reference_date: string | null;
  source_supplier_company_id: string | null;
  source_cost_table_id: string | null;
  source_cost_version_id: string | null;
  source_cost_version_number: number | null;
  source_pricing_policy_id: string | null;
  source_pricing_policy_version_id: string | null;
  source_policy_version_number: number | null;
  source_calculated_price: number | null;
  source_total_cost: number | null;
  source_margin_rate: number | null;
  source_markup_rate: number | null;
  source_effective_price: number | null;
  pricing_snapshot: Json | null;
}

export interface CommercialPriceResolverResult {
  status: CommercialResolverStatus;
  organization_id: string;
  reference_date: string;
  commercial_price_table_id: string;
  catalog_item_id: string;
  table?: {
    id: string;
    code: string;
    name: string;
    status: CommercialTableStatus;
  };
  version?: {
    id: string;
    version_number: number;
    status: CommercialVersionStatus;
    valid_from: string;
    valid_to: string | null;
  };
  item?: {
    commercial_price_item_id: string;
    catalog_item_id: string;
    item_code_snapshot: string;
    item_name_snapshot: string;
    item_type_snapshot: string;
  };
  price_amount?: number;
  currency?: string;
  origin_type?: CommercialItemOrigin;
  lineage?: { source_commercial_price_item_id: string | null };
  provenance?: CommercialPriceResolverProvenance;
  approved_exceptions?: CommercialPriceException[];
}

// ------------------------------------------------------------
// Catalog selector (read-only)
// ------------------------------------------------------------

export interface CatalogItemOption {
  id: string;
  code: string;
  name: string;
  status: "active" | "inactive";
  item_type: string;
}

// ------------------------------------------------------------
// Simulation (engine preview) — reuse engine result shape
// ------------------------------------------------------------

export interface CommercialEngineSimulationInput {
  orgId: string;
  supplierCompanyId: string;
  catalogItemId: string;
  referenceDate?: string;
  discountRate?: number;
}

export interface CommercialEngineSimulationResult {
  status?: string;
  recommended_price?: number;
  effective_price?: number;
  total_cost?: number;
  margin_rate?: number;
  markup_rate?: number;
  cost_table_id?: string;
  cost_version_id?: string;
  cost_version_number?: number;
  pricing_policy_id?: string;
  pricing_policy_version_id?: string;
  policy_version_number?: number;
  [key: string]: Json | string | number | boolean | null | undefined;
}

// ------------------------------------------------------------
// API DTOs (input wrappers around RPC calls)
// ------------------------------------------------------------

export interface CreateCommercialTableInput {
  orgId: string;
  code: string;
  name: string;
  description: string | null;
}

export interface UpdateCommercialTableInput {
  tableId: string;
  name: string | null;
  description: string | null;
}

export interface SetCommercialTableStatusInput {
  tableId: string;
  status: CommercialTableStatus;
}

export interface CreateCommercialVersionInput {
  tableId: string;
  validFrom: string;
  validTo: string | null;
  versionLabel: string | null;
  notes: string | null;
}

export interface AddManualItemInput {
  versionId: string;
  catalogItemId: string;
  priceAmount: number;
}

export interface UpdateItemPriceInput {
  itemId: string;
  priceAmount: number;
}

export interface DeleteItemInput {
  itemId: string;
}

export interface AddEngineItemInput {
  versionId: string;
  catalogItemId: string;
  supplierCompanyId: string;
  referenceDate: string;
  discountRate: number;
  commercialPriceAmount: number | null;
}

export interface CloneVersionInput {
  sourceVersionId: string;
  validFrom: string;
  validTo: string | null;
  versionLabel: string | null;
  notes: string | null;
}

export interface BulkAdjustInput {
  versionId: string;
  operation: BulkOperation;
  rate?: number | null;
  fixedAmount?: number | null;
  roundingMode?: RoundingMode | null;
  roundingStep?: number | null;
  itemIds?: string[] | null;
}

export interface RequestExceptionInput {
  itemId: string;
  violationCode: CommercialViolationCode;
  reason: string;
}

export interface DecideExceptionInput {
  exceptionId: string;
  decision: "approved" | "denied";
  notes: string | null;
}

export interface ResolveCommercialPriceInput {
  orgId: string;
  tableId: string;
  catalogItemId: string;
  referenceDate?: string;
}

export interface VersionCreateResult {
  version_id: string;
  version_number: number;
}

export interface CloneVersionResult {
  new_version_id: string;
  new_version_number: number;
}

// ------------------------------------------------------------
// Permission sets (UX helper)
// ------------------------------------------------------------

export interface CommercialPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canReview: boolean;
  canApprove: boolean;
  canPublish: boolean;
  canExceptionApprove: boolean;
  canCalculate: boolean;
}
