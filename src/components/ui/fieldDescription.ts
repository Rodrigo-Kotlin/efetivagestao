import type { ReactNode } from "react";

export function fieldDescriptionId(
  id: string,
  error: ReactNode,
  supportingText: ReactNode,
  provided?: string
): string | undefined {
  return [provided, error ? `${id}-error` : supportingText ? `${id}-support` : null]
    .filter(Boolean)
    .join(" ") || undefined;
}
