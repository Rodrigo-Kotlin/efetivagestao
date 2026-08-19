import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import type { Json } from "@/types/database";
import type { CatalogItem, CatalogCategory } from "@/types";
import type {
  PricingPolicy,
  PricingPolicyScopeType,
  PricingPolicyWithVersions,
  PricingPolicyVersionDetail,
  SimulationResult,
} from "../types/pricing-policy.types";

// ============================================================
// Query helpers
// ============================================================

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface FetchPricingPoliciesParams {
  orgId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  scopeType?: string;
  status?: string;
}

interface FetchCatalogParams {
  orgId: string;
  search?: string;
}

function isPgNotFound(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST116";
}

// ============================================================
// Pricing Policies
// ============================================================

export async function fetchPricingPolicies(
  params: FetchPricingPoliciesParams
): Promise<PaginatedResult<PricingPolicy>> {
  const { orgId, page = 1, pageSize = 25, search, scopeType, status } = params;

  let query = supabase
    .from("pricing_policies")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId);

  if (search) {
    query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`);
  }

  if (scopeType) {
    query = query.eq("scope_type", scopeType);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const from = (page - 1) * pageSize;
  query = query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error("Erro ao buscar políticas de preço", { error: error.message });
    throw new Error("Falha ao carregar políticas de preço");
  }

  const total = count ?? 0;

  return {
    data: (data ?? []) as unknown as PricingPolicy[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function fetchPricingPolicy(
  id: string,
  orgId: string
): Promise<PricingPolicyWithVersions | null> {
  const { data, error } = await supabase
    .from("pricing_policies")
    .select("*, versions:pricing_policy_versions(*)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .order("version_number", { referencedTable: "pricing_policy_versions", ascending: false })
    .single();

  if (error) {
    if (isPgNotFound(error)) return null;
    logger.error("Erro ao buscar política de preço", { error: error.message });
    throw new Error("Falha ao carregar política de preço");
  }

  return data as unknown as PricingPolicyWithVersions;
}

export async function fetchPricingPolicyVersion(
  id: string,
  orgId: string
): Promise<PricingPolicyVersionDetail | null> {
  const { data, error } = await supabase
    .from("pricing_policy_versions")
    .select("*, policy:pricing_policies(*), components:pricing_policy_components(*)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .order("sort_order", { referencedTable: "pricing_policy_components", ascending: true })
    .single();

  if (error) {
    if (isPgNotFound(error)) return null;
    logger.error("Erro ao buscar versão de política", { error: error.message });
    throw new Error("Falha ao carregar versão de política");
  }

  return data as unknown as PricingPolicyVersionDetail;
}

// ============================================================
// Selector helpers (catalog / suppliers)
// ============================================================

export async function fetchCatalogItemsForSelector(
  params: FetchCatalogParams
): Promise<CatalogItem[]> {
  const { orgId, search } = params;

  let query = supabase
    .from("catalog_items")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("code", { ascending: true });

  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    logger.error("Erro ao buscar itens do catálogo", { error: error.message });
    throw new Error("Falha ao carregar itens do catálogo");
  }

  return (data ?? []) as unknown as CatalogItem[];
}

export async function fetchCatalogCategoriesForSelector(
  params: FetchCatalogParams
): Promise<CatalogCategory[]> {
  const { orgId, search } = params;

  let query = supabase
    .from("catalog_categories")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    logger.error("Erro ao buscar categorias do catálogo", { error: error.message });
    throw new Error("Falha ao carregar categorias do catálogo");
  }

  return (data ?? []) as unknown as CatalogCategory[];
}

// ============================================================
// Create (workflow RPCs only)
// ============================================================

interface CreatePricingPolicyInput {
  orgId: string;
  code: string;
  name: string;
  description?: string;
  scopeType: PricingPolicyScopeType;
  catalogCategoryId?: string;
  catalogItemId?: string;
}

export async function createPricingPolicy(
  input: CreatePricingPolicyInput
): Promise<string> {
  const { data, error } = await supabase.rpc("fn_create_pricing_policy", {
    p_organization_id: input.orgId,
    p_code: input.code,
    p_name: input.name,
    p_description: input.description ?? null,
    p_scope_type: input.scopeType,
    p_catalog_category_id: input.catalogCategoryId ?? null,
    p_catalog_item_id: input.catalogItemId ?? null,
  });

  if (error) {
    logger.error("Erro ao criar política de preço", { error: error.message });
    throw new Error(mapPricingPolicyError(error.message));
  }

  await logAudit({
    organizationId: input.orgId,
    action: "pricing_policy.created",
    entityType: "pricing_policy",
    entityId: data as string,
    newData: {
      code: input.code,
      name: input.name,
      scope_type: input.scopeType,
    } as unknown as Record<string, Json>,
  });

  return data as string;
}

interface CreatePricingPolicyVersionInput {
  policyId: string;
  orgId: string;
  validFrom: string;
  validTo?: string | null;
  pricingMethod: string;
  targetMarginRate?: number | null;
  markupRate?: number | null;
  fixedPrice?: number | null;
  minimumMarginRate?: number | null;
  maximumDiscountRate?: number | null;
  roundingMode: string;
  roundingStep?: number | null;
  notes?: string | null;
}

export async function createPricingPolicyVersion(
  input: CreatePricingPolicyVersionInput
): Promise<string> {
  const { data, error } = await supabase.rpc("fn_create_pricing_policy_version", {
    p_policy_id: input.policyId,
    p_valid_from: input.validFrom,
    p_valid_to: input.validTo ?? null,
    p_pricing_method: input.pricingMethod,
    p_target_margin_rate: input.targetMarginRate ?? null,
    p_markup_rate: input.markupRate ?? null,
    p_fixed_price: input.fixedPrice ?? null,
    p_minimum_margin_rate: input.minimumMarginRate ?? null,
    p_maximum_discount_rate: input.maximumDiscountRate ?? null,
    p_rounding_mode: input.roundingMode,
    p_rounding_step: input.roundingStep ?? null,
    p_notes: input.notes ?? null,
  });

  if (error) {
    logger.error("Erro ao criar versão de política", { error: error.message });
    throw new Error(mapPricingPolicyError(error.message));
  }

  await logAudit({
    organizationId: input.orgId,
    action: "pricing_policy_version.created",
    entityType: "pricing_policy_version",
    entityId: data as string,
    newData: {
      pricing_policy_id: input.policyId,
      pricing_method: input.pricingMethod,
      valid_from: input.validFrom,
    } as unknown as Record<string, Json>,
  });

  return data as string;
}

// ============================================================
// Draft editing
// Backend contract: draft versions are fully editable via direct
// UPDATE (RLS requires pricing.policy.edit; trigger enforces that
// only draft configuration fields can change and blocks status
// transitions). We never send status/organization/actor fields.
// ============================================================

export async function updateDraftPricingPolicyVersion(
  id: string,
  orgId: string,
  data: {
    valid_from?: string;
    valid_to?: string | null;
    pricing_method?: string;
    target_margin_rate?: number | null;
    markup_rate?: number | null;
    fixed_price?: number | null;
    minimum_margin_rate?: number | null;
    maximum_discount_rate?: number | null;
    rounding_mode?: string;
    rounding_step?: number | null;
    notes?: string | null;
  }
): Promise<void> {
  // Whitelist the exact configurable columns. Even if a caller passes
  // extra keys (status, organization_id, created_by, ...) they are
  // NEVER forwarded to the database.
  const payload: Record<string, string | number | null> = {};

  const mapping: Array<[keyof typeof data, string]> = [
    ["valid_from", "valid_from"],
    ["valid_to", "valid_to"],
    ["pricing_method", "pricing_method"],
    ["target_margin_rate", "target_margin_rate"],
    ["markup_rate", "markup_rate"],
    ["fixed_price", "fixed_price"],
    ["minimum_margin_rate", "minimum_margin_rate"],
    ["maximum_discount_rate", "maximum_discount_rate"],
    ["rounding_mode", "rounding_mode"],
    ["rounding_step", "rounding_step"],
    ["notes", "notes"],
  ];

  for (const [key, column] of mapping) {
    if (key in data && data[key] !== undefined) {
      payload[column] = data[key] as string | number | null;
    }
  }

  const { error } = await supabase
    .from("pricing_policy_versions")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) {
    logger.error("Erro ao atualizar versão de política", { error: error.message });
    throw new Error(mapPricingPolicyError(error.message));
  }

  await logAudit({
    organizationId: orgId,
    action: "pricing_policy_version.updated",
    entityType: "pricing_policy_version",
    entityId: id,
    newData: payload as unknown as Record<string, Json>,
  });
}

// ============================================================
// Components (workflow RPCs only)
// ============================================================

interface ComponentInput {
  versionId: string;
  orgId: string;
  name: string;
  componentType: string;
  fixedAmount?: number | null;
  rate?: number | null;
}

export async function addPricingPolicyComponent(
  input: ComponentInput
): Promise<string> {
  const { data, error } = await supabase.rpc("fn_add_pricing_policy_component", {
    p_version_id: input.versionId,
    p_name: input.name,
    p_component_type: input.componentType,
    p_fixed_amount: input.fixedAmount ?? null,
    p_rate: input.rate ?? null,
  });

  if (error) {
    logger.error("Erro ao adicionar componente", { error: error.message });
    throw new Error(mapPricingPolicyError(error.message));
  }

  await logAudit({
    organizationId: input.orgId,
    action: "pricing_policy_component.created",
    entityType: "pricing_policy_component",
    entityId: data as string,
    newData: { name: input.name, component_type: input.componentType },
  });

  return data as string;
}

export async function updatePricingPolicyComponent(
  componentId: string,
  orgId: string,
  data: {
    name?: string;
    fixedAmount?: number | null;
    rate?: number | null;
    sortOrder?: number | null;
  }
): Promise<void> {
  const { error } = await supabase.rpc("fn_update_pricing_policy_component", {
    p_component_id: componentId,
    p_name: data.name ?? null,
    p_fixed_amount: data.fixedAmount ?? null,
    p_rate: data.rate ?? null,
    p_sort_order: data.sortOrder ?? null,
  });

  if (error) {
    logger.error("Erro ao atualizar componente", { error: error.message });
    throw new Error(mapPricingPolicyError(error.message));
  }

  await logAudit({
    organizationId: orgId,
    action: "pricing_policy_component.updated",
    entityType: "pricing_policy_component",
    entityId: componentId,
    newData: data as unknown as Record<string, Json>,
  });
}

export async function deletePricingPolicyComponent(
  componentId: string,
  orgId: string
): Promise<void> {
  const { error } = await supabase.rpc("fn_delete_pricing_policy_component", {
    p_component_id: componentId,
  });

  if (error) {
    logger.error("Erro ao remover componente", { error: error.message });
    throw new Error(mapPricingPolicyError(error.message));
  }

  await logAudit({
    organizationId: orgId,
    action: "pricing_policy_component.deleted",
    entityType: "pricing_policy_component",
    entityId: componentId,
  });
}

// ============================================================
// Workflow transitions (RPCs only — never direct status updates)
// ============================================================

interface VersionActionInput {
  versionId: string;
  orgId: string;
}

type ActionKind =
  | "submit"
  | "approve"
  | "return_to_draft"
  | "cancel"
  | "publish";

const ACTION_MAP: Record<ActionKind, string> = {
  submit: "fn_submit_pricing_policy_version",
  approve: "fn_approve_pricing_policy_version",
  return_to_draft: "fn_return_pricing_policy_version_to_draft",
  cancel: "fn_cancel_pricing_policy_version",
  publish: "fn_publish_pricing_policy_version",
};

export async function runPricingPolicyWorkflowAction(
  kind: ActionKind,
  input: VersionActionInput
): Promise<void> {
  const { data, error } = await supabase.rpc(ACTION_MAP[kind], {
    p_version_id: input.versionId,
  });

  if (error) {
    logger.error(`Erro na transição de status (${kind})`, { error: error.message });
    throw new Error(mapPricingPolicyError(error.message));
  }

  await logAudit({
    organizationId: input.orgId,
    action: `pricing_policy_version.${kind}`,
    entityType: "pricing_policy_version",
    entityId: input.versionId,
    newData: { result: data ?? null } as unknown as Record<string, Json>,
  });
}

// ============================================================
// Price Simulator (engine is the only source of truth)
// ============================================================

export interface SimulatePriceInput {
  orgId: string;
  supplierCompanyId: string;
  catalogItemId: string;
  referenceDate: string;
  discountRate: number | null;
}

export async function simulatePrice(
  input: SimulatePriceInput
): Promise<SimulationResult> {
  const { data, error } = await supabase.rpc("fn_simulate_price", {
    p_organization_id: input.orgId,
    p_supplier_company_id: input.supplierCompanyId,
    p_catalog_item_id: input.catalogItemId,
    p_reference_date: input.referenceDate,
    p_discount_rate: input.discountRate ?? null,
  });

  if (error) {
    logger.error("Erro ao simular preço", { error: error.message });
    throw new Error(mapPricingPolicyError(error.message));
  }

  return data as SimulationResult;
}

// ============================================================
// Error mapping (pt-BR)
// ============================================================

export function mapPricingPolicyError(message: string): string {
  if (message.includes("Authentication required")) {
    return "Sua sessão expirou. Faça login novamente.";
  }
  if (message.includes("Insufficient permissions")) {
    return "Você não tem permissão para realizar esta ação.";
  }
  if (message.includes("Not a member of this organization")) {
    return "Você não é membro desta organização.";
  }
  if (message.includes("Pricing policy not found")) {
    return "Política de preço não encontrada.";
  }
  if (message.includes("Pricing policy version not found")) {
    return "Versão de política não encontrada.";
  }
  if (message.includes("Version not found")) {
    return "Versão não encontrada. Ela pode ter sido removida.";
  }
  if (message.includes("Policy not found")) {
    return "Política de preço não encontrada.";
  }
  if (message.includes("Duplicate key value") || message.includes("unique")) {
    return "Já existe uma política de preço com este código para esta organização.";
  }
  if (message.includes("temporal overlap") || message.includes("overlaps")) {
    return "O período de validade desta versão se sobrepõe a outra versão da mesma política.";
  }
  if (message.includes("scope")) {
    return "Verifique o escopo da política: já existe uma política ativa com o mesmo escopo.";
  }
  if (message.includes("Only draft versions")) {
    return "Somente versões em rascunho podem ser editadas.";
  }
  if (message.includes("Only draft versions can be submitted")) {
    return "Somente versões em rascunho podem ser enviadas para revisão.";
  }
  if (message.includes("Only versions under review can be approved")) {
    return "Somente versões em revisão podem ser aprovadas.";
  }
  if (message.includes("Only approved versions can be published")) {
    return "Somente versões aprovadas podem ser publicadas.";
  }
  if (message.includes("cannot be returned")) {
    return "Somente versões em revisão podem voltar para rascunho.";
  }
  if (message.includes("cannot be cancelled")) {
    return "Esta versão não pode ser cancelada no estado atual.";
  }
  if (message.includes("must have at least one component")) {
    return "Adicione ao menos um componente antes de concluir a versão.";
  }
  if (message.includes("component") && message.includes("not found")) {
    return "Componente não encontrado.";
  }
  if (message.includes("Chk_ppv_method_integrity") || message.includes("method_integrity")) {
    return "Os campos de método de preço estão inconsistentes. Verifique margem, markup ou preço fixo.";
  }
  if (message.includes("catalog item not found")) {
    return "Item do catálogo não encontrado nesta organização.";
  }
  if (message.includes("Catalog item not found")) {
    return "Item do catálogo não encontrado nesta organização.";
  }
  return message;
}