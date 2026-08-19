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

const badgeBase: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: "var(--radius-full)",
  fontSize: "var(--text-xs)",
  fontWeight: "var(--font-medium)",
  whiteSpace: "nowrap",
};

function statusBadgeStyle(color: string): React.CSSProperties {
  return {
    ...badgeBase,
    backgroundColor: `${color}20`,
    color,
  };
}

export function PolicyStatusBadge({ status }: { status: PricingPolicyStatus }) {
  const info = POLICY_STATUSES.find((s) => s.value === status);
  if (!info) return <span style={badgeBase}>—</span>;
  return <span style={statusBadgeStyle(info.color)}>{info.label}</span>;
}

export function PolicyVersionStatusBadge({ status }: { status: PricingPolicyVersionStatus }) {
  const info = POLICY_VERSION_STATUSES.find((s) => s.value === status);
  if (!info) return <span style={badgeBase}>—</span>;
  return <span style={statusBadgeStyle(info.color)}>{info.label}</span>;
}

const neutralBadge: React.CSSProperties = {
  ...badgeBase,
  backgroundColor: "var(--color-surface-secondary, #F3F4F6)",
  color: "var(--color-text-secondary)",
};

export function PolicyScopeBadge({ scopeType }: { scopeType: PricingPolicyScopeType }) {
  const info = POLICY_SCOPE_TYPES.find((s) => s.value === scopeType);
  if (!info) return <span style={neutralBadge}>—</span>;
  return <span style={neutralBadge}>{info.label}</span>;
}

export function PricingMethodBadge({ method }: { method: PricingMethod }) {
  const info = PRICING_METHODS.find((m) => m.value === method);
  if (!info) return <span style={neutralBadge}>—</span>;
  return <span style={neutralBadge}>{info.label}</span>;
}

export function CodeBadge({ code }: { code: string }) {
  return (
    <span
      style={{
        ...badgeBase,
        fontFamily: "var(--font-mono, monospace)",
        backgroundColor: "var(--color-surface-secondary, #F3F4F6)",
        color: "var(--color-text-secondary)",
      }}
    >
      {code}
    </span>
  );
}