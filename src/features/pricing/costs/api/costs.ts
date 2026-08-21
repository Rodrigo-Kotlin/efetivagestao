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

const COST_TABLE_SUPPLIER_SELECT =
  "supplier:companies!supplier_cost_tables_supplier_company_id_fkey(*, supplier_profile:supplier_profiles!supplier_profiles_company_id_fkey(*))";

export async function fetchCostTables(
  params: FetchCostTablesParams
): Promise<PaginatedResult<CostTableWithSupplier>> {
  const { orgId, page = 1, pageSize = 25, search, supplierCompanyId, status } = params;

  let query = supabase
    .from("supplier_cost_tables")
    .select(`*, ${COST_TABLE_SUPPLIER_SELECT}`, { count: "exact" })
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
    .select(`*, ${COST_TABLE_SUPPLIER_SELECT}, versions:supplier_cost_table_versions(*)`)
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
    .select(`*, cost_table:supplier_cost_tables(*, ${COST_TABLE_SUPPLIER_SELECT}), items:supplier_cost_items(*)`)
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

export function mapCostWorkflowError(message: string): string {
  if (message.includes("Authentication required")) {
    return "Sua sessão expirou. Faça login novamente.";
  }
  if (message.includes("Insufficient permissions")) {
    return "Você não tem permissão para realizar esta ação.";
  }
  if (message.includes("Not a member of this organization")) {
    return "Você não é membro desta organização.";
  }
  if (message.includes("Version not found")) {
    return "Versão não encontrada. Ela pode ter sido removida.";
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
  if (message.includes("Version must have at least one cost item")) {
    return "Adicione ao menos um item de custo antes de enviar para revisão.";
  }
  return "Não foi possível concluir a ação. Tente novamente.";
}

async function rpcVersionAction(rpcName: string, versionId: string): Promise<void> {
  const { error } = await supabase.rpc(rpcName, { p_version_id: versionId });
  if (error) {
    logger.error(`Erro ao executar ${rpcName}`, { error: error.message });
    throw new Error(mapCostWorkflowError(error.message));
  }
}

export async function submitCostVersion(versionId: string): Promise<void> {
  await rpcVersionAction("fn_submit_cost_version", versionId);
}

export async function approveCostVersion(versionId: string): Promise<void> {
  await rpcVersionAction("fn_approve_cost_version", versionId);
}

export async function publishCostVersion(versionId: string): Promise<void> {
  await rpcVersionAction("fn_publish_cost_version", versionId);
}

export async function syncCostVersionStatus(referenceDate?: string): Promise<void> {
  const params = referenceDate ? { p_reference_date: referenceDate } : {};
  const { error } = await supabase.rpc("fn_sync_cost_version_status", params);
  if (error) {
    logger.error("Erro ao sincronizar status de versões", { error: error.message });
    throw new Error("Falha ao sincronizar status das versões");
  }
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
