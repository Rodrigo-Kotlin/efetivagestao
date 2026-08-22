import { useState } from "react";
import { useCategoryTree, useCategoryMutations } from "../hooks/useCategories";
import type { CatalogCategoryWithChildren } from "@/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FormSection } from "@/components/ui/FormSection";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormActions } from "@/components/ui/FormActions";

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
    setFormCode(""); setFormName(""); setFormDescription("");
    setFormParentId(""); setFormSortOrder("0");
    setEditingId(null); setShowForm(false); setFormError(null);
  };

  const startEdit = (cat: CatalogCategoryWithChildren) => {
    setEditingId(cat.id); setFormCode(cat.code); setFormName(cat.name);
    setFormDescription(cat.description ?? ""); setFormParentId(cat.parent_id ?? "");
    setFormSortOrder(String(cat.sort_order)); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) { setFormError("Código e nome são obrigatórios"); return; }
    setSubmitting(true); setFormError(null);
    try {
      const data = {
        code: formCode.trim(), name: formName.trim(),
        description: formDescription.trim() || undefined,
        parent_id: formParentId || null,
        sort_order: parseInt(formSortOrder, 10) || 0,
      };
      if (editingId) { await update(editingId, data); }
      else { await create({ ...data, parent_id: formParentId || undefined }); }
      resetForm(); void refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar categoria");
    } finally { setSubmitting(false); }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Inativar esta categoria?")) return;
    try { await deactivate(id); void refetch(); }
    catch (err) { setFormError(err instanceof Error ? err.message : "Erro ao inativar categoria"); }
  };

  const flatCategories = flattenTree(tree);
  const inputStyle: React.CSSProperties = { width: "100%", padding: "var(--spacing-2) var(--spacing-3)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="filled" onClick={() => { resetForm(); setShowForm(true); }}>Nova Categoria</Button>
      </div>

      {formError && <Alert tone="negative">{formError}</Alert>}

      {showForm && (
        <form onSubmit={(e) => void handleSubmit(e)} style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-6)" }}>
          <FormSection title={editingId ? "Editar Categoria" : "Nova Categoria"}>
            <FieldGroup columns={2}>
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-sm)", fontWeight: 500, marginBottom: "var(--spacing-1)" }}>Código *</label>
                <input id="cat_code" type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)} style={inputStyle} maxLength={50} required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-sm)", fontWeight: 500, marginBottom: "var(--spacing-1)" }}>Nome *</label>
                <input id="cat_name" type="text" value={formName} onChange={(e) => setFormName(e.target.value)} style={inputStyle} maxLength={255} required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-sm)", fontWeight: 500, marginBottom: "var(--spacing-1)" }}>Categoria Pai</label>
                <select id="cat_parent" value={formParentId} onChange={(e) => setFormParentId(e.target.value)} style={inputStyle}>
                  <option value="">Nenhuma (raiz)</option>
                  {flatCategories.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-sm)", fontWeight: 500, marginBottom: "var(--spacing-1)" }}>Ordem</label>
                <input id="cat_sort" type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value)} style={inputStyle} />
              </div>
            </FieldGroup>
            <div>
              <label style={{ display: "block", fontSize: "var(--font-size-sm)", fontWeight: 500, marginBottom: "var(--spacing-1)" }}>Descrição</label>
              <textarea id="cat_desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} maxLength={500} />
            </div>
            <FormActions>
              <Button type="button" variant="outlined" onClick={resetForm}>Cancelar</Button>
              <Button type="submit" variant="filled" disabled={submitting}>{submitting ? "Salvando..." : editingId ? "Salvar" : "Criar"}</Button>
            </FormActions>
          </FormSection>
        </form>
      )}

      {loading && <Spinner label="Carregando categorias..." />}

      {error && !loading && (
        <Alert tone="negative" title={error}>
          <Button variant="outlined" size="compact" onClick={() => void refetch()}>Tentar novamente</Button>
        </Alert>
      )}

      {!loading && !error && tree.length === 0 && (
        <EmptyState
          title="Nenhuma categoria cadastrada."
          description="Crie a primeira categoria para organizar os itens do catálogo."
          actions={<Button variant="filled" onClick={() => { resetForm(); setShowForm(true); }}>Criar primeira categoria</Button>}
        />
      )}

      {!loading && !error && tree.length > 0 && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-4)" }}>
          {tree.map((cat) => (
            <CategoryNode key={cat.id} node={cat} depth={0} onEdit={startEdit} onDeactivate={handleDeactivate} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryNode({ node, depth, onEdit, onDeactivate }: {
  node: CatalogCategoryWithChildren; depth: number;
  onEdit: (cat: CatalogCategoryWithChildren) => void; onDeactivate: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)", padding: "var(--spacing-2) var(--spacing-3)", marginLeft: `${depth * 24}px`, borderBottom: "1px solid var(--color-border-default)", opacity: node.is_active ? 1 : 0.5 }}>
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }} aria-label={expanded ? "Recolher" : "Expandir"}>
            {expanded ? "▼" : "▶"}
          </button>
        ) : <span style={{ width: "20px" }} />}
        <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", minWidth: "60px" }}>{node.code}</span>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500, flex: 1 }}>{node.name}</span>
        <StatusBadge status={node.is_active ? "active" : "inactive"} />
        <Button variant="text" size="compact" onClick={() => onEdit(node)}>Editar</Button>
        {node.is_active && <Button variant="text" size="compact" onClick={() => void onDeactivate(node.id)}>Inativar</Button>}
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
