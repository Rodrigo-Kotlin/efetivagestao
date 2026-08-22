import type { SupplierMappingWithCatalogItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";

interface Props {
  mappings: SupplierMappingWithCatalogItem[];
  onPreferred?: (id: string) => void;
  onInactivate?: (id: string) => void;
  loading?: boolean;
}

export function MappingList({ mappings, onPreferred, onInactivate, loading }: Props) {
  if (loading) return <Spinner label="Carregando mapeamentos..." />;
  if (mappings.length === 0) {
    return <EmptyState title="Nenhum mapeamento cadastrado para este fornecedor." description="Vincule itens do catálogo a este fornecedor." />;
  }

  const formatDate = (val: string | null) => {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("pt-BR");
  };

  return (
    <Table caption="Mapeamentos do fornecedor" captionHidden>
      <thead>
        <tr>
          {["Item Efetiva", "Código Externo", "Descrição Externa", "Unidade", "Preferencial", "Status", "Vigência", "Ações"].map((h) => (
            <th key={h} style={{ textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {mappings.map((m) => {
          const validFrom = formatDate(m.valid_from);
          const validTo = formatDate(m.valid_to);
          const validity = validFrom !== "—" || validTo !== "—" ? `${validFrom} — ${validTo}` : "—";
          return (
            <tr key={m.id}>
              <td style={{ fontWeight: 500 }}>{m.catalog_item?.name ?? "—"}</td>
              <td style={{ fontFamily: "var(--font-family-mono)" }}>{m.external_code ?? "—"}</td>
              <td>{m.external_name ?? "—"}</td>
              <td>{m.external_unit ?? "—"}</td>
              <td style={{ textAlign: "center" }}>
                {m.is_preferred ? <span style={{ color: "var(--color-warning)" }} title="Preferencial">★</span> : <span style={{ color: "var(--color-border-default)" }}>☆</span>}
              </td>
              <td><StatusBadge status={m.status} /></td>
              <td style={{ whiteSpace: "nowrap" }}>{validity}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
                  {!m.is_preferred && m.status === "active" && onPreferred && (
                    <Button variant="outlined" size="compact" onClick={() => onPreferred(m.id)}>Preferencial</Button>
                  )}
                  {m.status === "active" && onInactivate && (
                    <Button variant="text" size="compact" onClick={() => onInactivate(m.id)}>Inativar</Button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
