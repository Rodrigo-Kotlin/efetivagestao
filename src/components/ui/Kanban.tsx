import type { ReactNode } from "react";
import { cx } from "./cx";

export interface KanbanCard {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  owner?: ReactNode;
  value?: ReactNode;
  footer?: ReactNode;
}

export interface KanbanColumn {
  key: string;
  title: ReactNode;
  count?: number;
  totalValue?: ReactNode;
  cards: KanbanCard[];
  renderCard?: (card: KanbanCard) => ReactNode;
}

export interface KanbanProps {
  columns: KanbanColumn[];
  className?: string;
}

export function Kanban({ columns, className }: KanbanProps) {
  return (
    <div className={cx("eg-kanban", className)} role="list" aria-label="Quadro Kanban">
      {columns.map((column) => (
        <KanbanColumnView key={column.key} column={column} />
      ))}
    </div>
  );
}

function KanbanColumnView({ column }: { column: KanbanColumn }) {
  return (
    <section className="eg-kanban__column" role="listitem" aria-label={String(column.title)}>
      <div className="eg-kanban__column-header">
        <span className="eg-kanban__column-title">{column.title}</span>
        {column.count != null ? (
          <span className="eg-kanban__column-count">{column.count}</span>
        ) : null}
        {column.totalValue != null ? (
          <span className="eg-kanban__column-value">{column.totalValue}</span>
        ) : null}
      </div>
      <div className="eg-kanban__cards">
        {column.cards.map((card) =>
          column.renderCard ? (
            <div key={card.id} role="listitem">
              {column.renderCard(card)}
            </div>
          ) : (
            <KanbanCardView key={card.id} card={card} />
          ),
        )}
      </div>
    </section>
  );
}

function KanbanCardView({ card }: { card: KanbanCard }) {
  return (
    <div className="eg-kanban__card" role="listitem">
      <div className="eg-kanban__card-title">{card.title}</div>
      {card.meta ? <div className="eg-kanban__card-meta">{card.meta}</div> : null}
      {card.owner || card.value || card.footer ? (
        <div className="eg-kanban__card-footer">
          {card.owner}
          {card.footer}
          {card.value}
        </div>
      ) : null}
    </div>
  );
}
