// ============================================================
// Client status badges (color + label).
// Status text is never color-only; each badge carries a label.
// ============================================================

import {
  CLIENT_PROFILE_STATUSES,
  CLIENT_WORKFLOW_STATUSES,
} from "../types/client.types";

const baseBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: "var(--radius-full)",
  fontSize: "var(--text-xs)",
  fontWeight: "var(--font-medium)",
  whiteSpace: "nowrap",
};

function badgeStyle(color: string): React.CSSProperties {
  return { ...baseBadge, backgroundColor: `${color}20`, color };
}

function neutralBadge(): React.CSSProperties {
  return {
    ...baseBadge,
    backgroundColor: "var(--color-surface-secondary, #F3F4F6)",
    color: "var(--color-text-secondary)",
  };
}

export function ClientBadges({
  status,
  type,
}: {
  status: string;
  type: "profile" | "workflow";
}) {
  const options =
    type === "profile" ? CLIENT_PROFILE_STATUSES : CLIENT_WORKFLOW_STATUSES;
  const info = options.find((s) => s.value === status);
  if (!info) return <span style={neutralBadge()}>{status || "—"}</span>;
  return <span style={badgeStyle(info.color)}>{info.label}</span>;
}
