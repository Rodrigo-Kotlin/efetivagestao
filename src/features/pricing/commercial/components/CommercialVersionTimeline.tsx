import type { CommercialVersionStatus } from "../types/commercial.types";
import { Badge } from "@/components/ui/Badge";

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
        gap: "var(--md-sys-spacing-2)",
        padding: 0,
        margin: 0,
        overflowX: "auto",
        flexWrap: "wrap",
      }}
    >
      {FLOW.map((s, i) => {
        const reached = index >= i && !cancelled;
        const tone = reached ? "info" : "neutral";
        return (
          <li key={s}>
            <Badge
              tone={tone}
              data-state={currentStatus === s ? "current" : reached ? "reached" : "future"}
            >
              {labelFor(s)}
            </Badge>
          </li>
        );
      })}
      {cancelled ? (
        <li>
          <Badge tone="negative" data-state="current">Cancelada</Badge>
        </li>
      ) : null}
    </ol>
  );
}

function labelFor(status: CommercialVersionStatus): string {
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
