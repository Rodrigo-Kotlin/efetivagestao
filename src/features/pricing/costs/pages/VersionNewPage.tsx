import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createCostTableVersion, createCostItems, fetchCostTable } from "../api/costs";
import { CostItemForm } from "../components/CostItemForm";
import type { CostTableWithSupplier, CostItemInsert } from "@/types";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { activeOrganization, user } = useAuth();
  const navigate = useNavigate();

  const [costTable, setCostTable] = useState<CostTableWithSupplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [label, setLabel] = useState("");
  const [sourceDate, setSourceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<CostItemInsert[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const orgId = activeOrganization?.id;
  const userId = user?.id;

  useEffect(() => {
    if (!id || !orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchCostTable(id, orgId)
      .then((data) => {
        if (!cancelled) {
          if (!data) {
            setError("Tabela de custo não encontrada");
          } else {
            setCostTable(data);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar tabela");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, orgId]);

  const handleAddItem = (data: CostItemInsert) => {
    setItems((prev) => [...prev, data]);
    setShowItemForm(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !orgId || !userId) return;

    setError(null);

    if (!validFrom) {
      setError("Informe a data de início da vigência");
      return;
    }
    if (!validTo) {
      setError("Informe a data de término da vigência");
      return;
    }

    setSaving(true);
    try {
      const latestVersion = costTable?.versions?.length
        ? Math.max(...costTable.versions.map((v) => v.version_number))
        : 0;

      const version = await createCostTableVersion(
        {
          cost_table_id: id,
          version_number: latestVersion + 1,
          version_label: label.trim() || null,
          valid_from: validFrom,
          valid_to: validTo || null,
          source_date: sourceDate || null,
          notes: notes.trim() || null,
        },
        orgId,
        userId
      );

      if (items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          ...item,
          cost_table_version_id: version.id,
        }));
        await createCostItems(itemsToInsert, orgId, userId);
      }

      navigate(`/pricing/costs/versions/${version.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar versão");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "var(--space-2) var(--space-3)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--text-sm)",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "var(--text-xs)",
    color: "var(--color-text-secondary)",
    marginBottom: "4px",
  };

  if (loading) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Carregando tabela de custo...
      </div>
    );
  }

  if (error && !costTable) {
    return (
      <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
        <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>{error}</p>
        <button
          onClick={() => navigate("/pricing/costs")}
          style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}
        >
          Voltar
        </button>
      </div>
    );
  }

  const nextVersion = costTable?.versions?.length
    ? Math.max(...costTable.versions.map((v) => v.version_number)) + 1
    : 1;

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
          Nova Versão — {costTable?.name ?? ""}
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          Versão {nextVersion} — {costTable?.code}
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)}>
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", color: "var(--color-text)", marginBottom: "var(--space-4)" }}>
            Dados da Versão
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div>
              <label style={labelStyle}>Vigência Início *</label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Vigência Fim *</label>
              <input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Rótulo da Versão</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Reajuste Jan/2026"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Data de Origem</label>
              <input
                type="date"
                value={sourceDate}
                onChange={(e) => setSourceDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <label style={labelStyle}>Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Observações sobre esta versão..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </div>

        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
            <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", color: "var(--color-text)" }}>
              Itens ({items.length})
            </h3>
            <button
              type="button"
              onClick={() => setShowItemForm(true)}
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
              Adicionar Item
            </button>
          </div>

          {showItemForm && costTable?.supplier_company_id && (
            <CostItemForm
              supplierCompanyId={costTable.supplier_company_id}
              onSave={handleAddItem}
              onCancel={() => setShowItemForm(false)}
            />
          )}

          {items.length > 0 ? (
            <div style={{ display: "block", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                    <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Item Catálogo</th>
                    <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Status</th>
                    <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Custo</th>
                    <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Moeda</th>
                    <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--color-text-secondary)", fontWeight: "var(--font-medium)" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "var(--space-3)", fontFamily: "monospace" }}>
                        {item.catalog_item_id.slice(0, 8)}
                      </td>
                      <td style={{ padding: "var(--space-3)" }}>{item.cost_status}</td>
                      <td style={{ padding: "var(--space-3)", textAlign: "right", fontFamily: "monospace" }}>
                        {item.amount != null ? `R$ ${Number(item.amount).toFixed(2)}` : "—"}
                      </td>
                      <td style={{ padding: "var(--space-3)", fontFamily: "monospace" }}>{item.currency_code}</td>
                      <td style={{ padding: "var(--space-3)", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          style={{ padding: "4px 8px", backgroundColor: "transparent", color: "#EF4444", border: "1px solid #EF4444", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-xs)" }}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "var(--space-8) 0" }}>
              Nenhum item adicionado. Clique em "Adicionar Item" para começar.
            </p>
          )}
        </div>

        {error && (
          <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            <p style={{ color: "#991B1B", fontSize: "var(--text-sm)" }}>{error}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--color-primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
            }}
          >
            {saving ? "Salvando..." : "Criar Versão"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/pricing/costs/${id}`)}
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
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export function VersionNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
