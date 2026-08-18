import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { Json } from "@/types/database";

interface AuditEntry {
  organizationId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: Record<string, Json | undefined>;
  newData?: Record<string, Json | undefined>;
  reason?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: entry.organizationId,
    actor_user_id: user?.id ?? null,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    old_data: entry.oldData ?? null,
    new_data: entry.newData ?? null,
    reason: entry.reason ?? null,
  });

  if (error) {
    logger.error("Falha ao registrar auditoria", {
      action: entry.action,
      entity_type: entry.entityType,
      error: error.message,
    });
  }
}
