import { StatusBadge, Badge } from "@/components/ui";
import {
  POLICY_SCOPE_TYPES,
  POLICY_STATUSES,
  POLICY_VERSION_STATUSES,
  PRICING_METHODS,
  type PricingPolicyScopeType,
  type PricingPolicyStatus,
  type PricingPolicyVersionStatus,
  type PricingMethod,
} from "../types/pricing-policy.types";

export function PolicyStatusBadge({ status }: { status: PricingPolicyStatus }) {
  return <StatusBadge status={status} />;
}

export function PolicyVersionStatusBadge({ status }: { status: PricingPolicyVersionStatus }) {
  return <StatusBadge status={status} />;
}

export function PolicyScopeBadge({ scopeType }: { scopeType: PricingPolicyScopeType }) {
  const info = POLICY_SCOPE_TYPES.find((option) => option.value === scopeType);
  return <Badge>{info?.label ?? "—"}</Badge>;
}

export function PricingMethodBadge({ method }: { method: PricingMethod }) {
  const info = PRICING_METHODS.find((option) => option.value === method);
  return <Badge tone="accent">{info?.label ?? "—"}</Badge>;
}

export function CodeBadge({ code }: { code: string }) {
  return <Badge mono>{code}</Badge>;
}

// Silence unused warning when POLICY_STATUSES / POLICY_VERSION_STATUSES are not directly referenced
void POLICY_STATUSES;
void POLICY_VERSION_STATUSES;
