import { useState } from "react";
import { COST_VERSION_STATUSES } from "@/types";
import type { CostTableWithSupplier } from "@/types";
import { useCostAuditLogs } from "../hooks/useCosts";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SimpleTabs, type TabItem } from "@/components/ui/Tabs";
import { DetailGrid, DetailField } from "@/components/ui/DetailGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Table } from "@/components/ui/Table";
import { AppIcon } from "@/layouts/app-shell/AppIcon";
import { formatDate } from "../utils/format";

interface Props {
  costTable: CostTableWithSupplier;
  onAction: (action: string) => void;
}

type TabKey = "geral" | "versions" | "history";

export function CostTableDetail({ costTable, onAction }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("geral");
  const versions = costTable.versions ?? [];

  const { logs, loading: logsLoading } = useCostAuditLogs(
    activeTab === "history" ? costTable.id : null
  );

  const geralPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-2)" }}>
      <section className="eg-section" aria-labelledby="dados-tabela">
        <h3 id="dados-tabela" className="eg-section__title">Dados da tabela</h3>
        <DetailGrid columns={2}>
          <DetailField label="Fornecedor" value={costTable.supplier?.legal_name} />
          <DetailField label="Código" value={costTable.code} mono />
          <DetailField label="Nome" value={costTable.name} />
          <DetailField label="Status" value={<StatusBadge status={costTable.status} />} />
          <DetailField label="Criado em" value={formatDate(costTable.created_at)} />
          <DetailField label="Atualizado em" value={formatDate(costTable.updated_at)} />
        </DetailGrid>
      </section>
      {costTable.description ? (
        <section className="eg-section" aria-labelledby="descricao-tabela">
          <h3 id="descricao-tabela" className="eg-section__title">Descrição</h3>
          <p style={{ margin: 0, color: "var(--md-sys-color-on-surface)" }}>{costTable.description}</p>
        </section>
      ) : null}
    </div>
  );

  const versionsPanel = versions.length === 0 ? (
    <EmptyState
      title="Nenhuma versão cadastrada"
      description="Crie a primeira versão desta tabela para registrar custos."
    />
  ) : (
    <Table caption="Versões da tabela de custo" captionHidden>
      <thead>
        <tr>
          <th style={{ textAlign: "left" }}>Versão</th>
          <th style={{ textAlign: "left" }}>Rótulo</th>
          <th style={{ textAlign: "left" }}>Vigência</th>
          <th style={{ textAlign: "left" }}>Aprovação / Publicação</th>
          <th style={{ textAlign: "left" }}>Status</th>
          <th style={{ textAlign: "right" }}><span className="sr-only">Ações</span></th>
        </tr>
      </thead>
      <tbody>
        {versions.map((version) => {
          const isCurrent = version.status === "active";
          return (
            <tr
              key={version.id}
              onClick={() => onAction(`version:${version.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onAction(`version:${version.id}`);
                }
              }}
              tabIndex={0}
              role="link"
              aria-label={`Ver versão ${version.version_number}${version.version_label ? ` — ${version.version_label}` : ""}`}
              style={{ cursor: "pointer" }}
            >
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--md-sys-spacing-2)" }}>
                  <span style={{ fontWeight: 600 }}>v{version.version_number}</span>
                  {isCurrent ? (
                    <Badge tone="info">Atual</Badge>
                  ) : null}
                </div>
              </td>
              <td style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>
                {version.version_label ?? "—"}
              </td>
              <td style={{ fontSize: "var(--md-sys-typescale-body-medium-size)" }}>
                {version.valid_from ? `${formatDate(version.valid_from)} — ${formatDate(version.valid_to)}` : "—"}
              </td>
              <td style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>
                {version.approved_by ? `Aprovado por ${version.approved_by.slice(0, 8)}` : ""}
                {version.approved_by && version.published_by ? " · " : ""}
                {version.published_by ? `Publicado por ${version.published_by.slice(0, 8)}` : ""}
                {!version.approved_by && !version.published_by ? "—" : ""}
              </td>
              <td><StatusBadge status={version.status} /></td>
              <td style={{ textAlign: "right", color: "var(--md-sys-color-on-surface-variant)" }} aria-hidden="true">
                <span className="eg-icon" data-size="small">
                  <AppIcon name="arrow-right" />
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );

  const historyPanel = logsLoading ? (
    <Spinner label="Carregando histórico..." />
  ) : logs.length === 0 ? (
    <EmptyState
      title="Nenhum registro de auditoria"
      description="Eventos de auditoria aparecerão aqui quando houver alterações."
    />
  ) : (
    <Table caption="Histórico de auditoria" captionHidden>
      <thead>
        <tr>
          <th style={{ textAlign: "left" }}>Ação</th>
          <th style={{ textAlign: "left" }}>Motivo</th>
          <th style={{ textAlign: "right" }}>Data</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id}>
            <td style={{ fontWeight: 500 }}>{log.action}</td>
            <td style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>
              {log.reason ?? "—"}
            </td>
            <td style={{ textAlign: "right", fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>
              {formatDate(log.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );

  const tabItems: TabItem[] = [
    { key: "geral", label: "Geral", panel: geralPanel },
    { key: "versions", label: `Versões (${versions.length})`, panel: versionsPanel },
    { key: "history", label: "Histórico", panel: historyPanel },
  ];

  // Silence unused warning when COST_VERSION_STATUSES is not directly referenced
  void COST_VERSION_STATUSES;

  return (
    <div>
      <SimpleTabs
        items={tabItems}
        defaultActiveKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        ariaLabel="Seções da tabela de custo"
      />
    </div>
  );
}
