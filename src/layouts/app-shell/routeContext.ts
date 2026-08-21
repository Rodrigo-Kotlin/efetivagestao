interface RouteContext {
  section: string;
  page: string;
}

const PRICING_CONTEXTS: ReadonlyArray<[prefix: string, page: string]> = [
  ["/pricing/clients", "Clientes e preços específicos"],
  ["/pricing/commercial", "Tabelas comerciais"],
  ["/pricing/policies", "Políticas de preço"],
  ["/pricing/simulator", "Simulador de preço"],
  ["/pricing/suppliers", "Fornecedores"],
  ["/pricing/costs", "Custos"],
  ["/pricing/categories", "Categorias"],
  ["/pricing/catalog", "Catálogo mestre"],
];

export function getRouteContext(pathname: string): RouteContext {
  if (pathname === "/") return { section: "Efetiva Gestão", page: "Dashboard" };
  if (pathname === "/design-system") return { section: "Desenvolvimento", page: "Design system" };
  const pricingContext = PRICING_CONTEXTS.find(([prefix]) => pathname.startsWith(prefix));
  if (pricingContext) return { section: "Preços & Exames", page: pricingContext[1] };
  if (pathname.startsWith("/pricing")) return { section: "Efetiva Gestão", page: "Preços & Exames" };
  return { section: "Efetiva Gestão", page: "Área de trabalho" };
}
