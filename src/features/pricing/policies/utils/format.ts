// ============================================================
// pt-BR formatting helpers
// ============================================================

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return brl.format(value);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

// DB stores fractions (0.20); UI displays percentages (20%).
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value * 100)}%`;
}

// "20" (UI) -> 0.20 (fraction for the backend). Returns null for empty input.
export function parsePercent(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const value = parseFloat(trimmed.replace(",", "."));
  if (Number.isNaN(value)) return null;
  return value / 100;
}

export function parseNumber(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const value = parseFloat(trimmed.replace(",", "."));
  return Number.isNaN(value) ? null : value;
}