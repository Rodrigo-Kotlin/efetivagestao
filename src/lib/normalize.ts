/**
 * Text normalization for catalog search and comparison.
 * Preserves original text; normalization is for comparison only.
 */

const ACCENT_MAP: Record<string, string> = {
  a: "áàâãäå",
  e: "éèêë",
  i: "íìîï",
  o: "óòôõö",
  u: "úùûü",
  c: "ç",
  n: "ñ",
  y: "ýÿ",
};

const ACCENT_REGEX = new RegExp(
  `[${Object.values(ACCENT_MAP).join("")}]`,
  "g"
);

const ACCENT_LOOKUP: Record<string, string> = {};
for (const [base, accents] of Object.entries(ACCENT_MAP)) {
  for (const accent of accents) {
    ACCENT_LOOKUP[accent] = base;
  }
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(ACCENT_REGEX, (match) => ACCENT_LOOKUP[match] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSearch(normalized: string, query: string): boolean {
  const normalizedQuery = normalizeText(query);
  return normalized.includes(normalizedQuery);
}
