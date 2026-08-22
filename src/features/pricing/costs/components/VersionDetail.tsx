import { COST_ITEM_STATUSES } from "@/types";
import type { CostTableVersionWithItems } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DetailGrid, DetailField } from "@/components/ui/DetailGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { formatCurrency, formatDate } from "../utils/format";

interface Props {
  version: CostTableVersionWithItems;
  onAction: (action: string) => void;
  permissions?: {
    canSubmit?: boolean;
    canApprove?: boolean;
    canPublish?: boolean;
  };
}

export function VersionDetail({ version, onAction, permissions = {} }: Props) {
  const { canSubmit = false, canApprove = false, canPublish = false } = permissions;
  const isDraft = version.status === "draft";
  const isUnderReview = version.status === "under_review";
  const isApproved = version.status === "approved";
  const isTerminal = ["scheduled", "active", "superseded", "cancelled"].includes(version.status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-5)" }}>
      <div className="eg-entity-chips">
        <StatusBadge status={version.status} />
        {version.status === "active" ? <Badge tone="info">Atual</Badge> : null}
        {version.valid_from ? (
          <Badge tone="neutral">
            {formatDate(version.valid_from)} — {formatDate(version.valid_to)}
          </Badge>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: "var(--md-sys-spacing-2)", flexWrap: "wrap" }}>
        {isDraft && canSubmit ? (
          <Button variant="filled" onClick={() => onAction("submit")}>
            Enviar para revisão
          </Button>
        ) : null}
        {isUnderReview && canApprove ? (
          <Button variant="filled" onClick={() => onAction("approve")}>
            Aprovar
          </Button>
        ) : null}
        {isApproved && canPublish ? (
          <Button variant="filled" onClick={() => onAction("publish")}>
            Publicar
          </Button>
        ) : null}
        {!isTerminal ? (
          <Button variant="outlined" onClick={() => onAction("compare")}>
            Comparar com versão anterior
          </Button>
        ) : null}
      </div>

      <section className="eg-section" aria-labelledby="version-metadata">
        <h3 id="version-metadata" className="eg-section__title">Metadados</h3>
        <DetailGrid columns={3}>
          <DetailField label="Data de origem" value={formatDate(version.source_date)} />
          <DetailField label="Itens" value={version.items?.length ?? 0} />
          <DetailField label="Criado por" value={version.created_by?.slice(0, 8)} mono />
          <DetailField label="Aprovado por" value={version.approved_by?.slice(0, 8)} mono />
          <DetailField label="Publicado por" value={version.published_by?.slice(0, 8)} mono />
          <DetailField label="Observações" value={version.notes} span={3} />
        </DetailGrid>
      </section>

      <section className="eg-section" aria-labelledby="version-items">
        <h3 id="version-items" className="eg-section__title">{`Itens (${version.items.length})`}</h3>
        {version.items.length === 0 ? (
          <EmptyState
            title="Nenhum item nesta versão"
            description="Adicione itens para registrar os custos desta versão."
          />
        ) : (
          <Table caption="Itens da versão" captionHidden>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Código Efetiva</th>
                <th style={{ textAlign: "left" }}>Código Fornecedor</th>
                <th style={{ textAlign: "left" }}>Status Custo</th>
                <th style={{ textAlign: "right" }}>Custo</th>
                <th style={{ textAlign: "left" }}>Moeda</th>
                <th style={{ textAlign: "left" }}>Observação</th>
              </tr>
            </thead>
            <tbody>
              {version.items.map((item) => {
                const costStatus = COST_ITEM_STATUSES.find((s) => s.value === item.cost_status);
                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--md-sys-typescale-body-medium-size)" }}>
                      {item.catalog_item_id?.slice(0, 8) ?? "—"}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--md-sys-typescale-body-medium-size)" }}>
                      {item.supplier_catalog_item_id?.slice(0, 8) ?? "—"}
                    </td>
                    <td>
                      {costStatus ? (
                        <Badge tone={
                          item.cost_status === "confirmed_zero" || item.cost_status === "provided" ? "positive"
                          : item.cost_status === "discontinued" ? "negative"
                          : item.cost_status === "awaiting_quote" ? "warning"
                          : "neutral"
                        }>
                          {costStatus.label}
                        </Badge>
                      ) : (
                        <Badge>{item.cost_status}</Badge>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                      {formatCurrency(item.amount, item.currency_code)}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{item.currency_code}</td>
                    <td style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)", maxWidth: "16rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.notes ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
