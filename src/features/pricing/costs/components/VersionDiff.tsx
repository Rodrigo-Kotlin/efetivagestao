import type { CostItem } from "@/types";

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

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
  marginBottom: "var(--space-6)",
};

const formatCurrency = (amount: number | null, currency: string = "BRL") => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amount);
};

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

  const getRowColor = (row: DiffRow): string | undefined => {
    if (row.changeType === "new") return "#F0FDF4";
    if (row.changeType === "removed") return "#FEF2F2";
    if (row.changeType === "unchanged") return undefined;
    if (row.absoluteDiff === null) return undefined;
    if (row.absoluteDiff < 0) return "#F0FDF4";
    if (row.absoluteDiff > 0) return "#FEF2F2";
    return undefined;
  };

  const getDiffColor = (row: DiffRow): string => {
    if (row.absoluteDiff === null) return "#6B7280";
    if (row.absoluteDiff < 0) return "#10B981";
    if (row.absoluteDiff > 0) return "#EF4444";
    return "#6B7280";
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", color: "var(--color-text)", marginBottom: "var(--space-4)" }}>
        Comparação de Versões
      </h3>

      {rows.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "var(--space-8) 0" }}>
          Nenhuma diferença encontrada.
        </p>
      ) : (
        <div style={{ display: "block", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Item</th>
                <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Custo Anterior</th>
                <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Custo Atual</th>
                <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Diferença</th>
                <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>%</th>
                <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowColor = getRowColor(row);
                const diffColor = getDiffColor(row);

                return (
                  <tr
                    key={row.catalogItemId}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                      backgroundColor: rowColor,
                    }}
                  >
                    <td style={{ padding: "var(--space-3)" }}>
                      <div style={{ fontWeight: "var(--font-medium)" }}>{row.catalogItemName}</div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                        {row.catalogItemCode}
                      </div>
                    </td>
                    <td style={{ padding: "var(--space-3)", textAlign: "right", fontFamily: "monospace" }}>
                      {formatCurrency(row.oldAmount)}
                    </td>
                    <td style={{ padding: "var(--space-3)", textAlign: "right", fontFamily: "monospace" }}>
                      {formatCurrency(row.newAmount)}
                    </td>
                    <td style={{ padding: "var(--space-3)", textAlign: "right", fontFamily: "monospace", color: diffColor, fontWeight: "var(--font-medium)" }}>
                      {row.absoluteDiff !== null
                        ? `${row.absoluteDiff >= 0 ? "+" : ""}${formatCurrency(row.absoluteDiff)}`
                        : "—"}
                    </td>
                    <td style={{ padding: "var(--space-3)", textAlign: "right", fontFamily: "monospace", color: diffColor, fontSize: "var(--text-xs)" }}>
                      {row.percentageDiff !== null
                        ? `${row.percentageDiff >= 0 ? "+" : ""}${row.percentageDiff.toFixed(1)}%`
                        : "—"}
                    </td>
                    <td style={{ padding: "var(--space-3)" }}>
                      {row.changeType === "new" && (
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", backgroundColor: "#DCFCE7", color: "#166534" }}>
                          Novo
                        </span>
                      )}
                      {row.changeType === "removed" && (
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", backgroundColor: "#FEE2E2", color: "#991B1B" }}>
                          Removido
                        </span>
                      )}
                      {row.changeType === "changed" && row.oldStatus !== row.newStatus && (
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", backgroundColor: "#FEF3C7", color: "#92400E" }}>
                          {row.oldStatus} → {row.newStatus}
                        </span>
                      )}
                      {row.changeType === "unchanged" && (
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", backgroundColor: "#E5E7EB", color: "#6B7280" }}>
                          Sem alteração
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
