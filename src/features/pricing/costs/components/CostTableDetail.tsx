import { useState } from "react";
import { COST_TABLE_STATUSES, COST_VERSION_STATUSES } from "@/types";
import type { CostTableWithSupplier } from "@/types";
import { useCostAuditLogs } from "../hooks/useCosts";

interface Props {
  costTable: CostTableWithSupplier;
  onAction: (action: string) => void;
}

type Tab = "geral" | "versions" | "history";

const tabs: { key: Tab; label: string }[] = [
  { key: "geral", label: "Geral" },
  { key: "versions", label: "Versões" },
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

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
};

export function CostTableDetail({ costTable, onAction }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("geral");

  const statusInfo = COST_TABLE_STATUSES.find((s) => s.value === costTable.status);
  const isActive = costTable.status === "active";
  const isArchived = costTable.status === "archived";
  const versions = costTable.versions ?? [];

  const { logs, loading: logsLoading } = useCostAuditLogs(
    activeTab === "history" ? costTable.id : null
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
            {costTable.name}
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
              {costTable.code}
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
            onClick={() => onAction("new_version")}
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
            Nova Versão
          </button>
          {isActive && (
            <button
              onClick={() => onAction("inactivate")}
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
              Inativar
            </button>
          )}
          {!isActive && !isArchived && (
            <button
              onClick={() => onAction("activate")}
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
              Ativar
            </button>
          )}
          {!isArchived && (
            <button
              onClick={() => onAction("archive")}
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
              Arquivar
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
              Dados da Tabela
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
              <div>
                <p style={labelStyle}>Fornecedor</p>
                <p style={valueStyle}>{costTable.supplier?.company?.legal_name ?? "—"}</p>
              </div>
              <div>
                <p style={labelStyle}>Código</p>
                <p style={{ ...valueStyle, fontFamily: "monospace" }}>{costTable.code}</p>
              </div>
              <div>
                <p style={labelStyle}>Nome</p>
                <p style={valueStyle}>{costTable.name}</p>
              </div>
              <div>
                <p style={labelStyle}>Status</p>
                <p style={valueStyle}>{statusInfo?.label ?? costTable.status}</p>
              </div>
              <div>
                <p style={labelStyle}>Criado em</p>
                <p style={valueStyle}>{formatDate(costTable.created_at)}</p>
              </div>
              <div>
                <p style={labelStyle}>Atualizado em</p>
                <p style={valueStyle}>{formatDate(costTable.updated_at)}</p>
              </div>
            </div>
            {costTable.description && (
              <div style={{ marginTop: "var(--space-4)" }}>
                <p style={labelStyle}>Descrição</p>
                <p style={valueStyle}>{costTable.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Versões */}
      {activeTab === "versions" && (
        <div>
          {versions.length === 0 ? (
            <div style={cardStyle}>
              <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "var(--space-8) 0" }}>
                Nenhuma versão cadastrada.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {versions.map((version) => {
                const vStatus = COST_VERSION_STATUSES.find((s) => s.value === version.status);
                const isCurrent = version.status === 'active';

                return (
                  <div
                    key={version.id}
                    style={{
                      ...cardStyle,
                      marginBottom: 0,
                      cursor: "pointer",
                      borderColor: isCurrent ? "var(--color-primary)" : undefined,
                    }}
                    onClick={() => onAction(`version:${version.id}`)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-text)" }}>
                          v{version.version_number}
                        </span>
                        {version.version_label && (
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                            {version.version_label}
                          </span>
                        )}
                        {isCurrent && (
                          <span style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--font-medium)",
                            backgroundColor: "#EFF6FF",
                            color: "#1E40AF",
                          }}>
                            Atual
                          </span>
                        )}
                        {vStatus && (
                          <span style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--font-medium)",
                            backgroundColor: `${vStatus.color}20`,
                            color: vStatus.color,
                          }}>
                            {vStatus.label}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                        {version.valid_from && (
                          <span>{formatDate(version.valid_from)} — {formatDate(version.valid_to)}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {version.approved_by && <span>Aprovado por {version.approved_by.slice(0, 8)}</span>}
                      {version.published_by && <span>Publicado por {version.published_by.slice(0, 8)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Histórico */}
      {activeTab === "history" && (
        <div style={cardStyle}>
          {logsLoading ? (
            <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "var(--space-8) 0" }}>
              Carregando histórico...
            </p>
          ) : logs.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "var(--space-8) 0" }}>
              Nenhum registro de auditoria encontrado.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {logs.map((log) => (
                <div key={log.id} style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}>{log.action}</span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  {log.reason && (
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
                      {log.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
