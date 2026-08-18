import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/core/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createCostTable } from "../api/costs";
import { supabase } from "@/lib/supabase";
import type { SupplierWithCompany } from "@/types";

function Inner() {
  const navigate = useNavigate();
  const { activeOrganization, user } = useAuth();
  const orgId = activeOrganization?.id;
  const userId = user?.id;

  const [supplierSearch, setSupplierSearch] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierWithCompany[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    if (!orgId) return;
    setSuppliersLoading(true);
    try {
      let query = supabase
        .from("supplier_profiles")
        .select("*, company:companies(*)")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (supplierSearch) {
        query = query.or(
          `company->>legal_name.ilike.%${supplierSearch}%,company->>trade_name.ilike.%${supplierSearch}%`
        );
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      setSuppliers((data ?? []) as unknown as SupplierWithCompany[]);
    } catch {
      setSuppliers([]);
    } finally {
      setSuppliersLoading(false);
    }
  }, [orgId, supplierSearch]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !userId) return;

    setError(null);

    if (!selectedSupplierId) {
      setError("Selecione um fornecedor");
      return;
    }
    if (!code.trim()) {
      setError("Informe o código da tabela");
      return;
    }
    if (!name.trim()) {
      setError("Informe o nome da tabela");
      return;
    }

    setSaving(true);
    try {
      const result = await createCostTable(
        {
          supplier_company_id: selectedSupplierId,
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || null,
        },
        orgId,
        userId
      );
      navigate(`/pricing/costs/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar tabela de custo");
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

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
          Nova Tabela de Custo
        </h1>
      </div>

      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)", maxWidth: "640px" }}>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <label style={labelStyle}>Fornecedor *</label>
            <input
              type="text"
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              placeholder="Buscar fornecedor..."
              style={{ ...inputStyle, marginBottom: "4px" }}
            />
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              style={inputStyle}
            >
              <option value="">{suppliersLoading ? "Carregando..." : "Selecione o fornecedor..."}</option>
              {suppliers.map((s) => (
                <option key={s.company_id} value={s.company_id}>
                  {s.company?.legal_name ?? s.company?.trade_name ?? "—"}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <label style={labelStyle}>Código *</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: TAB-LAB-001"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <label style={labelStyle}>Nome *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tabela Laboratório 2026"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <label style={labelStyle}>Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descrição opcional da tabela de custo..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
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
              {saving ? "Salvando..." : "Criar Tabela"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/pricing/costs")}
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
    </div>
  );
}

export function CostNewPage() {
  return (
    <ErrorBoundary>
      <Inner />
    </ErrorBoundary>
  );
}
