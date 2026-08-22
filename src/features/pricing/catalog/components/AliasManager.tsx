import { useState } from "react";
import { useAliasMutations } from "../hooks/useAliases";
import { ALIAS_SOURCE_TYPES } from "@/types";
import type { CatalogItemAlias } from "@/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Table } from "@/components/ui/Table";

interface AliasManagerProps {
  itemId: string;
  aliases: CatalogItemAlias[];
  canEdit: boolean;
}

export function AliasManager({ itemId, aliases: initialAliases, canEdit }: AliasManagerProps) {
  const { aliases, setInitial, add, remove } = useAliasMutations(itemId);
  const [newName, setNewName] = useState("");
  const [sourceType, setSourceType] = useState("manual");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (aliases.length === 0 && initialAliases.length > 0 && aliases.length === 0) {
    setInitial(initialAliases);
  }

  const displayAliases = aliases.length > 0 ? aliases : initialAliases;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true); setError(null);
    try { await add(newName.trim(), sourceType); setNewName(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Erro ao adicionar alias"); }
    finally { setAdding(false); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remover este nome alternativo?")) return;
    try { await remove(id); }
    catch (err) { setError(err instanceof Error ? err.message : "Erro ao remover alias"); }
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "var(--spacing-2) var(--spacing-3)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", boxSizing: "border-box" };

  return (
    <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-6)" }}>
      <h3 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "var(--spacing-4)" }}>Nomes Alternativos</h3>

      {error && <Alert tone="negative">{error}</Alert>}

      {displayAliases.length > 0 ? (
        <Table caption="Nomes alternativos do item" captionHidden>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Nome Original</th>
              <th style={{ textAlign: "left" }}>Nome Normalizado</th>
              <th style={{ textAlign: "left" }}>Origem</th>
              {canEdit && <th style={{ textAlign: "right" }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {displayAliases.map((alias) => (
              <tr key={alias.id}>
                <td>{alias.original_name}</td>
                <td style={{ fontFamily: "var(--font-family-mono)", color: "var(--color-text-secondary)" }}>{alias.normalized_name}</td>
                <td>{ALIAS_SOURCE_TYPES.find((s) => s.value === alias.source_type)?.label ?? alias.source_type}</td>
                {canEdit && (
                  <td style={{ textAlign: "right" }}>
                    <Button variant="text" size="compact" onClick={() => void handleRemove(alias.id)}>Remover</Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", marginBottom: "var(--spacing-4)" }}>Nenhum nome alternativo cadastrado.</p>
      )}

      {canEdit && (
        <div style={{ borderTop: "1px solid var(--color-border-default)", paddingTop: "var(--spacing-4)" }}>
          <div style={{ display: "flex", gap: "var(--spacing-3)", flexWrap: "wrap" }}>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handleAdd()} placeholder="Nome alternativo..." style={{ flex: 1, minWidth: "150px", ...inputStyle }} />
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} style={{ padding: "var(--spacing-2) var(--spacing-3)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)" }}>
              {ALIAS_SOURCE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <Button variant="filled" size="compact" onClick={() => void handleAdd()} disabled={adding || !newName.trim()}>
              {adding ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
