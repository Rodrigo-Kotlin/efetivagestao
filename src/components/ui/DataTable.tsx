import { useCallback, useId, useMemo, type ReactNode } from "react";
import { cx } from "./cx";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** Render a cell value. Falls back to `String(row[key])`. */
  render?: (row: T, index: number) => ReactNode;
  /** Sort key override; when omitted, sorting is disabled for this column. */
  sortable?: boolean;
  /** Horizontal alignment for the cell. */
  align?: "left" | "right" | "center";
  /** Whether this column is a "priority" column shown in mobile card view. */
  priority?: boolean;
  /** Desktop-only: hide on mobile card layout. */
  cardLabel?: ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  /** Caption for the table. */
  caption: ReactNode;
  /* ---- Sorting ---- */
  sort?: { key: string; direction: "asc" | "desc" } | null;
  onSortChange?: (sort: { key: string; direction: "asc" | "desc" } | null) => void;
  /* ---- Pagination ---- */
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  /* ---- Selection ---- */
  selectedKeys?: Set<string>;
  onSelectionChange?: (selectedKeys: Set<string>) => void;
  /* ---- Density ---- */
  density?: "compact" | "comfortable";
  onDensityChange?: (density: "compact" | "comfortable") => void;
  /* ---- Loading / Empty ---- */
  loading?: boolean;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  /* ---- Row actions ---- */
  renderRowActions?: (row: T, index: number) => ReactNode;
  /* ---- Toolbar ---- */
  toolbar?: ReactNode;
  /* ---- Cards mode: when true, always render as cards ---- */
  cardsMode?: boolean;
  /* ---- Sticky header ---- */
  stickyHeader?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  caption,
  sort,
  onSortChange,
  page = 0,
  pageSize = 25,
  total,
  onPageChange,
  selectedKeys,
  onSelectionChange,
  density = "comfortable",
  loading = false,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription,
  renderRowActions,
  toolbar,
  cardsMode = false,
  stickyHeader = true,
  className,
}: DataTableProps<T>) {
  const captionId = useId();
  const effectiveTotal = total ?? data.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));

  /* ---- Sorting ---- */
  const handleSort = useCallback(
    (column: DataTableColumn<T>) => {
      if (!column.sortable || !onSortChange) return;
      if (sort?.key === column.key) {
        onSortChange(sort.direction === "asc" ? { key: column.key, direction: "desc" } : null);
      } else {
        onSortChange({ key: column.key, direction: "asc" });
      }
    },
    [sort, onSortChange],
  );

  /* ---- Selection ---- */
  const selectable = Boolean(selectedKeys && onSelectionChange);
  const visibleKeys = useMemo(() => data.map((row, i) => keyExtractor(row, i)), [data, keyExtractor]);
  const allSelected = selectable && visibleKeys.length > 0 && visibleKeys.every((k) => selectedKeys!.has(k));
  const someSelected = selectable && visibleKeys.some((k) => selectedKeys!.has(k));

  const toggleAll = useCallback(() => {
    if (!onSelectionChange || !selectedKeys) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(visibleKeys));
    }
  }, [allSelected, visibleKeys, onSelectionChange, selectedKeys]);

  const toggleRow = useCallback(
    (key: string) => {
      if (!onSelectionChange || !selectedKeys) return;
      const next = new Set(selectedKeys);
      if (next.has(key)) next.delete(key); else next.add(key);
      onSelectionChange(next);
    },
    [selectedKeys, onSelectionChange],
  );

  const hasSelection = selectable && selectedKeys && selectedKeys.size > 0;

  /* ---- Render helpers ---- */
  const renderCellValue = (row: T, col: DataTableColumn<T>, index: number): ReactNode => {
    if (col.render) return col.render(row, index);
    const val = (row as Record<string, unknown>)[col.key];
    return val == null ? null : String(val);
  };

  const priorityColumns = useMemo(() => columns.filter((c) => c.priority !== false).slice(0, 4), [columns]);

  /* ---- Loading skeleton rows ---- */
  const skeletonRows = useMemo(() => {
    if (!loading) return null;
    return Array.from({ length: 5 }, (_, i) => (
      <tr key={`skeleton-${i}`} aria-hidden="true">
        {selectable ? <td className="eg-data-table__checkbox-cell" /> : null}
        {columns.map((col) => (
          <td key={col.key}><span className="eg-skeleton" style={{ height: "1rem", width: `${40 + Math.random() * 40}%` }} /></td>
        ))}
        {renderRowActions ? <td className="eg-data-table__actions-cell" /> : null}
      </tr>
    ));
  }, [loading, columns, selectable, renderRowActions]);

  return (
    <div className={cx("eg-data-table", className)}>
      {toolbar ? <div className="eg-data-table__toolbar">{toolbar}</div> : null}

      {hasSelection ? (
        <div className="eg-data-table__selection-bar">
          <span className="eg-data-table__selection-bar-count">
            {selectedKeys!.size} selecionado{selectedKeys!.size > 1 ? "s" : ""}
          </span>
        </div>
      ) : null}

      {cardsMode ? (
        /* ---- Mobile card layout ---- */
        <div className="eg-data-table__cards" role="list" aria-label={String(caption)}>
          {data.map((row, index) => {
            const key = keyExtractor(row, index);
            return (
              <div className="eg-data-table__card" key={key} role="listitem">
                <div className="eg-data-table__card-header">
                  <span className="eg-data-table__card-title">
                    {priorityColumns[0] ? renderCellValue(row, priorityColumns[0], index) : key}
                  </span>
                  {priorityColumns[1] ? (
                    <span>{renderCellValue(row, priorityColumns[1], index)}</span>
                  ) : null}
                </div>
                <div className="eg-data-table__card-meta">
                  {priorityColumns.slice(2).map((col) => (
                    <span key={col.key}>
                      {col.cardLabel ? <>{col.cardLabel}: </> : null}
                      {renderCellValue(row, col, index)}
                    </span>
                  ))}
                </div>
                {renderRowActions ? (
                  <div className="eg-data-table__card-actions">
                    {renderRowActions(row, index)}
                  </div>
                ) : null}
              </div>
            );
          })}
          {data.length === 0 && !loading ? (
            <EmptyCardState title={emptyTitle} description={emptyDescription} />
          ) : null}
        </div>
      ) : (
        /* ---- Desktop table ---- */
        <div
          className="eg-table-container"
          role={columns.some((c) => c.sortable) ? "region" : undefined}
          aria-labelledby={columns.some((c) => c.sortable) ? captionId : undefined}
          tabIndex={columns.some((c) => c.sortable) ? 0 : undefined}
        >
          <table className="eg-table" data-density={density}>
            <caption id={captionId} className="sr-only">{caption}</caption>
            <thead className={stickyHeader ? "eg-table--sticky" : undefined}>
              <tr>
                {selectable ? (
                  <th className="eg-data-table__checkbox-cell">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll}
                      aria-label="Selecionar todos"
                    />
                  </th>
                ) : null}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={cx(col.sortable && "eg-data-table__sortable")}
                    style={col.align ? { textAlign: col.align } : undefined}
                    aria-sort={
                      sort?.key === col.key
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    onClick={col.sortable ? () => handleSort(col) : undefined}
                  >
                    {col.header}
                    {col.sortable ? (
                      <span className="eg-data-table__sort-indicator" data-active={sort?.key === col.key || undefined} aria-hidden="true">
                        {sort?.key === col.key && sort.direction === "desc" ? "\u2193" : "\u2191"}
                      </span>
                    ) : null}
                  </th>
                ))}
                {renderRowActions ? <th scope="col" className="eg-data-table__actions-cell"><span className="sr-only">Ações</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {skeletonRows}
              {!loading && data.length === 0 ? (
                <tr><td colSpan={columns.length + (selectable ? 1 : 0) + (renderRowActions ? 1 : 0)}>
                  <EmptyCardState title={emptyTitle} description={emptyDescription} />
                </td></tr>
              ) : null}
              {!loading && data.map((row, index) => {
                const key = keyExtractor(row, index);
                return (
                  <tr key={key} data-selected={selectable && selectedKeys?.has(key) || undefined}>
                    {selectable ? (
                      <td className="eg-data-table__checkbox-cell">
                        <input
                          type="checkbox"
                          checked={selectedKeys!.has(key)}
                          onChange={() => toggleRow(key)}
                          aria-label={`Selecionar linha ${index + 1}`}
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td key={col.key} style={col.align ? { textAlign: col.align } : undefined}>
                        {renderCellValue(row, col, index)}
                      </td>
                    ))}
                    {renderRowActions ? (
                      <td className="eg-data-table__actions-cell">
                        {renderRowActions(row, index)}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="eg-data-table__footer">
          <span className="eg-data-table__meta">
            {effectiveTotal} registro{effectiveTotal !== 1 ? "s" : ""}
          </span>
          <nav className="eg-pagination" aria-label="Paginação">
            <button
              type="button"
              className="eg-pagination__btn"
              disabled={page <= 0}
              onClick={() => onPageChange?.(page - 1)}
              aria-label="Página anterior"
            >
              {"\u2190"}
            </button>
            <PaginationPages current={page} total={totalPages} onPageChange={onPageChange} />
            <button
              type="button"
              className="eg-pagination__btn"
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange?.(page + 1)}
              aria-label="Próxima página"
            >
              {"\u2192"}
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pagination helpers                                                 */
/* ------------------------------------------------------------------ */

function PaginationPages({
  current,
  total,
  onPageChange,
}: {
  current: number;
  total: number;
  onPageChange?: (page: number) => void;
}) {
  const pages = useMemo(() => {
    const result: (number | "...")[] = [];
    if (total <= 7) {
      for (let i = 0; i < total; i++) result.push(i);
    } else {
      result.push(0);
      if (current > 3) result.push("...");
      for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
        result.push(i);
      }
      if (current < total - 4) result.push("...");
      result.push(total - 1);
    }
    return result;
  }, [current, total]);

  const id = useId();

  return (
    <>
      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`ellipsis-${i}`} className="eg-pagination__label">…</span>
        ) : (
          <button
            key={`${id}-${page}`}
            type="button"
            className="eg-pagination__btn"
            data-active={page === current || undefined}
            onClick={() => onPageChange?.(page)}
            aria-current={page === current ? "page" : undefined}
          >
            {page + 1}
          </button>
        ),
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state helper                                                 */
/* ------------------------------------------------------------------ */

function EmptyCardState({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="eg-empty-state" style={{ background: "transparent", borderStyle: "dashed" }}>
      <h3 className="eg-empty-state__title">{title}</h3>
      {description ? <p className="eg-empty-state__description">{description}</p> : null}
    </div>
  );
}
