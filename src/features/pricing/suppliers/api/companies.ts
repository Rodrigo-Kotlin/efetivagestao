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
} from "@/types";

type CompanyWithSupplierProfile = Company & {
  supplier_profile: SupplierProfile | null;
};

// ============================================================
// Interfaces
// ============================================================

interface FetchCompaniesParams {
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

// ============================================================
// Queries
// ============================================================

export async function fetchCompanies(
  params: FetchCompaniesParams
): Promise<PaginatedResult<CompanyWithSupplierProfile>> {
  const {
    orgId,
    page = 1,
    pageSize = 25,
    search,
    status,
  } = params;

  let query = supabase
    .from("companies")
    .select("*, supplier_profile:supplier_profiles(*)", { count: "exact" })
    .eq("organization_id", orgId);

  if (search) {
    query = query.or(
      `legal_name.ilike.%${search}%,trade_name.ilike.%${search}%,tax_id.ilike.%${search}%`
    );
  }

  if (status) {
    query = query.eq("status", status);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order("legal_name", { ascending: true })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    logger.error("Erro ao buscar empresas", { error: error.message });
    throw new Error("Falha ao carregar empresas");
  }

  const total = count ?? 0;

  return {
    data: (data ?? []) as CompanyWithSupplierProfile[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function fetchCompany(
  id: string,
  orgId: string
): Promise<CompanyWithSupplierProfile | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*, supplier_profile:supplier_profiles(*)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    logger.error("Erro ao buscar empresa", { error: error.message });
    throw new Error("Falha ao carregar empresa");
  }

  return data as CompanyWithSupplierProfile;
}

// ============================================================
// Mutations
// ============================================================

export async function createCompany(
  data: CompanyInsert,
  orgId: string,
  userId: string
): Promise<Company> {
  const taxIdNormalized = data.tax_id
    ? data.tax_id.replace(/\D/g, "")
    : null;
  const legalNameNormalized = data.legal_name
    ? normalizeText(data.legal_name)
    : null;

  if (taxIdNormalized) {
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("organization_id", orgId)
     .eq("tax_id_normalized", taxIdNormalized)
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error("Já existe uma empresa com este CNPJ/CPF nesta organização");
    }
  }

  if (legalNameNormalized) {
    const { data: existing } = await supabase
      .from("companies")
      .select("id, legal_name")
      .eq("organization_id", orgId)
      .neq("status", "archived");

    if (existing) {
      const duplicate = existing.some(
        (c) => normalizeText(c.legal_name) === legalNameNormalized
      );
      if (duplicate) {
        throw new Error("Já existe uma empresa com esta Razão Social nesta organização");
      }
    }
  }

  const { data: result, error } = await supabase
    .from("companies")
    .insert({
      ...data,
      organization_id: orgId,
      tax_id_normalized: taxIdNormalized,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error("Erro ao criar empresa", { error: error.message });
    if (error.message.includes("unique")) {
      throw new Error("Já existe uma empresa com estes dados nesta organização");
    }
    throw new Error("Falha ao criar empresa");
  }

  await logAudit({
    organizationId: orgId,
    action: "company.created",
    entityType: "company",
    entityId: result.id,
    newData: result as unknown as Record<string, Json>,
  });

  return result;
}

export async function updateCompany(
  id: string,
  data: CompanyUpdate,
  orgId: string,
  userId: string
): Promise<Company> {
  const { data: before } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  const updateData: CompanyUpdate = { ...data, updated_by: userId };

  if (data.tax_id) {
    updateData.tax_id_normalized = data.tax_id.replace(/\D/g, "");
  }



  const { data: result, error } = await supabase
    .from("companies")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Erro ao atualizar empresa", { error: error.message });
    throw new Error("Falha ao atualizar empresa");
  }

  await logAudit({
    organizationId: orgId,
    action: "company.updated",
    entityType: "company",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: result as unknown as Record<string, Json>,
  });

  return result;
}

export async function archiveCompany(
  id: string,
  orgId: string,
  userId: string
): Promise<void> {
  const { data: before } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("companies")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      archived_by: userId,
      updated_by: userId,
    })
    .eq("id", id);

  if (error) {
    logger.error("Erro ao arquivar empresa", { error: error.message });
    throw new Error("Falha ao arquivar empresa");
  }

  await logAudit({
    organizationId: orgId,
    action: "company.archived",
    entityType: "company",
    entityId: id,
    oldData: before as unknown as Record<string, Json> | undefined,
    newData: {
      status: "archived",
      archived_at: new Date().toISOString(),
      archived_by: userId,
    },
  });
}
