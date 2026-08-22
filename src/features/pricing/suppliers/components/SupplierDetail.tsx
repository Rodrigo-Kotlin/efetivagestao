import { useState } from "react";
import { SUPPLIER_CATEGORIES } from "@/types";
import type { SupplierWithCompany, SupplierMappingWithCatalogItem } from "@/types";
import { MappingList } from "./MappingList";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";

interface Props {
  supplier: SupplierWithCompany;
  mappings: SupplierMappingWithCatalogItem[];
  onAction: (action: string) => void;
}

type Tab = "geral" | "mappings" | "history";

const tabs: { key: Tab; label: string }[] = [
  { key: "geral", label: "Geral" },
  { key: "mappings", label: "Mapeamentos" },
  { key: "history", label: "Histórico" },
];

export function SupplierDetail({ supplier, mappings, onAction }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("geral");
  const catLabel = SUPPLIER_CATEGORIES.find((c) => c.value === supplier.supplier_category)?.label ?? supplier.supplier_category;
  const isBlocked = supplier.status === "blocked";
  const isActive = supplier.status === "active";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--spacing-6)", flexWrap: "wrap", gap: "var(--spacing-4)" }}>
        <div style={{ display: "flex", gap: "var(--spacing-2)", flexWrap: "wrap" }}>
          <Badge tone="info">{catLabel}</Badge>
          <StatusBadge status={supplier.status} />
        </div>
        <div style={{ display: "flex", gap: "var(--spacing-2)", flexWrap: "wrap" }}>
          <Button variant="filled" size="compact" onClick={() => onAction("edit")}>Editar</Button>
          {isActive && <Button variant="outlined" size="compact" onClick={() => onAction("block")}>Bloquear</Button>}
          {isBlocked && <Button variant="outlined" size="compact" onClick={() => onAction("unblock")}>Desbloquear</Button>}
          {supplier.status !== "inactive" && <Button variant="outlined" size="compact" onClick={() => onAction("inactivate")}>Inativar</Button>}
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: "2px solid var(--color-border-default)", marginBottom: "var(--spacing-6)" }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: "var(--spacing-3) var(--spacing-4)", backgroundColor: "transparent", color: activeTab === tab.key ? "var(--color-primary)" : "var(--color-text-secondary)", border: "none", borderBottom: activeTab === tab.key ? "2px solid var(--color-primary)" : "2px solid transparent", cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: activeTab === tab.key ? 600 : 500, marginBottom: "-2px" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "geral" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-6)" }}>
          <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-6)" }}>
            <h3 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "var(--spacing-4)" }}>Dados da Empresa</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--spacing-4)" }}>
              <DetailField label="Razão Social" value={supplier.company?.legal_name ?? "—"} />
              <DetailField label="Nome Fantasia" value={supplier.company?.trade_name ?? "—"} />
              <DetailField label="CNPJ/CPF" value={supplier.company?.tax_id ?? "—"} mono />
              <DetailField label="Status da Empresa" value={supplier.company?.status ?? "—"} />
            </div>
          </div>
          <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-6)" }}>
            <h3 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "var(--spacing-4)" }}>Perfil de Fornecedor</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--spacing-4)" }}>
              <DetailField label="Categoria" value={catLabel} />
              <DetailField label="Condições de Pagamento" value={supplier.payment_terms ?? "—"} />
              <DetailField label="Referência do Contrato" value={supplier.contract_reference ?? "—"} />
              <DetailField label="Observações" value={supplier.notes ?? "—"} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "mappings" && (
        <MappingList mappings={mappings} onPreferred={(id) => onAction(`preferred:${id}`)} onInactivate={(id) => onAction(`inactivate_mapping:${id}`)} />
      )}

      {activeTab === "history" && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-8)", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>Histórico de auditoria</p>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-1)" }}>{label}</p>
      <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 500, fontFamily: mono ? "var(--font-family-mono)" : undefined }}>{value}</p>
    </div>
  );
}
