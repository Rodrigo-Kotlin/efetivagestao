import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { normalizeText } from "@/lib/normalize";
import { logAudit } from "@/lib/audit";
import type { Json } from "@/types/database";
import type {
  CatalogCategory,
  CatalogCategoryInsert,
  CatalogCategoryUpdate,
  CatalogCategoryWithChildren,
  CatalogItem,
  CatalogItemInsert,
  CatalogItemUpdate,
  CatalogItemWithAliases,
  CatalogItemWithCategory,
  CatalogItemAlias,
  CatalogItemAliasInsert,
  CatalogItemAliasUpdate,
  CatalogStats,
} from "@/types";

// ============================================================
// Categories
// ============================================================

export async function fetchCategories(orgId: string): Promise<CatalogCategory[]> {
  const { data, error } = await supabase
    .from("catalog_categories")
    .select("*")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    logger.error("Erro ao buscar categorias", { error: error.message });
    throw new Error("Falha ao carregar categorias");
  }

  return data ?? [];
}

export async function fetchCategoryTree(orgId: string): Promise<CatalogCategoryWithChildren[]> {
  const categories = await fetchCategories(orgId);
  return buildCategoryTree(categories);
}

function buildCategoryTree(categories: CatalogCategory[]): CatalogCategoryWithChildren[] {
  const map = new Map<string, CatalogCategoryWithChildren>();
  const roots: CatalogCategoryWithChildren[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parent_id) {
      const parent = map.get(cat.parent_id);
      if (parent) {
        parent.children!.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function createCategory(
  data: CatalogCategoryInsert,
  orgId: string
): Promise<CatalogCategory> {
  const { data: result, error } = await supabase
    .from("catalog_categories")
    .insert({ ...data, organization_id: orgId })
    .select()
    .single();

  if (error) {
    logger.error("Erro ao criar categoria", { error: error.message });
    throw new Error(error.message.includes("unique")
      ? "Já existe uma categoria com este código nesta organização"
      : "Falha ao criar categoria");
  }

  await logAudit({
    organizationId: orgId,
    action: "catalog.category.created",
    entityType: "catalog_category",
    entityId: result.id,
    newData: result as unknown as Record<string, Json>,
  });

  return result;
}

export async function updateCategory(
  id: string,
  data: CatalogCategoryUpdate,
  orgId: string
): Promise<CatalogCategory> {
  const { data: before } = await supabase
    .from("catalog_categories")
    .select("*")
    .eq("id", id)
    .single();

  const { data: result, error } = await supabase
    .from("catalog_categories")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Erro ao atualizar categoria", { error: error.message });
    throw new Error("Falha ao atualizar categoria");
  }

  await logAudit({
    organizationId: orgId,
    action: "catalog.category.updated",
    entityType: "catalog_category",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: result as unknown as Record<string, Json>,
  });

  return result;
}

export async function deactivateCategory(
  id: string,
  orgId: string
): Promise<void> {
  const { data: before } = await supabase
    .from("catalog_categories")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("catalog_categories")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    logger.error("Erro ao inativar categoria", { error: error.message });
    throw new Error("Falha ao inativar categoria");
  }

  await logAudit({
    organizationId: orgId,
    action: "catalog.category.deactivated",
    entityType: "catalog_category",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: { is_active: false },
  });
}

// ============================================================
// Items
// ============================================================

interface FetchItemsParams {
  orgId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  itemType?: string;
  categoryId?: string;
  executionType?: string;
  status?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchCatalogItems(
  params: FetchItemsParams
): Promise<PaginatedResult<CatalogItemWithCategory>> {
  const {
    orgId,
    page = 1,
    pageSize = 25,
    search,
    itemType,
    categoryId,
    executionType,
    status,
  } = params;

  let query = supabase
    .from("catalog_items")
    .select("*, category:catalog_categories(*)", { count: "exact" })
    .eq("organization_id", orgId);

  if (search) {
    const normalizedSearch = normalizeText(search);
    query = query.or(
      `name.ilike.%${search}%,code.ilike.%${search}%,short_name.ilike.%${search}%,legacy_code.ilike.%${search}%`
    );
    void normalizedSearch;
  }

  if (itemType) {
    query = query.eq("item_type", itemType);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (executionType) {
    query = query.eq("execution_type", executionType);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order("code", { ascending: true })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    logger.error("Erro ao buscar itens do catálogo", { error: error.message });
    throw new Error("Falha ao carregar catálogo");
  }

  const total = count ?? 0;

  return {
    data: (data ?? []) as CatalogItemWithCategory[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function fetchCatalogItem(
  id: string,
  orgId: string
): Promise<CatalogItemWithAliases | null> {
  const { data, error } = await supabase
    .from("catalog_items")
    .select("*, category:catalog_categories(*), aliases:catalog_item_aliases(*)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    logger.error("Erro ao buscar item do catálogo", { error: error.message });
    throw new Error("Falha ao carregar item");
  }

  return data as CatalogItemWithAliases;
}

export async function createCatalogItem(
  data: CatalogItemInsert,
  orgId: string
): Promise<CatalogItem> {
  const { data: result, error } = await supabase
    .from("catalog_items")
    .insert({ ...data, organization_id: orgId })
    .select()
    .single();

  if (error) {
    logger.error("Erro ao criar item do catálogo", { error: error.message });
    if (error.message.includes("unique")) {
      throw new Error("Já existe um item com este código nesta organização");
    }
    throw new Error("Falha ao criar item");
  }

  await logAudit({
    organizationId: orgId,
    action: "catalog.item.created",
    entityType: "catalog_item",
    entityId: result.id,
    newData: result as unknown as Record<string, Json>,
  });

  return result;
}

export async function updateCatalogItem(
  id: string,
  data: CatalogItemUpdate,
  orgId: string
): Promise<CatalogItem> {
  const { data: before } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("id", id)
    .single();

  const { data: result, error } = await supabase
    .from("catalog_items")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Erro ao atualizar item", { error: error.message });
    throw new Error("Falha ao atualizar item");
  }

  await logAudit({
    organizationId: orgId,
    action: "catalog.item.updated",
    entityType: "catalog_item",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: result as unknown as Record<string, Json>,
  });

  return result;
}

export async function activateCatalogItem(
  id: string,
  orgId: string,
  userId: string
): Promise<void> {
  const { data: before } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("catalog_items")
    .update({
      status: "active",
      activated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", id);

  if (error) {
    logger.error("Erro ao ativar item", { error: error.message });
    throw new Error("Falha ao ativar item");
  }

  await logAudit({
    organizationId: orgId,
    action: "catalog.item.activated",
    entityType: "catalog_item",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: { status: "active", activated_at: new Date().toISOString() },
  });
}

export async function deactivateCatalogItem(
  id: string,
  orgId: string,
  userId: string
): Promise<void> {
  const { data: before } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("catalog_items")
    .update({
      status: "inactive",
      deactivated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", id);

  if (error) {
    logger.error("Erro ao inativar item", { error: error.message });
    throw new Error("Falha ao inativar item");
  }

  await logAudit({
    organizationId: orgId,
    action: "catalog.item.deactivated",
    entityType: "catalog_item",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: { status: "inactive", deactivated_at: new Date().toISOString() },
  });
}

export async function archiveCatalogItem(
  id: string,
  orgId: string,
  userId: string
): Promise<void> {
  const { data: before } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("catalog_items")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      archived_by: userId,
      updated_by: userId,
    })
    .eq("id", id);

  if (error) {
    logger.error("Erro ao arquivar item", { error: error.message });
    throw new Error("Falha ao arquivar item");
  }

  await logAudit({
    organizationId: orgId,
    action: "catalog.item.archived",
    entityType: "catalog_item",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: {
      status: "archived",
      archived_at: new Date().toISOString(),
      archived_by: userId,
    },
  });
}

// ============================================================
// Aliases
// ============================================================

export async function createAlias(
  data: CatalogItemAliasInsert,
  orgId: string
): Promise<CatalogItemAlias> {
  const normalized = normalizeText(data.original_name);

  const { data: result, error } = await supabase
    .from("catalog_item_aliases")
    .insert({ ...data, organization_id: orgId, normalized_name: normalized })
    .select()
    .single();

  if (error) {
    logger.error("Erro ao criar alias", { error: error.message });
    if (error.message.includes("unique")) {
      throw new Error("Este nome alternativo já está associado a este item");
    }
    throw new Error("Falha ao criar nome alternativo");
  }

  await logAudit({
    organizationId: orgId,
    action: "catalog.alias.created",
    entityType: "catalog_item_alias",
    entityId: result.id,
    newData: result as unknown as Record<string, Json>,
  });

  return result;
}

export async function updateAlias(
  id: string,
  data: CatalogItemAliasUpdate,
  orgId: string
): Promise<CatalogItemAlias> {
  const { data: before } = await supabase
    .from("catalog_item_aliases")
    .select("*")
    .eq("id", id)
    .single();

  const updateData: CatalogItemAliasUpdate = { ...data };
  if (data.original_name) {
    updateData.normalized_name = normalizeText(data.original_name);
  }

  const { data: result, error } = await supabase
    .from("catalog_item_aliases")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Erro ao atualizar alias", { error: error.message });
    throw new Error("Falha ao atualizar nome alternativo");
  }

  await logAudit({
    organizationId: orgId,
    action: "catalog.alias.updated",
    entityType: "catalog_item_alias",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: result as unknown as Record<string, Json>,
  });

  return result;
}

export async function deleteAlias(
  id: string,
  orgId: string
): Promise<void> {
  const { data: before } = await supabase
    .from("catalog_item_aliases")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("catalog_item_aliases")
    .delete()
    .eq("id", id);

  if (error) {
    logger.error("Erro ao excluir alias", { error: error.message });
    throw new Error("Falha ao excluir nome alternativo");
  }

  await logAudit({
    organizationId: orgId,
    action: "catalog.alias.deleted",
    entityType: "catalog_item_alias",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
  });
}

// ============================================================
// Stats
// ============================================================

export async function fetchCatalogStats(orgId: string): Promise<CatalogStats> {
  const { data: active, error: e1 } = await supabase
    .from("catalog_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "active");

  const { data: draft, error: e2 } = await supabase
    .from("catalog_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "draft");

  const { data: inactive, error: e3 } = await supabase
    .from("catalog_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "inactive");

  const { data: categories, error: e4 } = await supabase
    .from("catalog_categories")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if (e1 || e2 || e3 || e4) {
    logger.error("Erro ao buscar estatísticas do catálogo", {
      errors: [e1?.message, e2?.message, e3?.message, e4?.message].filter(Boolean),
    });
    throw new Error("Falha ao carregar estatísticas");
  }

  return {
    total_active: active?.length ?? 0,
    total_draft: draft?.length ?? 0,
    total_inactive: inactive?.length ?? 0,
    total_categories: categories?.length ?? 0,
  };
}

// ============================================================
// Duplicate detection
// ============================================================

interface DuplicateCheck {
  code_match: boolean;
  name_match: boolean;
  legacy_code_match: boolean;
  similar_items: Array<{ id: string; name: string; code: string }>;
}

export async function checkDuplicates(
  orgId: string,
  params: {
    name?: string;
    code?: string;
    legacyCode?: string;
    excludeId?: string;
  }
): Promise<DuplicateCheck> {
  const result: DuplicateCheck = {
    code_match: false,
    name_match: false,
    legacy_code_match: false,
    similar_items: [],
  };

  if (params.code) {
    let q = supabase
      .from("catalog_items")
      .select("id")
      .eq("organization_id", orgId)
      .eq("code", params.code);

    if (params.excludeId) {
      q = q.neq("id", params.excludeId);
    }

    const { data } = await q;
    result.code_match = (data?.length ?? 0) > 0;
  }

  if (params.legacyCode) {
    let q = supabase
      .from("catalog_items")
      .select("id")
      .eq("organization_id", orgId)
      .eq("legacy_code", params.legacyCode);

    if (params.excludeId) {
      q = q.neq("id", params.excludeId);
    }

    const { data } = await q;
    result.legacy_code_match = (data?.length ?? 0) > 0;
  }

  if (params.name) {
    const normalized = normalizeText(params.name);

    let q = supabase
      .from("catalog_items")
      .select("id, name, code")
      .eq("organization_id", orgId)
      .neq("status", "archived");

    if (params.excludeId) {
      q = q.neq("id", params.excludeId);
    }

    const { data } = await q;

    if (data) {
      const exactMatch = data.some(
        (item) => normalizeText(item.name) === normalized
      );
      result.name_match = exactMatch;

      const similar = data.filter((item) => {
        const itemNorm = normalizeText(item.name);
        return (
          itemNorm.includes(normalized) ||
          normalized.includes(itemNorm)
        );
      });

      result.similar_items = similar.map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
      }));
    }
  }

  return result;
}
