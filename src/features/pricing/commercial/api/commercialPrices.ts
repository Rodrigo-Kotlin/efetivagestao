// ============================================================
// Commercial Price Tables — Supabase API wrapper.
//
// Every mutation goes through the canonical RPCs declared in
// migrations 032/033/034/035. The UI layer never issues direct
// UPDATE on status columns or writes source_* provenance fields.
// ============================================================

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import { matchesSearch, normalizeText } from "@/lib/normalize";
import type {
  AddEngineItemInput,
  AddManualItemInput,
  BulkAdjustInput,
  CatalogItemOption,
  CloneVersionInput,
  CloneVersionResult,
  CommercialPriceException,
  CommercialPriceItem,
  CommercialPriceResolverResult,
  CommercialPriceTable,
  CommercialPriceTableVersion,
  CommercialPriceTableWithCounts,
  CommercialPriceVersionDetail,
  CreateCommercialTableInput,
  CreateCommercialVersionInput,
  DecideExceptionInput,
  DeleteItemInput,
  PublishReadinessResult,
  RequestExceptionInput,
  ResolveCommercialPriceInput,
  SetCommercialTableStatusInput,
  UpdateCommercialTableInput,
  UpdateItemPriceInput,
  VersionCreateResult,
  CommercialEngineSimulationInput,
  CommercialEngineSimulationResult,
} from "../types/commercial.types";

// ------------------------------------------------------------
// Pagination + generic helpers
// ------------------------------------------------------------

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface FetchTablesParams {
  orgId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

function isPgNotFound(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST116";
}

// ------------------------------------------------------------
// Read: stable tables (commercial_price_tables)
// ------------------------------------------------------------

export async function fetchCommercialTables(
  params: FetchTablesParams
): Promise<PaginatedResult<CommercialPriceTableWithCounts>> {
  const { orgId, page = 1, pageSize = 25, search, status } = params;

  let query = supabase
    .from("commercial_price_tables")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (search) query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error("Erro ao buscar tabelas comerciais", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }

  const tables = (data ?? []) as unknown as CommercialPriceTable[];
  const total = count ?? 0;

  // Hydrate with version counts + current/scheduled versions in one query.
  const tableIds = tables.map((t) => t.id);
  let versionRows: CommercialPriceTableVersion[] = [];
  if (tableIds.length > 0) {
    const { data: vData, error: vErr } = await supabase
      .from("commercial_price_table_versions")
      .select("*")
      .eq("organization_id", orgId)
      .in("commercial_price_table_id", tableIds)
      .in("status", ["active", "scheduled"]);
    if (vErr) {
      logger.warn("Falha ao hidratar versões nas tabelas comerciais", {
        error: vErr.message,
      });
    } else {
      versionRows = (vData ?? []) as unknown as CommercialPriceTableVersion[];
    }
  }

  const enriched: CommercialPriceTableWithCounts[] = tables.map((t) => {
    const versions = versionRows.filter((v) => v.commercial_price_table_id === t.id);
    const active = versions.find((v) => v.status === "active") ?? null;
    const scheduled = versions.find((v) => v.status === "scheduled") ?? null;
    return { ...t, current_version: active, scheduled_version: scheduled };
  });

  return {
    data: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function fetchCommercialTable(
  tableId: string,
  orgId: string
): Promise<CommercialPriceTableWithCounts | null> {
  const { data, error } = await supabase
    .from("commercial_price_tables")
    .select("*")
    .eq("id", tableId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error && !isPgNotFound(error)) {
    logger.error("Erro ao buscar tabela comercial", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }
  if (!data) return null;

  const table = data as unknown as CommercialPriceTable;
  const { data: versionsData, error: vErr } = await supabase
    .from("commercial_price_table_versions")
    .select("*")
    .eq("commercial_price_table_id", tableId)
    .eq("organization_id", orgId)
    .order("version_number", { ascending: false });

  if (vErr) {
    logger.warn("Falha ao buscar versões da tabela", { error: vErr.message });
  }
  const versions = (versionsData ?? []) as unknown as CommercialPriceTableVersion[];
  const active = versions.find((v) => v.status === "active") ?? null;
  const scheduled = versions.find((v) => v.status === "scheduled") ?? null;

  return {
    ...table,
    version_count: versions.length,
    current_version: active,
    scheduled_version: scheduled,
  };
}

export async function fetchCommercialTableVersions(
  tableId: string,
  orgId: string
): Promise<CommercialPriceTableVersion[]> {
  const { data, error } = await supabase
    .from("commercial_price_table_versions")
    .select("*")
    .eq("commercial_price_table_id", tableId)
    .eq("organization_id", orgId)
    .order("version_number", { ascending: false });

  if (error) {
    logger.error("Erro ao buscar versões de tabela comercial", {
      error: error.message,
    });
    throw mapCommercialPriceError(error.message);
  }
  return (data ?? []) as unknown as CommercialPriceTableVersion[];
}

// ------------------------------------------------------------
// Read: version detail + items + exceptions
// ------------------------------------------------------------

export async function fetchCommercialVersion(
  versionId: string,
  orgId: string
): Promise<CommercialPriceVersionDetail | null> {
  const { data, error } = await supabase
    .from("commercial_price_table_versions")
    .select(
      "*, table:commercial_price_tables(id, code, name, status, organization_id)"
    )
    .eq("id", versionId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error && !isPgNotFound(error)) {
    logger.error("Erro ao buscar versão de tabela comercial", {
      error: error.message,
    });
    throw mapCommercialPriceError(error.message);
  }
  if (!data) return null;

  const version = data as unknown as CommercialPriceVersionDetail;

  // Items + exceptions in parallel (RLS-scoped reads).
  const [itemsRes, excRes] = await Promise.all([
    supabase
      .from("commercial_price_items")
      .select("*")
      .eq("commercial_price_table_version_id", versionId)
      .eq("organization_id", orgId)
      .order("item_code_snapshot", { ascending: true }),
    supabase
      .from("commercial_price_exceptions")
      .select("*")
      .eq("commercial_price_table_version_id", versionId)
      .eq("organization_id", orgId)
      .order("requested_at", { ascending: false }),
  ]);

  if (itemsRes.error) {
    logger.warn("Falha ao buscar itens comerciais", {
      error: itemsRes.error.message,
    });
  }
  if (excRes.error) {
    logger.warn("Falha ao buscar exceções comerciais", {
      error: excRes.error.message,
    });
  }

  version.items = (itemsRes.data ?? []) as unknown as CommercialPriceItem[];
  version.exceptions = (excRes.data ?? []) as unknown as CommercialPriceException[];
  version.item_count = version.items.length;

  return version;
}

export async function fetchCommercialVersionExceptions(
  versionId: string,
  orgId: string
): Promise<CommercialPriceException[]> {
  const { data, error } = await supabase
    .from("commercial_price_exceptions")
    .select("*")
    .eq("commercial_price_table_version_id", versionId)
    .eq("organization_id", orgId)
    .order("requested_at", { ascending: false });

  if (error) {
    logger.error("Erro ao buscar exceções", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }
  return (data ?? []) as unknown as CommercialPriceException[];
}

// ------------------------------------------------------------
// Read: catalog selector for forms
// ------------------------------------------------------------

export async function fetchActiveCatalogItems(
  orgId: string,
  search?: string
): Promise<CatalogItemOption[]> {
  let query = supabase
    .from("catalog_items")
    .select("id, code, name, status, item_type")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("code", { ascending: true })
    .limit(200);

  if (search) {
    query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    logger.error("Erro ao buscar itens de catálogo", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }
  return (data ?? []) as unknown as CatalogItemOption[];
}

// ------------------------------------------------------------
// Mutations: stable table (commercial_price_tables)
// ------------------------------------------------------------

export async function createCommercialTable(
  input: CreateCommercialTableInput
): Promise<string> {
  const { orgId, code, name, description } = input;
  const { data, error } = await supabase.rpc("fn_create_commercial_price_table", {
    p_organization_id: orgId,
    p_code: code,
    p_name: name,
    p_description: description,
  });

  if (error) {
    logger.error("Falha ao criar tabela comercial", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }

  await logAudit({
    organizationId: orgId,
    action: "commercial_price_table.created",
    entityType: "commercial_price_table",
    entityId: (data as string | null) ?? undefined,
    newData: { code, name, description },
  });

  return data as string;
}

export async function updateCommercialTable(
  input: UpdateCommercialTableInput
): Promise<void> {
  const { tableId, name, description } = input;
  const { error } = await supabase.rpc("fn_update_commercial_price_table", {
    p_table_id: tableId,
    p_name: name,
    p_description: description,
  });

  if (error) {
    logger.error("Falha ao atualizar tabela comercial", {
      error: error.message,
    });
    throw mapCommercialPriceError(error.message);
  }

  await logAudit({
    organizationId: "",
    action: "commercial_price_table.updated",
    entityType: "commercial_price_table",
    entityId: tableId,
    newData: { name, description },
  });
}

export async function setCommercialTableStatus(
  input: SetCommercialTableStatusInput
): Promise<void> {
  const { tableId, status } = input;
  const { error } = await supabase.rpc("fn_set_commercial_price_table_status", {
    p_table_id: tableId,
    p_status: status,
  });

  if (error) {
    logger.error("Falha ao alterar status da tabela comercial", {
      error: error.message,
    });
    throw mapCommercialPriceError(error.message);
  }

  await logAudit({
    organizationId: "",
    action: "commercial_price_table.status_changed",
    entityType: "commercial_price_table",
    entityId: tableId,
    newData: { status },
  });
}

// ------------------------------------------------------------
// Mutations: version create + clone
// ------------------------------------------------------------

export async function createCommercialVersion(
  input: CreateCommercialVersionInput
): Promise<VersionCreateResult> {
  const { tableId, validFrom, validTo, versionLabel, notes } = input;
  const { data, error } = await supabase.rpc(
    "fn_create_commercial_price_table_version",
    {
      p_commercial_price_table_id: tableId,
      p_valid_from: validFrom,
      p_valid_to: validTo,
      p_version_label: versionLabel,
      p_notes: notes,
    }
  );

  if (error) {
    logger.error("Falha ao criar versão de tabela comercial", {
      error: error.message,
    });
    throw mapCommercialPriceError(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row as unknown as VersionCreateResult;
}

export async function cloneCommercialVersion(
  input: CloneVersionInput
): Promise<CloneVersionResult> {
  const { sourceVersionId, validFrom, validTo, versionLabel, notes } = input;
  const { data, error } = await supabase.rpc(
    "fn_clone_commercial_price_table_version",
    {
      p_source_version_id: sourceVersionId,
      p_valid_from: validFrom,
      p_valid_to: validTo,
      p_version_label: versionLabel,
      p_notes: notes,
    }
  );

  if (error) {
    logger.error("Falha ao clonar versão de tabela comercial", {
      error: error.message,
    });
    throw mapCommercialPriceError(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row as unknown as CloneVersionResult;
}

// ------------------------------------------------------------
// Mutations: items (manual / engine / clone / bulk / delete)
// ------------------------------------------------------------

export async function addManualCommercialItem(
  input: AddManualItemInput
): Promise<string> {
  const { versionId, catalogItemId, priceAmount } = input;
  const { data, error } = await supabase.rpc(
    "fn_add_commercial_price_item_manual",
    {
      p_version_id: versionId,
      p_catalog_item_id: catalogItemId,
      p_price_amount: priceAmount,
    }
  );

  if (error) {
    logger.error("Falha ao adicionar item manual", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }

  return data as string;
}

export async function updateCommercialItemPrice(
  input: UpdateItemPriceInput
): Promise<void> {
  const { itemId, priceAmount } = input;
  const { error } = await supabase.rpc(
    "fn_update_commercial_price_item_price",
    {
      p_item_id: itemId,
      p_price_amount: priceAmount,
    }
  );

  if (error) {
    logger.error("Falha ao atualizar preço do item", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }
}

export async function deleteCommercialItem(
  input: DeleteItemInput
): Promise<void> {
  const { itemId } = input;
  const { error } = await supabase.rpc("fn_delete_commercial_price_item", {
    p_item_id: itemId,
  });

  if (error) {
    logger.error("Falha ao remover item comercial", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }
}

export async function addEngineCommercialItem(
  input: AddEngineItemInput
): Promise<string> {
  const {
    versionId,
    catalogItemId,
    supplierCompanyId,
    referenceDate,
    discountRate,
    commercialPriceAmount,
  } = input;

  const { data, error } = await supabase.rpc(
    "fn_add_commercial_price_item_from_engine",
    {
      p_version_id: versionId,
      p_catalog_item_id: catalogItemId,
      p_supplier_company_id: supplierCompanyId,
      p_reference_date: referenceDate,
      p_discount_rate: discountRate,
      p_commercial_price_amount: commercialPriceAmount,
    }
  );

  if (error) {
    logger.error("Falha ao adicionar item via motor", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }

  return data as string;
}

export async function bulkAdjustCommercialPrices(
  input: BulkAdjustInput
): Promise<number> {
  const {
    versionId,
    operation,
    rate,
    fixedAmount,
    roundingMode,
    roundingStep,
    itemIds,
  } = input;

  const { data, error } = await supabase.rpc(
    "fn_bulk_adjust_commercial_prices",
    {
      p_version_id: versionId,
      p_operation: operation,
      p_rate: rate ?? null,
      p_fixed_amount: fixedAmount ?? null,
      p_rounding_mode: roundingMode ?? null,
      p_rounding_step: roundingStep ?? null,
      p_item_ids: itemIds ?? null,
    }
  );

  if (error) {
    logger.error("Falha no ajuste em massa", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }

  return typeof data === "number" ? data : Number(data ?? 0);
}

// ------------------------------------------------------------
// Mutations: exceptions
// ------------------------------------------------------------

export async function requestCommercialException(
  input: RequestExceptionInput
): Promise<string> {
  const { itemId, violationCode, reason } = input;
  const { data, error } = await supabase.rpc(
    "fn_request_commercial_price_exception",
    {
      p_commercial_price_item_id: itemId,
      p_violation_code: violationCode,
      p_reason: reason,
    }
  );

  if (error) {
    logger.error("Falha ao solicitar exceção comercial", {
      error: error.message,
    });
    throw mapCommercialPriceError(error.message);
  }

  return data as string;
}

export async function decideCommercialException(
  input: DecideExceptionInput
): Promise<void> {
  const { exceptionId, decision, notes } = input;
  const { error } = await supabase.rpc(
    "fn_decide_commercial_price_exception",
    {
      p_exception_id: exceptionId,
      p_decision: decision,
      p_notes: notes,
    }
  );

  if (error) {
    logger.error("Falha ao decidir exceção comercial", {
      error: error.message,
    });
    throw mapCommercialPriceError(error.message);
  }
}

// ------------------------------------------------------------
// Mutations: workflow (submit / return / approve / cancel / publish)
// ------------------------------------------------------------

export async function submitCommercialVersion(versionId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_submit_commercial_price_version", {
    p_version_id: versionId,
  });
  if (error) {
    logger.error("Falha ao enviar versão para revisão", {
      error: error.message,
    });
    throw mapCommercialPriceError(error.message);
  }
}

export async function returnCommercialVersionToDraft(
  versionId: string
): Promise<void> {
  const { error } = await supabase.rpc(
    "fn_return_commercial_price_version_to_draft",
    { p_version_id: versionId }
  );
  if (error) {
    logger.error("Falha ao voltar versão para rascunho", {
      error: error.message,
    });
    throw mapCommercialPriceError(error.message);
  }
}

export async function approveCommercialVersion(versionId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_approve_commercial_price_version", {
    p_version_id: versionId,
  });
  if (error) {
    logger.error("Falha ao aprovar versão", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }
}

export async function cancelCommercialVersion(versionId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_cancel_commercial_price_version", {
    p_version_id: versionId,
  });
  if (error) {
    logger.error("Falha ao cancelar versão", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }
}

export async function publishCommercialVersion(versionId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_publish_commercial_price_version", {
    p_version_id: versionId,
  });
  if (error) {
    logger.error("Falha ao publicar versão", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }
}

// ------------------------------------------------------------
// Reads: publish readiness + resolver
// ------------------------------------------------------------

export async function validateCommercialVersion(
  versionId: string
): Promise<PublishReadinessResult> {
  const { data, error } = await supabase.rpc(
    "fn_validate_commercial_price_version",
    { p_version_id: versionId }
  );

  if (error) {
    logger.error("Falha ao validar versão", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }

  return (data ?? {}) as unknown as PublishReadinessResult;
}

export async function resolveCommercialPrice(
  input: ResolveCommercialPriceInput
): Promise<CommercialPriceResolverResult> {
  const { orgId, tableId, catalogItemId, referenceDate } = input;
  const { data, error } = await supabase.rpc(
    "fn_resolve_commercial_table_price",
    {
      p_organization_id: orgId,
      p_commercial_price_table_id: tableId,
      p_catalog_item_id: catalogItemId,
      p_reference_date: referenceDate ?? null,
    }
  );

  if (error) {
    logger.error("Falha ao resolver preço comercial", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }

  return (data ?? {}) as unknown as CommercialPriceResolverResult;
}

// ------------------------------------------------------------
// Engine preview (read-only — fn_simulate_price)
// ------------------------------------------------------------

export async function simulateEnginePrice(
  input: CommercialEngineSimulationInput
): Promise<CommercialEngineSimulationResult> {
  const {
    orgId,
    supplierCompanyId,
    catalogItemId,
    referenceDate,
    discountRate,
  } = input;
  const { data, error } = await supabase.rpc("fn_simulate_price", {
    p_organization_id: orgId,
    p_supplier_company_id: supplierCompanyId,
    p_catalog_item_id: catalogItemId,
    p_reference_date: referenceDate ?? null,
    p_discount_rate: discountRate ?? 0,
  });

  if (error) {
    logger.warn("Falha na simulação de preço", { error: error.message });
    throw mapCommercialPriceError(error.message);
  }
  return (data ?? {}) as unknown as CommercialEngineSimulationResult;
}

// ------------------------------------------------------------
// Error mapper (pt-BR)
// ------------------------------------------------------------

export function mapCommercialPriceError(message: string): string {
  if (message.includes("Authentication required"))
    return "Sua sessão expirou. Faça login novamente.";
  if (message.includes("Not a member of this organization"))
    return "Você não é membro desta organização.";
  if (
    message.includes("Insufficient permissions") ||
    message.includes("permission denied") ||
    message.includes("not authorized")
  )
    return "Você não tem permissão para realizar esta ação.";
  if (message.includes("commercial_price_tables") && message.includes("not found"))
    return "Tabela comercial não encontrada.";
  if (message.includes("commercial_price_table_version") && message.includes("not found"))
    return "Versão de tabela comercial não encontrada.";
  if (message.includes("commercial_price_item") && message.includes("not found"))
    return "Item comercial não encontrado.";
  if (message.includes("Duplicate key value") || message.includes("unique"))
    return "Já existe uma tabela comercial com este código nesta organização.";
  if (message.includes("inactive") && message.includes("commercial_price_table"))
    return "A tabela comercial está inativa. Não é possível criar novas versões.";
  if (
    message.includes("Invalid transition") ||
    message.includes("cannot transition") ||
    message.includes("invalid_status_transition")
  )
    return "Transição de status inválida para o estado atual da versão.";
  if (message.includes("Only draft versions"))
    return "Apenas versões em rascunho podem ser editadas.";
  if (message.includes("must contain at least one item") || message.includes("empty version"))
    return "A versão precisa ter ao menos um item para ser publicada.";
  if (message.includes("SOURCE_CONTAINS_INACTIVE_CATALOG_ITEM"))
    return "A versão de origem contém um item cujo item de catálogo está inativo. Ative-o antes de clonar.";
  if (message.includes("duplicate item") || message.includes("already exists in version"))
    return "Este item de catálogo já está presente nesta versão.";
  if (message.includes("negative price") || message.includes("price_amount < 0"))
    return "O preço não pode ser negativo.";
  if (message.includes("Engine simulation failure") || message.includes("engine simulation"))
    return "Falha ao simular preço pelo motor de precificação.";
  if (message.includes("pending exception") || message.includes("PENDING_EXCEPTIONS"))
    return "Existem exceções pendentes. Decida-as antes de publicar.";
  if (message.includes("denied exception") || message.includes("DENIED_EXCEPTIONS"))
    return "Existem exceções negadas. Remova os itens correspondentes antes de publicar.";
  if (message.includes("missing approved exception") || message.includes("MISSING_APPROVED_EXCEPTIONS"))
    return "A versão exige exceções aprovadas que ainda não foram registradas.";
  if (
    message.includes("published item immutable") ||
    message.includes("immutable") ||
    message.includes("cannot be edited")
  )
    return "Itens publicados são imutáveis.";
  if (
    message.includes("direct provenance blocked") ||
    message.includes("engine provenance") ||
    message.includes("origin_type = 'pricing_engine'")
  )
    return "Proveniência de motor deve ser registrada via RPC autorizado.";
  if (message.includes("temporal overlap") || message.includes("overlaps") || message.includes("no_overlap"))
    return "A vigência desta versão se sobrepõe a outra versão da mesma tabela.";
  if (message.includes("VERSION_NOT_APPROVED"))
    return "Apenas versões aprovadas podem ser publicadas.";
  if (message.includes("scheduled") || message.includes("already scheduled"))
    return "A versão já está agendada.";
  if (message.includes("New commercial price items require an active catalog item"))
    return "O item de catálogo precisa estar ativo para ser adicionado.";
  if (message.includes("Invalid operation"))
    return "Operação inválida.";
  if (message.includes("invalid input syntax") || message.includes("invalid_text_representation"))
    return "Formato inválido em algum dos campos.";
  return message;
}

// ------------------------------------------------------------
// Catalog selector wrapper (exported for testability)
// ------------------------------------------------------------

export function filterCatalogOptions(
  options: CatalogItemOption[],
  query: string
): CatalogItemOption[] {
  if (!query.trim()) return options;
  return options.filter((opt) => matchesSearch(normalizeText(`${opt.code} ${opt.name}`), query));
}
