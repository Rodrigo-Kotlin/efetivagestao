import { useState } from "react";
import { useAliasMutations } from "../hooks/useAliases";
import { ALIAS_SOURCE_TYPES } from "@/types";
import type { CatalogItemAlias } from "@/types";

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

    setAdding(true);
    setError(null);

    try {
      await add(newName.trim(), sourceType);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar alias");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remover este nome alternativo?")) return;

    try {
      await remove(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover alias");
    }
  };

  return (
    <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)" }}>
      <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-4)" }}>
        Nomes Alternativos
      </h3>

      {error && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-4)", color: "#991B1B", fontSize: "var(--text-sm)" }}>
          {error}
        </div>
      )}

      {/* Existing aliases */}
      {displayAliases.length > 0 ? (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ textAlign: "left", padding: "var(--space-2)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Nome Original</th>
                <th style={{ textAlign: "left", padding: "var(--space-2)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Nome Normalizado</th>
                <th style={{ textAlign: "left", padding: "var(--space-2)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Origem</th>
                {canEdit && <th style={{ textAlign: "right", padding: "var(--space-2)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {displayAliases.map((alias) => (
                <tr key={alias.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "var(--space-2)" }}>{alias.original_name}</td>
                  <td style={{ padding: "var(--space-2)", fontFamily: "monospace", color: "var(--color-text-secondary)" }}>{alias.normalized_name}</td>
                  <td style={{ padding: "var(--space-2)" }}>
                    {ALIAS_SOURCE_TYPES.find((s) => s.value === alias.source_type)?.label ?? alias.source_type}
                  </td>
                  {canEdit && (
                    <td style={{ padding: "var(--space-2)", textAlign: "right" }}>
                      <button
                        onClick={() => void handleRemove(alias.id)}
                        style={{ padding: "2px 8px", backgroundColor: "transparent", color: "#DC2626", border: "1px solid #DC2626", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-xs)" }}
                      >
                        Remover
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
          Nenhum nome alternativo cadastrado.
        </p>
      )}

      {/* Add new alias */}
      {canEdit && (
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
              placeholder="Nome alternativo..."
              style={{
                flex: 1,
                minWidth: "150px",
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
              }}
            />
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
            >
              {ALIAS_SOURCE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={() => void handleAdd()}
              disabled={adding || !newName.trim()}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "var(--color-primary)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: adding || !newName.trim() ? "default" : "pointer",
                opacity: adding || !newName.trim() ? 0.7 : 1,
                fontSize: "var(--text-sm)",
              }}
            >
              {adding ? "Adicionando..." : "Adicionar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
