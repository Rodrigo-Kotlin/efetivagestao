// ============================================================
// Client Pricing — formatting utilities (UI-only).
// Backend is authoritative for all pricing data.
// ============================================================

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const datePart = value.split("T")[0] ?? "";
  const parts = datePart.split("-");
  if (parts.length !== 3) return "—";
  const [y, m, d] = parts;
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export function formatDateExclusive(value: string | null | undefined): string {
  if (!value) return "sem data final";
  return `até antes de ${formatDate(value)}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Parse a pt-BR money input string into a number.
 * Accepts: "92", "92,50", "R$ 92,50", "0", "R$ 0,00"
 * Returns null for invalid input.
 */
export function parseMoneyInput(input: string): number | null {
  const cleaned = input.replace(/[R$\s]/g, "").trim();
  if (cleaned === "") return null;

  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);

  if (Number.isNaN(num) || num < 0) return null;
  return Math.round(num * 10000) / 10000;
}

/**
 * Validate that a string represents a valid non-negative money value.
 */
export function isValidMoneyInput(input: string): boolean {
  return parseMoneyInput(input) !== null;
}

export function describeProfileStatus(status: string): string {
  switch (status) {
    case "active": return "Ativo";
    case "inactive": return "Inativo";
    case "blocked": return "Bloqueado";
    default: return status;
  }
}

export function describeWorkflowStatus(status: string): string {
  switch (status) {
    case "draft": return "Rascunho";
    case "under_review": return "Em revisão";
    case "approved": return "Aprovada";
    case "scheduled": return "Agendada";
    case "active": return "Ativa";
    case "superseded": return "Substituída";
    case "cancelled": return "Cancelada";
    default: return status;
  }
}
