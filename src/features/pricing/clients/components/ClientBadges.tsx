// Status text remains mandatory; color is only supporting information.

import { StatusChip, statusTone } from "@/components/ui";
import {
  CLIENT_PROFILE_STATUSES,
  CLIENT_WORKFLOW_STATUSES,
} from "../types/client.types";

export function ClientBadges({
  status,
  type,
}: {
  status: string;
  type: "profile" | "workflow";
}) {
  const options = type === "profile" ? CLIENT_PROFILE_STATUSES : CLIENT_WORKFLOW_STATUSES;
  const info = options.find((option) => option.value === status);
  return <StatusChip tone={statusTone(status)}>{info?.label ?? (status || "—")}</StatusChip>;
}
