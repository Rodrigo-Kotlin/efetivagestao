// Domain labels stay local; visual status semantics come from the shared system.

import { Badge, StatusChip, statusTone } from "@/components/ui";
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

export function CommercialTableStatusBadge({ status }: { status: CommercialTableStatus }) {
  const info = COMMERCIAL_TABLE_STATUSES.find((option) => option.value === status);
  return <StatusChip tone={statusTone(status)}>{info?.label ?? "—"}</StatusChip>;
}

export function CommercialVersionStatusBadge({ status }: { status: CommercialVersionStatus }) {
  const info = COMMERCIAL_VERSION_STATUSES.find((option) => option.value === status);
  return <StatusChip tone={statusTone(status)}>{info?.label ?? "—"}</StatusChip>;
}

export function CommercialExceptionStatusBadge({ status }: { status: CommercialExceptionStatus }) {
  const info = COMMERCIAL_EXCEPTION_STATUSES.find((option) => option.value === status);
  return <StatusChip tone={statusTone(status)}>{info?.label ?? "—"}</StatusChip>;
}

export function CommercialViolationBadge({ code }: { code: CommercialViolationCode }) {
  const info = COMMERCIAL_VIOLATION_CODES.find((option) => option.value === code);
  return <StatusChip tone={statusTone(code)}>{info?.label ?? code}</StatusChip>;
}

export function CommercialOriginBadge({ origin }: { origin: CommercialItemOrigin }) {
  const info = COMMERCIAL_ITEM_ORIGINS.find((option) => option.value === origin);
  return <Badge tone={statusTone(origin)}>{info?.label ?? "—"}</Badge>;
}

export function CommercialCodeBadge({ code }: { code: string }) {
  return <Badge mono>{code}</Badge>;
}
