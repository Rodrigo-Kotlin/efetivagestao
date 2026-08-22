import { Badge, StatusBadge } from "@/components/ui";
import {
  COMMERCIAL_TABLE_STATUSES,
  type CommercialTableStatus,
  type CommercialVersionStatus,
  type CommercialExceptionStatus,
  type CommercialViolationCode,
  type CommercialItemOrigin,
} from "../types/commercial.types";

export function CommercialTableStatusBadge({ status }: { status: CommercialTableStatus }) {
  return <StatusBadge status={status} />;
}

export function CommercialVersionStatusBadge({ status }: { status: CommercialVersionStatus }) {
  return <StatusBadge status={status} />;
}

export function CommercialExceptionStatusBadge({ status }: { status: CommercialExceptionStatus }) {
  return <StatusBadge status={status} />;
}

export function CommercialViolationBadge({ code }: { code: CommercialViolationCode }) {
  return <StatusBadge status={code} />;
}

export function CommercialOriginBadge({ origin }: { origin: CommercialItemOrigin }) {
  return <Badge tone="neutral">{origin}</Badge>;
}

export function CommercialCodeBadge({ code }: { code: string }) {
  return <Badge mono>{code}</Badge>;
}

// Silence unused warning when COMMERCIAL_TABLE_STATUSES is not directly referenced
void COMMERCIAL_TABLE_STATUSES;
