// ============================================================
// Costs — formatting utilities (UI-only).
// Backend is authoritative for all cost data.
// ============================================================

export function formatCurrency(amount: number | null | undefined, currency: string = "BRL"): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency === "BRL" ? "BRL" : currency,
  }).format(amount);
}

/**
 * Format a date-only or timestamp string safely.
 * Date-only YYYY-MM-DD values are split to avoid timezone shifts.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const datePart = value.split("T")[0] ?? "";
  const parts = datePart.split("-");
  if (parts.length !== 3) return "—";
  const [y, m, d] = parts;
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
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

export function isValidMoneyInput(input: string): boolean {
  return parseMoneyInput(input) !== null;
}

/**
 * Compute a display-only signed difference string.
 * This does NOT alter the underlying financial value.
 */
export function formatSignedDiff(diff: number | null, currency: string = "BRL"): string {
  if (diff === null || diff === undefined || Number.isNaN(diff)) return "—";
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${formatCurrency(diff, currency)}`;
}
