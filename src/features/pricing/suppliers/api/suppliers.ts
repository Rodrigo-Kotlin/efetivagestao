import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { normalizeText } from "@/lib/normalize";
import { logAudit } from "@/lib/audit";
import type { Json } from "@/types/database";
import type {
  Company,
  CompanyInsert,
  CompanyUpdate,
  SupplierProfile,
  SupplierProfileInsert,
  SupplierProfileUpdate,
  SupplierCatalogItem,
  SupplierCatalogItemInsert,
  SupplierCatalogItemUpdate,
  SupplierWithCompany,
  SupplierMappingWithCatalogItem,
  SupplierStats,
  CatalogItem,
  AuditLog,
} from "@/types";

// ============================================================
// Suppliers (Company + Profile)
// ============================================================

interface FetchSuppliersParams {
  orgId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  status?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchSuppliers(
  params: FetchSuppliersParams
): Promise<PaginatedResult<SupplierWithCompany>> {
  const { orgId, page = 1, pageSize = 25, search, category, status } = params;

  let query = supabase
    .from("supplier_profiles")
    .select("*, company:companies(*)", { count: "exact" })
    .eq("organization_id", orgId);

  if (search) {
    query = query.or(
      `company->>legal_name.ilike.%${search}%,company->>trade_name.ilike.%${search}%,company->>tax_id.ilike.%${search}%`
    );
  }

  if (category) {
    query = query.eq("supplier_category", category);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    logger.error("Erro ao buscar fornecedores", { error: error.message });
    throw new Error("Falha ao carregar fornecedores");
  }

  const total = count ?? 0;

  return {
    data: (data ?? []) as unknown as SupplierWithCompany[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function fetchSupplier(
  companyId: string,
  orgId: string
): Promise<SupplierWithCompany | null> {
  const { data, error } = await supabase
    .from("supplier_profiles")
    .select("*, company:companies(*)")
    .eq("company_id", companyId)
    .eq("organization_id", orgId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    logger.error("Erro ao buscar fornecedor", { error: error.message });
    throw new Error("Falha ao carregar fornecedor");
  }

  return data as unknown as SupplierWithCompany;
}

export async function createSupplier(
  companyData: CompanyInsert,
  profileData: Omit<SupplierProfileInsert, "company_id" | "organization_id" | "created_by" | "updated_by">,
  orgId: string,
  userId: string
): Promise<{ company: Company; profile: SupplierProfile }> {
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ ...companyData, organization_id: orgId, created_by: userId, updated_by: userId })
    .select()
    .single();

  if (companyError) {
    logger.error("Erro ao criar empresa", { error: companyError.message });
    if (companyError.message.includes("unique")) {
      throw new Error("Já existe uma empresa com este CNPJ nesta organização");
    }
    throw new Error("Falha ao criar empresa");
  }

  const { data: profile, error: profileError } = await supabase
    .from("supplier_profiles")
    .insert({
      ...profileData,
      company_id: company.id,
      organization_id: orgId,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (profileError) {
    logger.error("Erro ao criar perfil de fornecedor", { error: profileError.message });
    throw new Error("Falha ao criar perfil de fornecedor");
  }

  await logAudit({
    organizationId: orgId,
    action: "supplier.created",
    entityType: "supplier_profile",
    entityId: company.id,
    newData: { company, profile } as unknown as Record<string, Json>,
  });

  return { company, profile };
}

export async function updateSupplier(
  companyId: string,
  companyUpdate: CompanyUpdate,
  profileUpdate: SupplierProfileUpdate,
  orgId: string,
  userId: string
): Promise<{ company: Company; profile: SupplierProfile }> {
  const { data: beforeCompany } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .update({ ...companyUpdate, updated_by: userId })
    .eq("id", companyId)
    .select()
    .single();

  if (companyError) {
    logger.error("Erro ao atualizar empresa", { error: companyError.message });
    throw new Error("Falha ao atualizar empresa");
  }

  const { data: profile, error: profileError } = await supabase
    .from("supplier_profiles")
    .update({ ...profileUpdate, updated_by: userId })
    .eq("company_id", companyId)
    .select()
    .single();

  if (profileError) {
    logger.error("Erro ao atualizar perfil de fornecedor", { error: profileError.message });
    throw new Error("Falha ao atualizar perfil de fornecedor");
  }

  await logAudit({
    organizationId: orgId,
    action: "supplier.updated",
    entityType: "supplier_profile",
    entityId: companyId,
    oldData: beforeCompany as unknown as Record<string, Json> | undefined,
    newData: { company, profile } as unknown as Record<string, Json>,
  });

  return { company, profile };
}

export async function updateSupplierStatus(
  companyId: string,
  newStatus: string,
  orgId: string,
  userId: string
): Promise<void> {
  const { data: before } = await supabase
    .from("supplier_profiles")
    .select("*")
    .eq("company_id", companyId)
    .single();

  const { error } = await supabase
    .from("supplier_profiles")
    .update({ status: newStatus, updated_by: userId })
    .eq("company_id", companyId);

  if (error) {
    logger.error("Erro ao atualizar status do fornecedor", { error: error.message });
    throw new Error("Falha ao atualizar status do fornecedor");
  }

  await logAudit({
    organizationId: orgId,
    action: `supplier.${newStatus}`,
    entityType: "supplier_profile",
    entityId: companyId,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: { status: newStatus },
  });
}

// ============================================================
// Supplier Catalog Mappings
// ============================================================

interface FetchMappingsParams {
  orgId: string;
  supplierCompanyId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export async function fetchSupplierMappings(
  params: FetchMappingsParams
): Promise<PaginatedResult<SupplierMappingWithCatalogItem>> {
  const { orgId, supplierCompanyId, page = 1, pageSize = 25, search, status } = params;

  let query = supabase
    .from("supplier_catalog_items")
    .select("*, catalog_item:catalog_items(*), company:companies(legal_name, trade_name)", { count: "exact" })
    .eq("organization_id", orgId)
    .eq("supplier_company_id", supplierCompanyId);

  if (search) {
    query = query.or(
      `external_name.ilike.%${search}%,external_code.ilike.%${search}%,catalog_item->>name.ilike.%${search}%,catalog_item->>code.ilike.%${search}%`
    );
  }

  if (status) {
    query = query.eq("status", status);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    logger.error("Erro ao buscar mapeamentos do fornecedor", { error: error.message });
    throw new Error("Falha ao carregar mapeamentos");
  }

  const total = count ?? 0;

  return {
    data: (data ?? []) as unknown as SupplierMappingWithCatalogItem[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createSupplierMapping(
  data: SupplierCatalogItemInsert,
  orgId: string
): Promise<SupplierCatalogItem> {
  const normalized = normalizeText(data.external_name);

  const { data: result, error } = await supabase.rpc("fn_create_supplier_mapping", {
    p_supplier_company_id: data.supplier_company_id,
    p_catalog_item_id: data.catalog_item_id,
    p_external_name: data.external_name,
    p_normalized_external_name: normalized,
    p_notes: data.notes ?? null,
    p_organization_id: orgId,
  });

  if (error) {
    logger.error("Erro ao criar mapeamento", { error: error.message });
    if (error.message.includes("not active") || error.message.includes("does not exist")) {
      throw new Error("Fornecedor inexistente ou inativo");
    }
    throw new Error("Falha ao criar mapeamento");
  }

  await logAudit({
    organizationId: orgId,
    action: "supplier.mapping.created",
    entityType: "supplier_catalog_item",
    entityId: result as string,
    newData: { ...data, normalized_external_name: normalized } as unknown as Record<string, Json>,
  });

  return result as unknown as SupplierCatalogItem;
}

export async function updateSupplierMapping(
  id: string,
  data: SupplierCatalogItemUpdate,
  orgId: string,
  userId: string
): Promise<SupplierCatalogItem> {
  const { data: before } = await supabase
    .from("supplier_catalog_items")
    .select("*")
    .eq("id", id)
    .single();

  const updateData: SupplierCatalogItemUpdate = { ...data, updated_by: userId };
  if (data.external_name) {
    updateData.normalized_external_name = normalizeText(data.external_name);
  }

  const { data: result, error } = await supabase
    .from("supplier_catalog_items")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Erro ao atualizar mapeamento", { error: error.message });
    throw new Error("Falha ao atualizar mapeamento");
  }

  await logAudit({
    organizationId: orgId,
    action: "supplier.mapping.updated",
    entityType: "supplier_catalog_item",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: result as unknown as Record<string, Json>,
  });

  return result;
}

export async function setPreferredMapping(
  id: string,
  orgId: string
): Promise<void> {
  const { data: mapping } = await supabase
    .from("supplier_catalog_items")
    .select("supplier_company_id, catalog_item_id, status")
    .eq("id", id)
    .single();

  if (!mapping) throw new Error("Mapeamento não encontrado");

  if (mapping.status !== "active") {
    throw new Error("Apenas mapeamentos ativos podem ser definidos como preferidos");
  }

  const { error } = await supabase.rpc("fn_set_preferred_mapping", {
    p_mapping_id: id,
  });

  if (error) {
    logger.error("Erro ao definir mapeamento preferencial", { error: error.message });
    if (error.message.includes("not active")) {
      throw new Error("Apenas mapeamentos ativos podem ser definidos como preferidos");
    }
    if (error.message.includes("Insufficient")) {
      throw new Error("Sem permissão para gerenciar mapeamentos");
    }
    throw new Error("Falha ao definir mapeamento preferencial");
  }

  await logAudit({
    organizationId: orgId,
    action: "supplier.mapping.set_preferred",
    entityType: "supplier_catalog_item",
    entityId: id,
    newData: { is_preferred: true },
  });
}

export async function deactivateSupplierMapping(
  id: string,
  orgId: string,
  userId: string
): Promise<void> {
  const { data: before } = await supabase
    .from("supplier_catalog_items")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("supplier_catalog_items")
    .update({ status: "inactive", is_preferred: false, updated_by: userId })
    .eq("id", id);

  if (error) {
    logger.error("Erro ao inativar mapeamento", { error: error.message });
    throw new Error("Falha ao inativar mapeamento");
  }

  await logAudit({
    organizationId: orgId,
    action: "supplier.mapping.deactivated",
    entityType: "supplier_catalog_item",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: { status: "inactive", is_preferred: false },
  });
}

// ============================================================
// Supplier Stats
// ============================================================

export async function fetchSupplierStats(orgId: string): Promise<SupplierStats> {
  const { data: active, error: e1 } = await supabase
    .from("supplier_profiles")
    .select("company_id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "active");

  const { data: inactive, error: e2 } = await supabase
    .from("supplier_profiles")
    .select("company_id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "inactive");

  const { data: blocked, error: e3 } = await supabase
    .from("supplier_profiles")
    .select("company_id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "blocked");

  const { data: mappingsActive, error: e4 } = await supabase
    .from("supplier_catalog_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "active");

  if (e1 || e2 || e3 || e4) {
    logger.error("Erro ao buscar estatísticas de fornecedores", {
      errors: [e1?.message, e2?.message, e3?.message, e4?.message].filter(Boolean),
    });
    throw new Error("Falha ao carregar estatísticas");
  }

  return {
    total_active: active?.length ?? 0,
    total_inactive: inactive?.length ?? 0,
    total_blocked: blocked?.length ?? 0,
    total_mappings_active: mappingsActive?.length ?? 0,
    items_without_supplier: 0,
  };
}

// ============================================================
// Audit logs
// ============================================================

export async function fetchSupplierAuditLogs(
  entityId: string,
  orgId: string,
  limit = 50
): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Erro ao buscar logs de auditoria", { error: error.message });
    throw new Error("Falha ao carregar histórico");
  }

  return data ?? [];
}

// ============================================================
// Catalog items for selector
// ============================================================

export async function fetchCatalogItemsForSelector(
  orgId: string,
  search?: string
): Promise<CatalogItem[]> {
  let query = supabase
    .from("catalog_items")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("code", { ascending: true });

  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    logger.error("Erro ao buscar itens do catálogo para selector", { error: error.message });
    throw new Error("Falha ao carregar itens do catálogo");
  }

  return data ?? [];
}
