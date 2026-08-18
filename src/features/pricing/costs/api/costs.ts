import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import type { Json } from "@/types/database";
import type {
  CostTable,
  CostTableVersion,
  CostItemInsert,
  CostTableWithSupplier,
  CostTableVersionWithItems,
  AuditLog,
} from "@/types";

// ============================================================
// Cost Tables
// ============================================================

interface FetchCostTablesParams {
  orgId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  supplierCompanyId?: string;
  status?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchCostTables(
  params: FetchCostTablesParams
): Promise<PaginatedResult<CostTableWithSupplier>> {
  const { orgId, page = 1, pageSize = 25, search, supplierCompanyId, status } = params;

  let query = supabase
    .from("supplier_cost_tables")
    .select("*, supplier:supplier_profiles!supplier_cost_tables_supplier_company_id_fkey(*, company:companies(*))", { count: "exact" })
    .eq("organization_id", orgId);

  if (search) {
    query = query.or(
      `code.ilike.%${search}%,name.ilike.%${search}%`
    );
  }

  if (supplierCompanyId) {
    query = query.eq("supplier_company_id", supplierCompanyId);
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
    logger.error("Erro ao buscar tabelas de custo", { error: error.message });
    throw new Error("Falha ao carregar tabelas de custo");
  }

  const total = count ?? 0;

  return {
    data: (data ?? []) as unknown as CostTableWithSupplier[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function fetchCostTable(
  id: string,
  orgId: string
): Promise<CostTableWithSupplier | null> {
  const { data, error } = await supabase
    .from("supplier_cost_tables")
    .select("*, supplier:supplier_profiles!supplier_cost_tables_supplier_company_id_fkey(*, company:companies(*)), versions:supplier_cost_table_versions(*)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    logger.error("Erro ao buscar tabela de custo", { error: error.message });
    throw new Error("Falha ao carregar tabela de custo");
  }

  return data as unknown as CostTableWithSupplier;
}

export async function createCostTable(
  data: { supplier_company_id: string; code: string; name: string; description?: string | null },
  orgId: string,
  userId: string
): Promise<CostTable> {
  const { data: result, error } = await supabase
    .from("supplier_cost_tables")
    .insert({
      supplier_company_id: data.supplier_company_id,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      organization_id: orgId,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error("Erro ao criar tabela de custo", { error: error.message });
    if (error.message.includes("unique")) {
      throw new Error("Já existe uma tabela de custo com este código para este fornecedor");
    }
    throw new Error("Falha ao criar tabela de custo");
  }

  await logAudit({
    organizationId: orgId,
    action: "cost_table.created",
    entityType: "cost_table",
    entityId: result.id,
    newData: result as unknown as Record<string, Json>,
  });

  return result;
}

export async function updateCostTableStatus(
  id: string,
  newStatus: string,
  orgId: string,
  userId: string
): Promise<void> {
  const { data: before } = await supabase
    .from("supplier_cost_tables")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("supplier_cost_tables")
    .update({ status: newStatus, updated_by: userId })
    .eq("id", id);

  if (error) {
    logger.error("Erro ao atualizar status da tabela de custo", { error: error.message });
    throw new Error("Falha ao atualizar status da tabela de custo");
  }

  await logAudit({
    organizationId: orgId,
    action: `cost_table.${newStatus}`,
    entityType: "cost_table",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: { status: newStatus },
  });
}

// ============================================================
// Cost Table Versions
// ============================================================

export async function fetchCostTableVersion(
  id: string,
  orgId: string
): Promise<CostTableVersionWithItems | null> {
  const { data, error } = await supabase
    .from("supplier_cost_table_versions")
    .select("*, cost_table:supplier_cost_tables(*, supplier:supplier_profiles!supplier_cost_tables_supplier_company_id_fkey(*, company:companies(*))), items:supplier_cost_items(*)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    logger.error("Erro ao buscar versão de tabela de custo", { error: error.message });
    throw new Error("Falha ao carregar versão");
  }

  return data as unknown as CostTableVersionWithItems;
}

export async function createCostTableVersion(
  data: { cost_table_id: string; version_label?: string | null; source_date?: string | null; valid_from: string; valid_to?: string | null; notes?: string | null; version_number?: number },
  orgId: string,
  userId: string
): Promise<CostTableVersion> {
  const { data: result, error } = await supabase
    .from("supplier_cost_table_versions")
    .insert({
      cost_table_id: data.cost_table_id,
      version_label: data.version_label ?? null,
      source_date: data.source_date ?? null,
      valid_from: data.valid_from,
      valid_to: data.valid_to ?? null,
      notes: data.notes ?? null,
      version_number: data.version_number,
      organization_id: orgId,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error("Erro ao criar versão de tabela de custo", { error: error.message });
    throw new Error("Falha ao criar versão");
  }

  await logAudit({
    organizationId: orgId,
    action: "cost_table_version.created",
    entityType: "cost_table_version",
    entityId: result.id,
    newData: result as unknown as Record<string, Json>,
  });

  return result;
}

export async function updateCostTableVersionStatus(
  id: string,
  newStatus: string,
  orgId: string,
  userId: string
): Promise<void> {
  const { data: before } = await supabase
    .from("supplier_cost_table_versions")
    .select("*")
    .eq("id", id)
    .single();

  const updateData: Record<string, unknown> = { status: newStatus };

  if (newStatus === "approved") {
    updateData.approved_by = userId;
    updateData.approved_at = new Date().toISOString();
  } else if (newStatus === "active") {
    updateData.published_by = userId;
    updateData.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("supplier_cost_table_versions")
    .update(updateData)
    .eq("id", id);

  if (error) {
    logger.error("Erro ao atualizar status da versão", { error: error.message });
    throw new Error("Falha ao atualizar status da versão");
  }

  await logAudit({
    organizationId: orgId,
    action: `cost_table_version.${newStatus}`,
    entityType: "cost_table_version",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: { status: newStatus },
  });
}

// ============================================================
// Cost Items
// ============================================================

export async function createCostItems(
  items: CostItemInsert[],
  orgId: string,
  _userId: string
): Promise<void> {
  if (items.length === 0) return;

  const insertData = items.map((item) => ({
    ...item,
    organization_id: orgId,
  }));

  const { error } = await supabase
    .from("supplier_cost_items")
    .insert(insertData);

  if (error) {
    logger.error("Erro ao criar itens de custo", { error: error.message });
    throw new Error("Falha ao criar itens de custo");
  }
}

export async function updateCostItem(
  id: string,
  data: Partial<CostItemInsert>,
  _orgId: string,
  _userId: string
): Promise<void> {
  const { error } = await supabase
    .from("supplier_cost_items")
    .update({ ...data })
    .eq("id", id);

  if (error) {
    logger.error("Erro ao atualizar item de custo", { error: error.message });
    throw new Error("Falha ao atualizar item de custo");
  }
}

export async function deleteCostItem(id: string, _orgId: string): Promise<void> {
  const { error } = await supabase
    .from("supplier_cost_items")
    .delete()
    .eq("id", id);

  if (error) {
    logger.error("Erro ao remover item de custo", { error: error.message });
    throw new Error("Falha ao remover item de custo");
  }
}

// ============================================================
// Audit logs
// ============================================================

export async function fetchCostAuditLogs(
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
    logger.error("Erro ao buscar logs de auditoria de custos", { error: error.message });
    throw new Error("Falha ao carregar histórico");
  }

  return data ?? [];
}
