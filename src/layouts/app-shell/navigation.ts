import type { AppIconName } from "./AppIcon";

export interface AppNavigationItem {
  label: string;
  path?: string;
  icon?: AppIconName;
  permissions?: readonly string[];
  available: boolean;
  placement: "primary" | "utility";
}

const PRICING_PERMISSIONS = [
  "pricing.catalog.view",
  "pricing.supplier.view",
  "pricing.cost.view",
  "pricing.policy.view",
  "pricing.calculate",
  "pricing.commercial.view",
  "pricing.client.view",
] as const;

export const APP_NAVIGATION: readonly AppNavigationItem[] = [
  { label: "Dashboard", path: "/", icon: "dashboard", available: true, placement: "primary" },
  { label: "Clientes & CRM", available: false, placement: "primary" },
  { label: "Comercial", available: false, placement: "primary" },
  {
    label: "Preços & Exames",
    path: "/pricing",
    icon: "pricing",
    permissions: PRICING_PERMISSIONS,
    available: true,
    placement: "primary",
  },
  { label: "Clínica", available: false, placement: "primary" },
  { label: "Operações", available: false, placement: "primary" },
  { label: "Financeiro", available: false, placement: "primary" },
  { label: "SST", available: false, placement: "primary" },
  { label: "RH", available: false, placement: "primary" },
  { label: "Administrativo", available: false, placement: "primary" },
  { label: "Documentos", available: false, placement: "primary" },
  { label: "BI & Indicadores", available: false, placement: "primary" },
  { label: "Configurações", available: false, placement: "utility" },
];

export function getVisibleNavigation(can: (permission: string) => boolean) {
  return APP_NAVIGATION.filter((item) => {
    if (!item.available || !item.path) return false;
    return !item.permissions || item.permissions.some(can);
  });
}
