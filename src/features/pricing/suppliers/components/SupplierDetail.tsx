import { useState } from "react";
import { SUPPLIER_CATEGORIES } from "@/types";
import type { SupplierWithCompany, SupplierMappingWithCatalogItem } from "@/types";
import { MappingList } from "./MappingList";
import { Button } from "@/components/ui/Button";
import { DropdownMenu, MenuItem } from "@/components/ui/DropdownMenu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { SimpleTabs, type TabItem } from "@/components/ui/Tabs";
import { DetailGrid, DetailField } from "@/components/ui/DetailGrid";
import { AppIcon } from "@/layouts/app-shell/AppIcon";

interface Props {
  supplier: SupplierWithCompany;
  mappings: SupplierMappingWithCatalogItem[];
  onAction: (action: string) => void;
}

type TabKey = "geral" | "mapeamentos" | "historico";

export function SupplierDetail({ supplier, mappings, onAction }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("geral");
  const catLabel = SUPPLIER_CATEGORIES.find((c) => c.value === supplier.supplier_category)?.label ?? supplier.supplier_category;
  const isBlocked = supplier.status === "blocked";
  const isActive = supplier.status === "active";
  const isInactive = supplier.status === "inactive";

  const tabItems: TabItem[] = [
    {
      key: "geral",
      label: "Geral",
      panel: (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-2)" }}>
          <section className="eg-section" aria-labelledby="empresa-section">
            <h3 id="empresa-section" className="eg-section__title">Dados da empresa</h3>
            <DetailGrid columns={2}>
              <DetailField label="Razão Social" value={supplier.company?.legal_name} />
              <DetailField label="Nome Fantasia" value={supplier.company?.trade_name} />
              <DetailField label="CNPJ/CPF" value={supplier.company?.tax_id} mono />
              <DetailField label="Status da Empresa" value={supplier.company?.status} />
            </DetailGrid>
          </section>

          <section className="eg-section" aria-labelledby="perfil-section">
            <h3 id="perfil-section" className="eg-section__title">Perfil do fornecedor</h3>
            <DetailGrid columns={2}>
              <DetailField label="Categoria" value={catLabel} />
              <DetailField label="Condições de Pagamento" value={supplier.payment_terms} />
              <DetailField label="Referência do Contrato" value={supplier.contract_reference} />
              <DetailField label="Observações" value={supplier.notes} span={2} />
            </DetailGrid>
          </section>
        </div>
      ),
    },
    {
      key: "mapeamentos",
      label: "Mapeamentos",
      panel: (
        <MappingList
          mappings={mappings}
          onPreferred={(id) => onAction(`preferred:${id}`)}
          onInactivate={(id) => onAction(`inactivate_mapping:${id}`)}
        />
      ),
    },
    {
      key: "historico",
      label: "Histórico",
      panel: (
        <section className="eg-section" aria-labelledby="historico-section">
          <h3 id="historico-section" className="eg-section__title">Histórico de auditoria</h3>
          <p style={{ color: "var(--md-sys-color-on-surface-variant)", fontSize: "var(--md-sys-typescale-body-medium-size)" }}>
            Nenhum evento registrado.
          </p>
        </section>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "var(--md-sys-spacing-5)",
          flexWrap: "wrap",
          gap: "var(--md-sys-spacing-3)",
        }}
      >
        <div className="eg-entity-chips">
          <Badge tone="info">{catLabel}</Badge>
          <StatusBadge status={supplier.status} />
        </div>
        <div style={{ display: "flex", gap: "var(--md-sys-spacing-2)", flexWrap: "wrap" }}>
          <Button
            variant="filled"
            size="compact"
            onClick={() => onAction("edit")}
            leadingIcon={
              <span className="eg-icon" data-size="small" data-tone="on-primary">
                <AppIcon name="edit" />
              </span>
            }
          >
            Editar
          </Button>
          {(isActive || isBlocked || !isInactive) ? (
            <DropdownMenu
              label="Mais ações"
              trigger={
                <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--md-sys-spacing-1)" }}>
                  <span className="eg-icon" data-size="small">
                    <AppIcon name="more" />
                  </span>
                  Mais
                </span>
              }
              align="end"
            >
              {isActive ? (
                <MenuItem onClick={() => onAction("block")}>
                  Bloquear
                </MenuItem>
              ) : null}
              {isBlocked ? (
                <MenuItem onClick={() => onAction("unblock")}>
                  Desbloquear
                </MenuItem>
              ) : null}
              {!isInactive ? (
                <MenuItem onClick={() => onAction("inactivate")}>
                  Inativar
                </MenuItem>
              ) : null}
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <SimpleTabs
        items={tabItems}
        defaultActiveKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        ariaLabel="Seções do fornecedor"
      />
    </div>
  );
}
