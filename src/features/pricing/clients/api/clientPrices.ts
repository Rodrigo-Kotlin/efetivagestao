// ============================================================
// Client Prices — centralized API layer.
// Every mutation goes through canonical RPCs from migrations 039/040.
// The UI layer never issues direct UPDATE on status columns.
// ============================================================

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import type {
  ClientProfile,
  ClientAssignment,
  ClientOverride,
  ClientAssignmentDetail,
  ClientOverrideDetail,
  CreateClientProfileInput,
  SetClientProfileStatusInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
  CreateOverrideInput,
  UpdateOverrideInput,
  CaptureProvenanceInput,
  AssignmentResolverResult,
  OverrideResolverResult,
  CompanyOption,
  CommercialTableOption,
  CatalogItemOption,
} from "../types/client.types";

// ============================================================
// READS
// ============================================================

export async function fetchClientProfiles(params: {
  orgId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<{
  data: ClientProfile[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { orgId, page = 1, pageSize = 25, search, status } = params;

  let query = supabase
    .from("client_profiles")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.ilike("company_id", `%${search}%`);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error("Falha ao listar clientes", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  const total = count ?? 0;
  return {
    data: (data ?? []) as ClientProfile[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function fetchClientProfile(
  companyCompanyId: string,
  orgId: string
): Promise<ClientProfile | null> {
  const { data, error } = await supabase
    .from("client_profiles")
    .select("*")
    .eq("company_id", companyCompanyId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) {
    logger.error("Falha ao buscar perfil do cliente", { error: error.message });
    throw mapClientPricingError(error.message);
  }
  return data as ClientProfile | null;
}

export async function fetchClientCompany(
  companyId: string
): Promise<{ id: string; legal_name: string | null; trade_name: string | null; tax_id: string | null; status: string } | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name, tax_id, status")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    logger.error("Falha ao buscar empresa", { error: error.message });
    throw mapClientPricingError(error.message);
  }
  return data;
}

export async function fetchClientAssignments(params: {
  clientCompanyId: string;
  orgId: string;
}): Promise<ClientAssignment[]> {
  const { clientCompanyId, orgId } = params;

  const { data, error } = await supabase
    .from("client_commercial_table_assignments")
    .select("*")
    .eq("organization_id", orgId)
    .eq("client_company_id", clientCompanyId)
    .order("valid_from", { ascending: false });

  if (error) {
    logger.error("Falha ao listar atribuições", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  return (data ?? []) as ClientAssignment[];
}

export async function fetchClientAssignment(
  assignmentId: string,
  orgId: string
): Promise<ClientAssignmentDetail | null> {
  const { data, error } = await supabase
    .from("client_commercial_table_assignments")
    .select("*, commercial_price_table:commercial_price_tables!fk_client_assignment_table_organization(id, code, name, status)")
    .eq("id", assignmentId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) {
    logger.error("Falha ao buscar atribuição", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  if (!data) return null;
  const row = data as Record<string, unknown>;
  const table = row.commercial_price_table;
  const detail: ClientAssignmentDetail = {
    ...(row as unknown as ClientAssignment),
    commercial_price_table: table && typeof table === "object" && !Array.isArray(table)
      ? table as ClientAssignmentDetail["commercial_price_table"]
      : null,
  };
  return detail;
}

export async function fetchClientOverrides(params: {
  clientCompanyId: string;
  orgId: string;
}): Promise<ClientOverride[]> {
  const { clientCompanyId, orgId } = params;

  const { data, error } = await supabase
    .from("client_price_overrides")
    .select("*")
    .eq("organization_id", orgId)
    .eq("client_company_id", clientCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Falha ao listar overrides", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  return (data ?? []) as ClientOverride[];
}

export async function fetchClientOverride(
  overrideId: string,
  orgId: string
): Promise<ClientOverrideDetail | null> {
  const { data, error } = await supabase
    .from("client_price_overrides")
    .select("*, catalog_item:catalog_items!fk_client_override_item_organization(id, code, name, item_type, status)")
    .eq("id", overrideId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) {
    logger.error("Falha ao buscar override", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  if (!data) return null;
  const row = data as Record<string, unknown>;
  const item = row.catalog_item;
  const detail: ClientOverrideDetail = {
    ...(row as unknown as ClientOverride),
    catalog_item: item && typeof item === "object" && !Array.isArray(item)
      ? item as ClientOverrideDetail["catalog_item"]
      : null,
  };
  return detail;
}

// ============================================================
// COMPANY/TABLE/CATALOG PICKERS
// ============================================================

export async function fetchEligibleCompanies(orgId: string): Promise<CompanyOption[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name, tax_id, status")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("legal_name");

  if (error) {
    logger.error("Falha ao buscar empresas elegíveis", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  const companies = (data ?? []) as CompanyOption[];

  if (companies.length === 0) return [];

  const companyIds = companies.map((c) => c.id);

  const { data: existingClients } = await supabase
    .from("client_profiles")
    .select("company_id")
    .in("company_id", companyIds);

  const { data: existingSuppliers } = await supabase
    .from("supplier_profiles")
    .select("company_id")
    .in("company_id", companyIds);

  const clientSet = new Set((existingClients ?? []).map((r: { company_id: string }) => r.company_id));
  const supplierSet = new Set((existingSuppliers ?? []).map((r: { company_id: string }) => r.company_id));

  return companies.map((c) => ({
    ...c,
    is_supplier: supplierSet.has(c.id),
    has_client: clientSet.has(c.id),
  })) as (CompanyOption & { has_client: boolean })[];
}

export async function fetchCommercialTableOptions(orgId: string): Promise<CommercialTableOption[]> {
  const { data, error } = await supabase
    .from("commercial_price_tables")
    .select("id, code, name, status")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("name");

  if (error) {
    logger.error("Falha ao buscar tabelas comerciais", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  return (data ?? []) as CommercialTableOption[];
}

export async function fetchCatalogItemOptions(orgId: string): Promise<CatalogItemOption[]> {
  const { data, error } = await supabase
    .from("catalog_items")
    .select("id, code, name, item_type, status")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("code");

  if (error) {
    logger.error("Falha ao buscar itens de catálogo", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  return (data ?? []) as CatalogItemOption[];
}

// ============================================================
// PROFILE CREATION & STATUS
// ============================================================

export async function createClientProfile(input: CreateClientProfileInput): Promise<void> {
  const { companyId, orgId } = input;

  const { error } = await supabase
    .from("client_profiles")
    .insert({
      company_id: companyId,
      organization_id: orgId,
    });

  if (error) {
    logger.error("Falha ao criar perfil de cliente", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  await logAudit({
    organizationId: orgId,
    action: "pricing.client.profile.created",
    entityType: "client_profile",
    entityId: companyId,
    newData: { company_id: companyId },
  });
}

export async function setClientProfileStatus(input: SetClientProfileStatusInput): Promise<void> {
  const { clientCompanyId, status, reason } = input;

  const { error } = await supabase.rpc("fn_set_client_profile_status", {
    p_client_company_id: clientCompanyId,
    p_status: status,
    p_reason: reason,
  });

  if (error) {
    logger.error("Falha ao alterar status do cliente", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  await logAudit({
    organizationId: "",
    action: `pricing.client.profile.${status === "active" ? "activated" : status === "inactive" ? "inactivated" : "blocked"}`,
    entityType: "client_profile",
    entityId: clientCompanyId,
    newData: { status, reason },
  });
}

// ============================================================
// ASSIGNMENT DRAFT CRUD
// ============================================================

export async function createAssignment(input: CreateAssignmentInput): Promise<string> {
  const { orgId, clientCompanyId, commercialPriceTableId, validFrom, validTo, contractReference, notes } = input;

  const { data, error } = await supabase
    .from("client_commercial_table_assignments")
    .insert({
      organization_id: orgId,
      client_company_id: clientCompanyId,
      commercial_price_table_id: commercialPriceTableId,
      valid_from: validFrom,
      valid_to: validTo || null,
      contract_reference: contractReference || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error) {
    logger.error("Falha ao criar atribuição", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  await logAudit({
    organizationId: orgId,
    action: "pricing.client.assignment.created",
    entityType: "client_commercial_table_assignment",
    entityId: data?.id,
    newData: { clientCompanyId, commercialPriceTableId, validFrom },
  });

  return data?.id ?? "";
}

export async function updateAssignment(input: UpdateAssignmentInput): Promise<void> {
  const { assignmentId, validFrom, validTo, contractReference, notes } = input;

  const { error } = await supabase
    .from("client_commercial_table_assignments")
    .update({
      valid_from: validFrom,
      valid_to: validTo || null,
      contract_reference: contractReference || null,
      notes: notes || null,
    })
    .eq("id", assignmentId);

  if (error) {
    logger.error("Falha ao atualizar atribuição", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from("client_commercial_table_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    logger.error("Falha ao excluir atribuição", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

// ============================================================
// ASSIGNMENT WORKFLOW RPCs
// ============================================================

export async function submitAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_submit_client_assignment", {
    p_assignment_id: assignmentId,
  });
  if (error) {
    logger.error("Falha ao submeter atribuição", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

export async function returnAssignmentToDraft(assignmentId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_return_client_assignment_to_draft", {
    p_assignment_id: assignmentId,
  });
  if (error) {
    logger.error("Falha ao retornar atribuição", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

export async function approveAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_approve_client_assignment", {
    p_assignment_id: assignmentId,
  });
  if (error) {
    logger.error("Falha ao aprovar atribuição", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

export async function cancelAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_cancel_client_assignment", {
    p_assignment_id: assignmentId,
  });
  if (error) {
    logger.error("Falha ao cancelar atribuição", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

export async function publishAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_publish_client_assignment", {
    p_assignment_id: assignmentId,
  });
  if (error) {
    logger.error("Falha ao publicar atribuição", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

export async function syncAssignmentStatus(referenceDate?: string): Promise<number> {
  const { data, error } = await supabase.rpc("fn_sync_client_assignment_status", {
    p_reference_date: referenceDate ?? undefined,
  });
  if (error) {
    logger.error("Falha ao sincronizar atribuições", { error: error.message });
    throw mapClientPricingError(error.message);
  }
  return (data as number) ?? 0;
}

// ============================================================
// OVERRIDE DRAFT CRUD
// ============================================================

export async function createOverride(input: CreateOverrideInput): Promise<string> {
  const { orgId, clientCompanyId, catalogItemId, priceAmount, reason, validFrom, validTo } = input;

  const { data, error } = await supabase
    .from("client_price_overrides")
    .insert({
      organization_id: orgId,
      client_company_id: clientCompanyId,
      catalog_item_id: catalogItemId,
      price_amount: priceAmount,
      currency: "BRL",
      reason,
      valid_from: validFrom,
      valid_to: validTo || null,
    })
    .select("id")
    .single();

  if (error) {
    logger.error("Falha ao criar override", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  await logAudit({
    organizationId: orgId,
    action: "pricing.client.override.created",
    entityType: "client_price_override",
    entityId: data?.id,
    newData: { clientCompanyId, catalogItemId, priceAmount, reason },
  });

  return data?.id ?? "";
}

export async function updateOverride(input: UpdateOverrideInput): Promise<void> {
  const { overrideId, priceAmount, reason, validFrom, validTo } = input;

  const { error } = await supabase
    .from("client_price_overrides")
    .update({
      price_amount: priceAmount,
      reason,
      valid_from: validFrom,
      valid_to: validTo || null,
    })
    .eq("id", overrideId);

  if (error) {
    logger.error("Falha ao atualizar override", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

export async function deleteOverride(overrideId: string): Promise<void> {
  const { error } = await supabase
    .from("client_price_overrides")
    .delete()
    .eq("id", overrideId);

  if (error) {
    logger.error("Falha ao excluir override", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

// ============================================================
// OVERRIDE WORKFLOW RPCs
// ============================================================

export async function submitOverride(overrideId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_submit_client_price_override", {
    p_override_id: overrideId,
  });
  if (error) {
    logger.error("Falha ao submeter override", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

export async function returnOverrideToDraft(overrideId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_return_client_price_override_to_draft", {
    p_override_id: overrideId,
  });
  if (error) {
    logger.error("Falha ao retornar override", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

export async function approveOverride(overrideId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_approve_client_price_override", {
    p_override_id: overrideId,
  });
  if (error) {
    logger.error("Falha ao aprovar override", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

export async function cancelOverride(overrideId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_cancel_client_price_override", {
    p_override_id: overrideId,
  });
  if (error) {
    logger.error("Falha ao cancelar override", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

export async function publishOverride(overrideId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_publish_client_price_override", {
    p_override_id: overrideId,
  });
  if (error) {
    logger.error("Falha ao publicar override", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

export async function syncOverrideStatus(referenceDate?: string): Promise<number> {
  const { data, error } = await supabase.rpc("fn_sync_client_price_override_status", {
    p_reference_date: referenceDate ?? undefined,
  });
  if (error) {
    logger.error("Falha ao sincronizar overrides", { error: error.message });
    throw mapClientPricingError(error.message);
  }
  return (data as number) ?? 0;
}

// ============================================================
// PROVENANCE
// ============================================================

export async function captureProvenance(input: CaptureProvenanceInput): Promise<void> {
  const { overrideId, referenceDate } = input;

  const { error } = await supabase.rpc("fn_capture_client_override_table_provenance", {
    p_override_id: overrideId,
    p_reference_date: referenceDate,
  });

  if (error) {
    logger.error("Falha ao capturar proveniência", { error: error.message });
    throw mapClientPricingError(error.message);
  }
}

// ============================================================
// RESOLVERS
// ============================================================

export async function resolveAssignment(input: {
  orgId: string;
  clientCompanyId: string;
  referenceDate: string;
}): Promise<AssignmentResolverResult> {
  const { orgId, clientCompanyId, referenceDate } = input;

  const { data, error } = await supabase.rpc("fn_resolve_client_table_assignment", {
    p_organization_id: orgId,
    p_client_company_id: clientCompanyId,
    p_reference_date: referenceDate,
  });

  if (error) {
    logger.error("Falha ao resolver atribuição", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  return (data as AssignmentResolverResult) ?? { status: "ASSIGNMENT_NOT_FOUND", organization_id: orgId, client_company_id: clientCompanyId, reference_date: referenceDate };
}

export async function resolveOverride(input: {
  orgId: string;
  clientCompanyId: string;
  catalogItemId: string;
  referenceDate: string;
}): Promise<OverrideResolverResult> {
  const { orgId, clientCompanyId, catalogItemId, referenceDate } = input;

  const { data, error } = await supabase.rpc("fn_resolve_client_price_override", {
    p_organization_id: orgId,
    p_client_company_id: clientCompanyId,
    p_catalog_item_id: catalogItemId,
    p_reference_date: referenceDate,
  });

  if (error) {
    logger.error("Falha ao resolver override", { error: error.message });
    throw mapClientPricingError(error.message);
  }

  return (data as OverrideResolverResult) ?? { status: "OVERRIDE_NOT_FOUND", organization_id: orgId, client_company_id: clientCompanyId, catalog_item_id: catalogItemId, reference_date: referenceDate };
}

// ============================================================
// ERROR MAPPING
// ============================================================

export function mapClientPricingError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("authentication required") || m.includes("jwt"))
    return "Sua sessão expirou. Faça login novamente.";

  if (m.includes("insufficient permissions") || m.includes("permission"))
    return "Você não tem permissão para realizar esta ação.";

  if (m.includes("client profile not found"))
    return "Cliente não encontrado.";

  if (m.includes("client assignment not found"))
    return "Atribuição não encontrada.";

  if (m.includes("client price override not found"))
    return "Override de preço não encontrado.";

  if (m.includes("only draft") || m.includes("only under_review"))
    return "A operação só pode ser realizada enquanto o registro está no status correto.";

  if (m.includes("already in requested status"))
    return "O perfil já está no status solicitado.";

  if (m.includes("requires a non-empty status_reason") || m.includes("status_reason"))
    return "O motivo da alteração de status é obrigatório.";

  if (m.includes("new client profiles require an active company") || m.includes("active client profile requires an active company"))
    return "A empresa precisa estar ativa para esta operação.";

  if (m.includes("retroactive") || m.includes("retroativ"))
    return "Não é permitido publicar com vigência retroativa.";

  if (m.includes("scheduled") && m.includes("due") || m.includes("sync before publishing"))
    return "Há uma vigência agendada pendente de sincronização.";

  if (m.includes("overlap"))
    return "A vigência se sobrepõe a um registro existente.";

  if (m.includes("table provenance can be captured only for a draft"))
    return "A proveniência só pode ser capturada em rascunho.";

  if (m.includes("no client table assignment resolves"))
    return "Não há atribuição de tabela para este cliente nesta data.";

  if (m.includes("does not identify a client profile"))
    return "Empresa, cliente ou registro relacionado está inativo.";

  return message || "Ocorreu um erro inesperado.";
}
