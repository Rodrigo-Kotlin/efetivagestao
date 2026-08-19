// ============================================================
// Hand-rolled validation helpers (no external validation libs)
// ============================================================

// UI-FORM02: normalization — uppercase, no leading/trailing spaces,
// internal spaces collapsed, only letters/digits/`-`/`_`.
export function normalizePolicyCode(input: string): string {
  const cleaned = input
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toUpperCase();
  return cleaned;
}

export function isValidPolicyCode(input: string): boolean {
  const normalized = normalizePolicyCode(input);
  return normalized.length > 0 && normalized === normalizePolicyCode(input);
}

export function isValidScopeTarget(
  scopeType: string,
  catalogCategoryId: string,
  catalogItemId: string
): boolean {
  if (scopeType === "category") return catalogCategoryId !== "";
  if (scopeType === "catalog_item") return catalogItemId !== "";
  return true;
}