import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { normalizeText } from "@/lib/normalize";
import { logAudit } from "@/lib/audit";
import type { Json } from "@/types/database";
import type {
  SupplierCatalogItem,
  SupplierCatalogItemInsert,
  SupplierCatalogItemUpdate,
  CatalogItem,
} from "@/types";

// ============================================================
// Interfaces
// ============================================================

interface FetchMappingsParams {
  orgId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface MappingWithCatalogItem extends SupplierCatalogItem {
  catalog_item: CatalogItem;
}

// ============================================================
// Queries
// ============================================================

export async function fetchSupplierMappings(
  supplierCompanyId: string,
  orgId: string,
  params: FetchMappingsParams
): Promise<PaginatedResult<MappingWithCatalogItem>> {
  const {
    page = 1,
    pageSize = 25,
    search,
    status,
  } = params;

  let query = supabase
    .from("supplier_catalog_items")
    .select("*, catalog_item:catalog_items(*)", { count: "exact" })
    .eq("supplier_company_id", supplierCompanyId)
    .eq("organization_id", orgId);

  if (search) {
    query = query.or(
      `external_name.ilike.%${search}%,normalized_external_name.ilike.%${search}%`
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
    logger.error("Erro ao buscar mapeamentos", { error: error.message });
    throw new Error("Falha ao carregar mapeamentos");
  }

  const total = count ?? 0;

  return {
    data: (data ?? []) as MappingWithCatalogItem[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function searchCatalogItems(
  orgId: string,
  search: string
): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from("catalog_items")
    .select("id, code, name, item_type")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .or(`code.ilike.%${search}%,name.ilike.%${search}%`)
    .order("name", { ascending: true })
    .limit(20);

  if (error) {
    logger.error("Erro ao buscar itens do catálogo", { error: error.message });
    throw new Error("Falha ao buscar itens do catálogo");
  }

  return (data ?? []) as CatalogItem[];
}

// ============================================================
// Mutations
// ============================================================

export async function createSupplierMapping(
  data: SupplierCatalogItemInsert,
  orgId: string,
  userId: string
): Promise<SupplierCatalogItem> {
  const normalizedExternalName = normalizeText(data.external_name ?? "");

  const { data: result, error } = await supabase.rpc("fn_create_supplier_mapping", {
    p_supplier_company_id: data.supplier_company_id,
    p_catalog_item_id: data.catalog_item_id,
    p_external_name: data.external_name,
    p_normalized_external_name: normalizedExternalName,
    p_notes: data.notes ?? null,
    p_organization_id: orgId,
    p_user_id: userId,
  });

  if (error) {
    logger.error("Erro ao criar mapeamento", { error: error.message });
    if (error.message.includes("unique") || error.message.includes("duplicate")) {
      throw new Error("Já existe um mapeamento para este item externo neste fornecedor");
    }
    throw new Error("Falha ao criar mapeamento");
  }

  await logAudit({
    organizationId: orgId,
    action: "supplier_mapping.created",
    entityType: "supplier_catalog_item",
    entityId: result as string,
    newData: { ...data, normalized_external_name: normalizedExternalName } as unknown as Record<string, Json>,
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
    action: "supplier_mapping.updated",
    entityType: "supplier_catalog_item",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: result as unknown as Record<string, Json>,
  });

  return result;
}

export async function setPreferredMapping(
  mappingId: string,
  orgId: string,
  userId: string
): Promise<void> {
  const { data: before } = await supabase
    .from("supplier_catalog_items")
    .select("*")
    .eq("id", mappingId)
    .single();

  const { error } = await supabase.rpc("fn_set_preferred_mapping", {
    p_mapping_id: mappingId,
    p_user_id: userId,
  });

  if (error) {
    logger.error("Erro ao definir mapeamento preferido", { error: error.message });
    throw new Error("Falha ao definir mapeamento preferido");
  }

  await logAudit({
    organizationId: orgId,
    action: "supplier_mapping.preferred",
    entityType: "supplier_catalog_item",
    entityId: mappingId,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: { is_preferred: true },
  });
}

export async function inactivateMapping(
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
    .update({
      status: "inactive",
      deactivated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", id);

  if (error) {
    logger.error("Erro ao inativar mapeamento", { error: error.message });
    throw new Error("Falha ao inativar mapeamento");
  }

  await logAudit({
    organizationId: orgId,
    action: "supplier_mapping.inactivated",
    entityType: "supplier_catalog_item",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: {
      status: "inactive",
      deactivated_at: new Date().toISOString(),
    },
  });
}
