// ============================================================
// PRC-04D: Pricing Policy & Price Simulator types
//
// These interfaces mirror the backend contract (migrations 026-031)
// and the RPC signatures exposed to the frontend. The backend remains
// the authoritative financial source of truth.
// ============================================================

// ------------------------------------------------------------
// Status / scope / method enums
// ------------------------------------------------------------
export type PricingPolicyStatus = "active" | "inactive";

export type PricingPolicyScopeType = "default" | "category" | "catalog_item";

export type PricingPolicyVersionStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "scheduled"
  | "active"
  | "superseded"
  | "cancelled";

export type PricingMethod = "target_margin" | "markup" | "fixed_price";

export type RoundingMode = "none" | "nearest" | "up" | "down";

export type PricingComponentType = "fixed" | "percentage_of_base_cost";

// ------------------------------------------------------------
// Display constants (pt-BR labels; never rely on color alone)
// ------------------------------------------------------------
export const POLICY_SCOPE_TYPES = [
  { value: "default", label: "Padrão" },
  { value: "category", label: "Categoria" },
  { value: "catalog_item", label: "Item do catálogo" },
] as const;

export const POLICY_STATUSES = [
  { value: "active", label: "Ativa", color: "#10B981" },
  { value: "inactive", label: "Inativa", color: "#6B7280" },
] as const;

export const POLICY_VERSION_STATUSES = [
  { value: "draft", label: "Rascunho", color: "#F59E0B" },
  { value: "under_review", label: "Em revisão", color: "#3B82F6" },
  { value: "approved", label: "Aprovada", color: "#8B5CF6" },
  { value: "scheduled", label: "Agendada", color: "#EC4899" },
  { value: "active", label: "Ativa", color: "#10B981" },
  { value: "superseded", label: "Substituída", color: "#6B7280" },
  { value: "cancelled", label: "Cancelada", color: "#EF4444" },
] as const;

export const PRICING_METHODS = [
  { value: "target_margin", label: "Margem-alvo" },
  { value: "markup", label: "Markup" },
  { value: "fixed_price", label: "Preço fixo" },
] as const;

export const ROUNDING_MODES = [
  { value: "none", label: "Sem arredondamento" },
  { value: "nearest", label: "Mais próximo" },
  { value: "up", label: "Arredondar para cima" },
  { value: "down", label: "Arredondar para baixo" },
] as const;

export const COMPONENT_TYPES = [
  { value: "fixed", label: "Valor fixo" },
  { value: "percentage_of_base_cost", label: "Percentual sobre custo-base" },
] as const;

// ------------------------------------------------------------
// Row types (mirror backend tables)
// ------------------------------------------------------------
export interface PricingPolicy {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  scope_type: PricingPolicyScopeType;
  catalog_category_id: string | null;
  catalog_item_id: string | null;
  status: PricingPolicyStatus;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface PricingPolicyVersion {
  id: string;
  organization_id: string;
  pricing_policy_id: string;
  version_number: number;
  valid_from: string;
  valid_to: string | null;
  status: PricingPolicyVersionStatus;
  pricing_method: PricingMethod;
  target_margin_rate: number | null;
  markup_rate: number | null;
  fixed_price: number | null;
  minimum_margin_rate: number | null;
  maximum_discount_rate: number | null;
  rounding_mode: RoundingMode;
  rounding_step: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  published_by: string | null;
  published_at: string | null;
  superseded_at: string | null;
}

export interface PricingPolicyComponent {
  id: string;
  organization_id: string;
  pricing_policy_version_id: string;
  name: string;
  description: string | null;
  component_type: PricingComponentType;
  fixed_amount: number | null;
  rate: number | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

// ------------------------------------------------------------
// Composite / joined types
// ------------------------------------------------------------
export interface PricingPolicyWithVersions extends PricingPolicy {
  versions?: PricingPolicyVersion[];
}

export interface PricingPolicyVersionDetail extends PricingPolicyVersion {
  policy: PricingPolicy;
  components: PricingPolicyComponent[];
}

// ------------------------------------------------------------
// Form data types (frontend representation)
// ------------------------------------------------------------
export interface PricingPolicyFormData {
  code: string;
  name: string;
  description: string;
  scope_type: PricingPolicyScopeType | "";
  catalog_category_id: string;
  catalog_item_id: string;
}

export interface PricingPolicyVersionFormData {
  valid_from: string;
  valid_to: string;
  pricing_method: PricingMethod | "";
  target_margin_rate: string;
  markup_rate: string;
  fixed_price: string;
  minimum_margin_rate: string;
  maximum_discount_rate: string;
  rounding_mode: RoundingMode;
  rounding_step: string;
  notes: string;
}

export interface PricingPolicyComponentFormData {
  name: string;
  component_type: PricingComponentType | "";
  fixed_amount: string;
  rate: string;
}

// ------------------------------------------------------------
// fn_simulate_price result (engine contract)
// ------------------------------------------------------------
export type SimulationStatus =
  | "OK"
  | "VIOLATIONS"
  | "PRICE_NOT_CALCULABLE"
  | "POLICY_NOT_FOUND"
  | "VALIDATION_FAILED";

export interface SimulationComponent {
  id: string;
  name: string;
  component_type: PricingComponentType;
  fixed_amount: number | null;
  rate: number | null;
  component_amount: number | null;
}

export interface SimulationRounding {
  mode: RoundingMode;
  step: number | null;
  applied: boolean;
}

export interface SimulationProvenanceCost {
  cost_status: string | null;
  cost_table_id: string | null;
  cost_version_id: string | null;
  cost_version_number: number | null;
  cost_valid_from: string | null;
  cost_valid_to: string | null;
}

export interface SimulationProvenancePolicy {
  pricing_policy_id: string | null;
  pricing_policy_code: string | null;
  pricing_policy_name: string | null;
  scope_type: PricingPolicyScopeType | null;
  pricing_policy_version_id: string | null;
  policy_version_number: number | null;
  policy_valid_from: string | null;
  policy_valid_to: string | null;
}

export interface SimulationProvenance {
  organization_id: string;
  supplier_company_id: string;
  catalog_item_id: string;
  reference_date: string;
  cost: SimulationProvenanceCost;
  policy: SimulationProvenancePolicy;
}

export interface SimulationResult {
  status: SimulationStatus;
  reason: string | null;
  base_cost: number | null;
  additional_fixed_total: number | null;
  additional_percentage_total: number | null;
  additional_cost_total: number | null;
  total_cost: number | null;
  pricing_method: PricingMethod | null;
  calculated_price: number | null;
  rounded_price: number | null;
  discount_rate: number | null;
  discount_amount: number | null;
  effective_price: number | null;
  gross_profit: number | null;
  margin_rate: number | null;
  markup_rate: number | null;
  margin_pct: number | null;
  markup_pct: number | null;
  components: SimulationComponent[] | null;
  rounding: SimulationRounding;
  warnings: string[];
  violations: string[];
  provenance: SimulationProvenance;
}

export type SimulationInput = {
  catalog_item_id: string;
  supplier_company_id: string;
  reference_date: string;
  discount_rate: string;
}

export type WorkflowActionKind = "submit" | "approve" | "return_to_draft" | "cancel" | "publish";

// ------------------------------------------------------------
// Permission constants
// ------------------------------------------------------------
export const POLICY_PERMISSIONS = [
  "pricing.policy.view",
  "pricing.policy.create",
  "pricing.policy.edit",
  "pricing.policy.review",
  "pricing.policy.approve",
  "pricing.policy.publish",
] as const;

export const CALCULATE_PERMISSION = "pricing.calculate";