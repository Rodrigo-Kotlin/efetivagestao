import type { SemanticTone } from "./Badge";

export type { SemanticTone };

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  ativo: "Ativo",
  inactive: "Inativo",
  inativo: "Inativo",
  blocked: "Bloqueado",
  bloqueado: "Bloqueado",
  draft: "Rascunho",
  rascunho: "Rascunho",
  published: "Publicado",
  publicado: "Publicado",
  approved: "Aprovado",
  aprovado: "Aprovado",
  paid: "Pago",
  pago: "Pago",
  scheduled: "Agendado",
  agendado: "Agendado",
  cancelled: "Cancelado",
  cancelado: "Cancelado",
  archived: "Arquivado",
  arquivado: "Arquivado",
  pending: "Pendente",
  pendente: "Pendente",
  expired: "Expirado",
  expirado: "Expirado",
  revoked: "Revogado",
  revogado: "Revogado",
  rejected: "Rejeitado",
  rejeitado: "Rejeitado",
  review: "Em revisão",
  "em revisão": "Em revisão",
  "em revisao": "Em revisão",
  under_review: "Em revisão",
  superseded: "Substituído",
  substituído: "Substituído",
  substituido: "Substituído",
  partial: "Parcial",
  parcial: "Parcial",
  suspended: "Suspenso",
  suspenso: "Suspenso",
  provided: "Fornecido",
  fornecido: "Fornecido",
  not_provided: "Não fornecido",
  "não fornecido": "Não fornecido",
  "nao fornecido": "Não fornecido",
  not_applicable: "Não aplicável",
  "não aplicável": "Não aplicável",
  "nao aplicavel": "Não aplicável",
  awaiting_quote: "Aguardando cotação",
  "aguardando cotação": "Aguardando cotação",
  "aguardando cotacao": "Aguardando cotação",
  confirmed_zero: "Confirmado zero",
  "confirmado zero": "Confirmado zero",
  discontinued: "Descontinuado",
  descontinuado: "Descontinuado",
};

export function statusLabel(status: string): string {
  if (!status) return "—";
  const normalized = status.toLowerCase().trim();
  return STATUS_LABELS[normalized] ?? capitalize(normalized);
}

export function statusTone(status: string): SemanticTone {
  const normalized = status.toLowerCase().trim();
  switch (normalized) {
    case "active":
    case "ativo":
    case "approved":
    case "aprovado":
    case "paid":
    case "pago":
    case "published":
    case "publicado":
      return "positive";
    case "inactive":
    case "inativo":
    case "cancelled":
    case "cancelado":
    case "superseded":
    case "substituído":
    case "substituido":
    case "archived":
    case "arquivado":
    case "expired":
    case "expirado":
    case "revoked":
    case "revogado":
    case "rejected":
    case "rejeitado":
      return "negative";
    case "blocked":
    case "bloqueado":
    case "suspended":
    case "suspenso":
      return "negative";
    case "draft":
    case "rascunho":
    case "pending":
    case "pendente":
    case "partial":
    case "parcial":
    case "awaiting_quote":
    case "aguardando cotação":
    case "aguardando cotacao":
      return "warning";
    case "review":
    case "em revisão":
    case "em revisao":
    case "under_review":
    case "scheduled":
    case "agendado":
      return "info";
    default:
      return "neutral";
  }
}

function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
