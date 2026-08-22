import type { CostItem } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { formatCurrency, formatSignedDiff } from "../utils/format";

interface VersionDiffProps {
  oldItems: CostItem[];
  newItems: CostItem[];
}

interface DiffRow {
  catalogItemId: string;
  catalogItemName: string;
  catalogItemCode: string;
  oldAmount: number | null;
  newAmount: number | null;
  oldStatus: string;
  newStatus: string;
  changeType: "changed" | "unchanged" | "new" | "removed";
  absoluteDiff: number | null;
  percentageDiff: number | null;
}

function computeDiff(oldItems: CostItem[], newItems: CostItem[]): DiffRow[] {
  const oldMap = new Map<string, CostItem>();
  for (const item of oldItems) {
    oldMap.set(item.catalog_item_id, item);
  }

  const newMap = new Map<string, CostItem>();
  for (const item of newItems) {
    newMap.set(item.catalog_item_id, item);
  }

  const rows: DiffRow[] = [];
  const processed = new Set<string>();

  for (const newItem of newItems) {
    const key = newItem.catalog_item_id;
    processed.add(key);

    const oldItem = oldMap.get(key);

    if (!oldItem) {
      rows.push({
        catalogItemId: key,
        catalogItemName: (newItem as CostItem & { catalog_item?: { name?: string; code?: string } }).catalog_item?.name ?? "—",
        catalogItemCode: (newItem as CostItem & { catalog_item?: { name?: string; code?: string } }).catalog_item?.code ?? "—",
        oldAmount: null,
        newAmount: newItem.amount,
        oldStatus: "",
        newStatus: newItem.cost_status,
        changeType: "new",
        absoluteDiff: null,
        percentageDiff: null,
      });
      continue;
    }

    const absoluteDiff =
      newItem.amount !== null && oldItem.amount !== null
        ? newItem.amount - oldItem.amount
        : null;

    let percentageDiff: number | null = null;
    if (absoluteDiff !== null && oldItem.amount !== 0 && oldItem.amount !== null) {
      percentageDiff = (absoluteDiff / oldItem.amount) * 100;
    }

    const statusChanged = newItem.cost_status !== oldItem.cost_status;
    const amountChanged = newItem.amount !== oldItem.amount;
    const changeType = statusChanged || amountChanged ? "changed" : "unchanged";

    rows.push({
      catalogItemId: key,
      catalogItemName: (newItem as CostItem & { catalog_item?: { name?: string; code?: string } }).catalog_item?.name ?? "—",
      catalogItemCode: (newItem as CostItem & { catalog_item?: { name?: string; code?: string } }).catalog_item?.code ?? "—",
      oldAmount: oldItem.amount,
      newAmount: newItem.amount,
      oldStatus: oldItem.cost_status,
      newStatus: newItem.cost_status,
      changeType,
      absoluteDiff,
      percentageDiff,
    });
  }

  for (const oldItem of oldItems) {
    if (!processed.has(oldItem.catalog_item_id)) {
      rows.push({
        catalogItemId: oldItem.catalog_item_id,
        catalogItemName: (oldItem as CostItem & { catalog_item?: { name?: string; code?: string } }).catalog_item?.name ?? "—",
        catalogItemCode: (oldItem as CostItem & { catalog_item?: { name?: string; code?: string } }).catalog_item?.code ?? "—",
        oldAmount: oldItem.amount,
        newAmount: null,
        oldStatus: oldItem.cost_status,
        newStatus: "",
        changeType: "removed",
        absoluteDiff: null,
        percentageDiff: null,
      });
    }
  }

  return rows;
}

export function VersionDiff({ oldItems, newItems }: VersionDiffProps) {
  const rows = computeDiff(oldItems, newItems);

  return (
    <section className="eg-section" aria-labelledby="version-diff">
      <h3 id="version-diff" className="eg-section__title">Comparação de versões</h3>
      {rows.length === 0 ? (
        <EmptyState
          title="Nenhuma diferença encontrada"
          description="As duas versões possuem o mesmo conteúdo."
        />
      ) : (
        <Table caption="Comparação de itens entre versões" captionHidden>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Item</th>
              <th style={{ textAlign: "right" }}>Custo Anterior</th>
              <th style={{ textAlign: "right" }}>Custo Atual</th>
              <th style={{ textAlign: "right" }}>Diferença</th>
              <th style={{ textAlign: "right" }}>%</th>
              <th style={{ textAlign: "left" }}>Alteração</th>
              <th style={{ textAlign: "left" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.catalogItemId}>
                <td>
                  <div style={{ fontWeight: 500 }}>{row.catalogItemName}</div>
                  <div style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)", fontFamily: "var(--font-mono)" }}>
                    {row.catalogItemCode}
                  </div>
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {formatCurrency(row.oldAmount)}
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {formatCurrency(row.newAmount)}
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
                  {formatSignedDiff(row.absoluteDiff)}
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "var(--md-sys-typescale-body-medium-size)" }}>
                  {row.percentageDiff !== null
                    ? `${row.percentageDiff >= 0 ? "+" : ""}${row.percentageDiff.toFixed(1)}%`
                    : "—"}
                </td>
                <td>
                  <Badge tone={diffTone(row)}>
                    {diffLabel(row)}
                  </Badge>
                </td>
                <td style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>
                  {row.changeType === "changed" && row.oldStatus !== row.newStatus
                    ? `${row.oldStatus} → ${row.newStatus}`
                    : row.newStatus || row.oldStatus || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}

function diffLabel(row: DiffRow): string {
  switch (row.changeType) {
    case "new": return "Novo";
    case "removed": return "Removido";
    case "unchanged": return "Sem alteração";
    case "changed":
      return row.absoluteDiff === null ? "Alterado" : row.absoluteDiff < 0 ? "Reduzido" : row.absoluteDiff > 0 ? "Aumentado" : "Alterado";
  }
}

function diffTone(row: DiffRow): "positive" | "negative" | "warning" | "neutral" | "info" {
  switch (row.changeType) {
    case "new": return "info";
    case "removed": return "negative";
    case "unchanged": return "neutral";
    case "changed":
      return row.absoluteDiff === null ? "warning" : row.absoluteDiff < 0 ? "positive" : row.absoluteDiff > 0 ? "warning" : "neutral";
  }
}
