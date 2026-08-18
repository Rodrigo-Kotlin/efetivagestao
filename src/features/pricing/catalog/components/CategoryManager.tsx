import { useState } from "react";
import { useCategoryTree, useCategoryMutations } from "../hooks/useCategories";
import type { CatalogCategoryWithChildren } from "@/types";

export function CategoryManager() {
  const { tree, loading, error, refetch } = useCategoryTree();
  const { create, update, deactivate } = useCategoryMutations();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formParentId, setFormParentId] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setFormCode("");
    setFormName("");
    setFormDescription("");
    setFormParentId("");
    setFormSortOrder("0");
    setEditingId(null);
    setShowForm(false);
    setFormError(null);
  };

  const startEdit = (cat: CatalogCategoryWithChildren) => {
    setEditingId(cat.id);
    setFormCode(cat.code);
    setFormName(cat.name);
    setFormDescription(cat.description ?? "");
    setFormParentId(cat.parent_id ?? "");
    setFormSortOrder(String(cat.sort_order));
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCode.trim() || !formName.trim()) {
      setFormError("Código e nome são obrigatórios");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingId) {
        await update(editingId, {
          code: formCode.trim(),
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          parent_id: formParentId || null,
          sort_order: parseInt(formSortOrder, 10) || 0,
        });
      } else {
        await create({
          code: formCode.trim(),
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          parent_id: formParentId || undefined,
          sort_order: parseInt(formSortOrder, 10) || 0,
        });
      }
      resetForm();
      void refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar categoria");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Inativar esta categoria?")) return;
    try {
      await deactivate(id);
      void refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao inativar categoria");
    }
  };

  const flatCategories = flattenTree(tree);

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
    fontSize: "var(--text-sm)",
    fontWeight: "var(--font-medium)",
    marginBottom: "var(--space-1)",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
          Categorias
        </h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
          }}
        >
          Nova Categoria
        </button>
      </div>

      {formError && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-4)", color: "#991B1B", fontSize: "var(--text-sm)" }}>
          {formError}
        </div>
      )}

      {showForm && (
        <form onSubmit={(e) => void handleSubmit(e)} style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-4)" }}>
            {editingId ? "Editar Categoria" : "Nova Categoria"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div>
              <label htmlFor="cat_code" style={labelStyle}>Código *</label>
              <input id="cat_code" type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)} style={inputStyle} maxLength={50} required />
            </div>
            <div>
              <label htmlFor="cat_name" style={labelStyle}>Nome *</label>
              <input id="cat_name" type="text" value={formName} onChange={(e) => setFormName(e.target.value)} style={inputStyle} maxLength={255} required />
            </div>
            <div>
              <label htmlFor="cat_parent" style={labelStyle}>Categoria Pai</label>
              <select id="cat_parent" value={formParentId} onChange={(e) => setFormParentId(e.target.value)} style={inputStyle}>
                <option value="">Nenhuma (raiz)</option>
                {flatCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cat_sort" style={labelStyle}>Ordem</label>
              <input id="cat_sort" type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <label htmlFor="cat_desc" style={labelStyle}>Descrição</label>
            <textarea id="cat_desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} maxLength={500} />
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
            <button type="button" onClick={resetForm} style={{ padding: "var(--space-2) var(--space-4)", backgroundColor: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={submitting} style={{ padding: "var(--space-2) var(--space-4)", backgroundColor: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1, fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}>
              {submitting ? "Salvando..." : editingId ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-secondary)" }}>Carregando categorias...</div>
      )}

      {error && !loading && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", marginBottom: "var(--space-2)" }}>{error}</p>
          <button onClick={() => void refetch()} style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)" }}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && tree.length === 0 && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-8)", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>Nenhuma categoria cadastrada.</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "var(--space-2) var(--space-4)", backgroundColor: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}>
            Criar primeira categoria
          </button>
        </div>
      )}

      {!loading && !error && tree.length > 0 && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
          {tree.map((cat) => (
            <CategoryNode key={cat.id} node={cat} depth={0} onEdit={startEdit} onDeactivate={handleDeactivate} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryNode({
  node,
  depth,
  onEdit,
  onDeactivate,
}: {
  node: CatalogCategoryWithChildren;
  depth: number;
  onEdit: (cat: CatalogCategoryWithChildren) => void;
  onDeactivate: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3)",
          marginLeft: `${depth * 24}px`,
          borderBottom: "1px solid var(--color-border)",
          opacity: node.is_active ? 1 : 0.5,
        }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? "▼" : "▶"}
          </button>
        ) : (
          <span style={{ width: "20px" }} />
        )}

        <span style={{ fontFamily: "monospace", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", minWidth: "60px" }}>
          {node.code}
        </span>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", flex: 1 }}>
          {node.name}
        </span>

        <button
          onClick={() => onEdit(node)}
          style={{ padding: "2px 8px", backgroundColor: "transparent", color: "var(--color-primary)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-xs)" }}
        >
          Editar
        </button>
        {node.is_active && (
          <button
            onClick={() => void onDeactivate(node.id)}
            style={{ padding: "2px 8px", backgroundColor: "transparent", color: "#DC2626", border: "1px solid #DC2626", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--text-xs)" }}
          >
            Inativar
          </button>
        )}
      </div>

      {expanded && hasChildren && node.children!.map((child) => (
        <CategoryNode key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onDeactivate={onDeactivate} />
      ))}
    </div>
  );
}

function flattenTree(tree: CatalogCategoryWithChildren[]): Array<{ id: string; code: string; name: string }> {
  const result: Array<{ id: string; code: string; name: string }> = [];

  function walk(nodes: CatalogCategoryWithChildren[]) {
    for (const node of nodes) {
      result.push({ id: node.id, code: node.code, name: node.name });
      if (node.children) walk(node.children);
    }
  }

  walk(tree);
  return result;
}
