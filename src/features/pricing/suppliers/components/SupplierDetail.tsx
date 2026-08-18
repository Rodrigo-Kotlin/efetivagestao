import { useState } from "react";
import { SUPPLIER_CATEGORIES, SUPPLIER_STATUSES } from "@/types";
import type { SupplierWithCompany, SupplierMappingWithCatalogItem } from "@/types";
import { MappingList } from "./MappingList";

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

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
  marginBottom: "var(--space-6)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--color-text-secondary)",
  marginBottom: "2px",
};

const valueStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--color-text)",
  fontWeight: "var(--font-medium)",
};

export function SupplierDetail({ supplier, mappings, onAction }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("geral");

  const catLabel = SUPPLIER_CATEGORIES.find((c) => c.value === supplier.supplier_category)?.label ?? supplier.supplier_category;
  const statusInfo = SUPPLIER_STATUSES.find((s) => s.value === supplier.status);
  const isBlocked = supplier.status === "blocked";
  const isActive = supplier.status === "active";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
            {supplier.company?.legal_name ?? "Fornecedor"}
          </h1>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <span style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-medium)",
              backgroundColor: "#EFF6FF",
              color: "#1E40AF",
            }}>
              {catLabel}
            </span>
            {statusInfo && (
              <span style={{
                display: "inline-block",
                padding: "2px 10px",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--font-medium)",
                backgroundColor: `${statusInfo.color}20`,
                color: statusInfo.color,
              }}>
                {statusInfo.label}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button
            onClick={() => onAction("edit")}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--color-primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
            }}
          >
            Editar
          </button>
          {isActive && (
            <button
              onClick={() => onAction("block")}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "transparent",
                color: "#EF4444",
                border: "1px solid #EF4444",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Bloquear
            </button>
          )}
          {isBlocked && (
            <button
              onClick={() => onAction("unblock")}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "transparent",
                color: "#10B981",
                border: "1px solid #10B981",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Desbloquear
            </button>
          )}
          {supplier.status !== "inactive" && (
            <button
              onClick={() => onAction("inactivate")}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Inativar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--color-border)", marginBottom: "var(--space-6)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "transparent",
              color: activeTab === tab.key ? "var(--color-primary)" : "var(--color-text-secondary)",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--color-primary)" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
              fontWeight: activeTab === tab.key ? "var(--font-semibold)" : "var(--font-medium)",
              marginBottom: "-2px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Geral */}
      {activeTab === "geral" && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", color: "var(--color-text)", marginBottom: "var(--space-4)" }}>
              Dados da Empresa
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
              <div>
                <p style={labelStyle}>Razão Social</p>
                <p style={valueStyle}>{supplier.company?.legal_name ?? "—"}</p>
              </div>
              <div>
                <p style={labelStyle}>Nome Fantasia</p>
                <p style={valueStyle}>{supplier.company?.trade_name ?? "—"}</p>
              </div>
              <div>
                <p style={labelStyle}>CNPJ/CPF</p>
                <p style={{ ...valueStyle, fontFamily: "monospace" }}>{supplier.company?.tax_id ?? "—"}</p>
              </div>
              <div>
                <p style={labelStyle}>Status da Empresa</p>
                <p style={valueStyle}>{supplier.company?.status ?? "—"}</p>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", color: "var(--color-text)", marginBottom: "var(--space-4)" }}>
              Perfil de Fornecedor
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
              <div>
                <p style={labelStyle}>Categoria</p>
                <p style={valueStyle}>{catLabel}</p>
              </div>
              <div>
                <p style={labelStyle}>Condições de Pagamento</p>
                <p style={valueStyle}>{supplier.payment_terms ?? "—"}</p>
              </div>
              <div>
                <p style={labelStyle}>Referência do Contrato</p>
                <p style={valueStyle}>{supplier.contract_reference ?? "—"}</p>
              </div>
              <div>
                <p style={labelStyle}>Observações</p>
                <p style={valueStyle}>{supplier.notes ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Mapeamentos */}
      {activeTab === "mappings" && (
        <MappingList
          mappings={mappings}
          onPreferred={(id) => onAction(`preferred:${id}`)}
          onInactivate={(id) => onAction(`inactivate_mapping:${id}`)}
        />
      )}

      {/* Tab: Histórico */}
      {activeTab === "history" && (
        <div style={cardStyle}>
          <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "var(--space-8) 0" }}>
            Histórico de auditoria
          </p>
        </div>
      )}
    </div>
  );
}
