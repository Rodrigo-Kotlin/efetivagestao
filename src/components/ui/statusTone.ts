import type { SemanticTone } from "./Badge";

const POSITIVE = new Set(["active", "approved", "resolved"]);
const WARNING = new Set(["draft", "requested", "pending", "below_minimum_margin"]);
const NEGATIVE = new Set([
  "blocked",
  "cancelled",
  "denied",
  "client_not_found",
  "item_not_found",
  "below_cost",
]);
const INFO = new Set([
  "under_review",
  "scheduled",
  "pricing_engine",
  "commercial_deviation",
]);

export function statusTone(value: string): SemanticTone {
  const normalized = value.toLowerCase();
  if (POSITIVE.has(normalized)) return "positive";
  if (WARNING.has(normalized)) return "warning";
  if (NEGATIVE.has(normalized)) return "negative";
  if (INFO.has(normalized)) return "info";
  return "neutral";
}
