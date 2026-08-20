// ============================================================
// Commercial price status badges (color + label).
// Status text is never color-only; each badge carries a label.
// ============================================================

import {
  COMMERCIAL_TABLE_STATUSES,
  COMMERCIAL_VERSION_STATUSES,
  COMMERCIAL_EXCEPTION_STATUSES,
  COMMERCIAL_VIOLATION_CODES,
  COMMERCIAL_ITEM_ORIGINS,
  type CommercialTableStatus,
  type CommercialVersionStatus,
  type CommercialExceptionStatus,
  type CommercialViolationCode,
  type CommercialItemOrigin,
} from "../types/commercial.types";

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

export function CommercialTableStatusBadge({ status }: { status: CommercialTableStatus }) {
  const info = COMMERCIAL_TABLE_STATUSES.find((s) => s.value === status);
  if (!info) return <span style={neutralBadge()}>—</span>;
  return <span style={badgeStyle(info.color)}>{info.label}</span>;
}

export function CommercialVersionStatusBadge({
  status,
}: {
  status: CommercialVersionStatus;
}) {
  const info = COMMERCIAL_VERSION_STATUSES.find((s) => s.value === status);
  if (!info) return <span style={neutralBadge()}>—</span>;
  return <span style={badgeStyle(info.color)}>{info.label}</span>;
}

export function CommercialExceptionStatusBadge({
  status,
}: {
  status: CommercialExceptionStatus;
}) {
  const info = COMMERCIAL_EXCEPTION_STATUSES.find((s) => s.value === status);
  if (!info) return <span style={neutralBadge()}>—</span>;
  return <span style={badgeStyle(info.color)}>{info.label}</span>;
}

export function CommercialViolationBadge({
  code,
}: {
  code: CommercialViolationCode;
}) {
  const info = COMMERCIAL_VIOLATION_CODES.find((c) => c.value === code);
  if (!info) return <span style={neutralBadge()}>{code}</span>;
  return <span style={badgeStyle(info.color)}>{info.label}</span>;
}

export function CommercialOriginBadge({ origin }: { origin: CommercialItemOrigin }) {
  const info = COMMERCIAL_ITEM_ORIGINS.find((o) => o.value === origin);
  if (!info) return <span style={neutralBadge()}>—</span>;
  return <span style={badgeStyle(info.color)}>{info.label}</span>;
}

export function CommercialCodeBadge({ code }: { code: string }) {
  return (
    <span
      style={{
        ...baseBadge,
        fontFamily: "var(--font-mono, monospace)",
        backgroundColor: "var(--color-surface-secondary, #F3F4F6)",
        color: "var(--color-text-secondary)",
      }}
    >
      {code}
    </span>
  );
}
