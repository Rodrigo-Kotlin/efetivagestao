// ============================================================
// CommercialVersionTimeline — visualizes version lifecycle.
// ============================================================

import type { CommercialVersionStatus } from "../types/commercial.types";
import { COMMERCIAL_VERSION_STATUSES } from "../types/commercial.types";

interface Props {
  currentStatus: CommercialVersionStatus;
}

const FLOW: CommercialVersionStatus[] = [
  "draft",
  "under_review",
  "approved",
  "scheduled",
  "active",
  "superseded",
];

export function CommercialVersionTimeline({ currentStatus }: Props) {
  const cancelled = currentStatus === "cancelled";
  const index = FLOW.indexOf(currentStatus);
  return (
    <ol
      aria-label="Linha do tempo da versão"
      style={{
        listStyle: "none",
        display: "flex",
        gap: "var(--space-2)",
        padding: 0,
        margin: 0,
        overflowX: "auto",
        flexWrap: "wrap",
      }}
    >
      {FLOW.map((s, i) => {
        const info = COMMERCIAL_VERSION_STATUSES.find((opt) => opt.value === s);
        const reached = index >= i && !cancelled;
        return (
          <li
            key={s}
            style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--text-xs)",
              backgroundColor: reached ? `${info?.color ?? "#6B7280"}20` : "var(--color-surface-secondary, #F3F4F6)",
              color: reached ? info?.color ?? "#6B7280" : "var(--color-text-secondary)",
              border: currentStatus === s ? `2px solid ${info?.color ?? "#6B7280"}` : "2px solid transparent",
              fontWeight: currentStatus === s ? "var(--font-semibold)" : "var(--font-medium)",
            }}
          >
            {info?.label ?? s}
          </li>
        );
      })}
      {cancelled && (
        <li
          style={{
            padding: "var(--space-1) var(--space-3)",
            borderRadius: "var(--radius-full)",
            fontSize: "var(--text-xs)",
            backgroundColor: "#DC262620",
            color: "#DC2626",
            border: "2px solid #DC2626",
            fontWeight: "var(--font-semibold)",
          }}
        >
          Cancelada
        </li>
      )}
    </ol>
  );
}
