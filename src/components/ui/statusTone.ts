import type { SemanticTone } from "./Badge";

const POSITIVE = new Set([
  "active", "approved", "resolved", "paid", "published", "confirmed",
  "ativo", "aprovado", "pago", "publicado", "confirmado",
]);
const WARNING = new Set([
  "draft", "requested", "pending", "below_minimum_margin",
  "rascunho", "solicitado", "pendente",
]);
const NEGATIVE = new Set([
  "blocked", "cancelled", "denied", "client_not_found",
  "item_not_found", "below_cost", "inactive", "substituted",
  "bloqueado", "cancelado", "inativo", "substituido",
]);
const INFO = new Set([
  "under_review", "scheduled", "pricing_engine", "commercial_deviation",
  "em_revisao", "agendado",
]);

export function statusTone(value: string): SemanticTone {
  const normalized = value.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
  if (POSITIVE.has(normalized)) return "positive";
  if (WARNING.has(normalized)) return "warning";
  if (NEGATIVE.has(normalized)) return "negative";
  if (INFO.has(normalized)) return "info";
  return "neutral";
}
