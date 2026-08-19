import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  PricingPolicyVersionDetail,
} from "../types/pricing-policy.types";
import { PRICING_METHODS, ROUNDING_MODES } from "../types/pricing-policy.types";
import { CodeBadge, PolicyVersionStatusBadge, PricingMethodBadge } from "./PolicyBadges";
import { PolicyVersionForm } from "./PolicyVersionForm";
import { PolicyComponentEditor } from "./PolicyComponentEditor";
import { PolicyWorkflowActions } from "./PolicyWorkflowActions";
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "../utils/format";

type ActionKind = "submit" | "approve" | "return_to_draft" | "cancel" | "publish";

interface Props {
  version: PricingPolicyVersionDetail;
  permissions: {
    canEdit?: boolean;
    canReview?: boolean;
    canApprove?: boolean;
    canPublish?: boolean;
  };
  workflowPending?: boolean;
  workflowError?: string | null;
  onWorkflowAction: (action: ActionKind) => void;
  onSaveDraft: (data: {
    valid_from: string;
    valid_to: string | null;
    pricing_method: string;
    target_margin_rate: number | null;
    markup_rate: number | null;
    fixed_price: number | null;
    minimum_margin_rate: number | null;
    maximum_discount_rate: number | null;
    rounding_mode: string;
    rounding_step: number | null;
    notes: string | null;
  }) => Promise<void>;
  onAddComponent: (data: {
    name: string;
    componentType: string;
    fixedAmount: number | null;
    rate: number | null;
  }) => Promise<void>;
  onDeleteComponent: (componentId: string) => Promise<void>;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
  marginBottom: "var(--space-6)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--color-text-secondary)",
  marginBottom: "2px",
};

const valueStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--color-text)",
  fontWeight: "var(--font-medium)",
};

function metaItem(label: string, value: string) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <p style={valueStyle}>{value}</p>
    </div>
  );
}

export function PolicyVersionDetail({
  version,
  permissions,
  workflowPending = false,
  workflowError = null,
  onWorkflowAction,
  onSaveDraft,
  onAddComponent,
  onDeleteComponent,
}: Props) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDraft = version.status === "draft";
  const canEditDraft = isDraft && !!permissions.canEdit;

  const methodLabel = PRICING_METHODS.find((m) => m.value === version.pricing_method)?.label ?? version.pricing_method;
  const roundingLabel = ROUNDING_MODES.find((m) => m.value === version.rounding_mode)?.label ?? version.rounding_mode;

  const handleSaveDraft = async (data: Parameters<Props["onSaveDraft"]>[0]) => {
    setSaveError(null);
    try {
      await onSaveDraft(data);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Falha ao salvar a versão");
    }
  };

  const handleAddComponent = async (data: { name: string; componentType: string; fixedAmount: number | null; rate: number | null }) => {
    await onAddComponent({
      name: data.name,
      componentType: data.componentType,
      fixedAmount: data.fixedAmount,
      rate: data.rate,
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <button
            onClick={() => navigate(`/pricing/policies/${version.pricing_policy_id}`)}
            style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "var(--space-2)" }}
          >
            ← Voltar para a política
          </button>
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", marginBottom: "var(--space-2)", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
              Versão v{version.version_number}
            </h1>
            <PolicyVersionStatusBadge status={version.status} />
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>{version.policy?.name ?? "Política"}</span>
            {version.policy?.code && <CodeBadge code={version.policy.code} />}
            <PricingMethodBadge method={version.pricing_method} />
          </div>
        </div>
        {canEditDraft && !editing && (
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "transparent",
              color: "var(--color-primary)",
              border: "1px solid var(--color-primary)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
            }}
          >
            Editar rascunho
          </button>
        )}
      </div>

      {workflowError && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{workflowError}</p>
        </div>
      )}

      {saveError && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{saveError}</p>
        </div>
      )}

      {editing && canEditDraft ? (
        <div style={cardStyle}>
          <PolicyVersionForm
            initialData={{
              valid_from: version.valid_from,
              valid_to: version.valid_to,
              pricing_method: version.pricing_method,
              target_margin_rate: version.target_margin_rate,
              markup_rate: version.markup_rate,
              fixed_price: version.fixed_price,
              minimum_margin_rate: version.minimum_margin_rate,
              maximum_discount_rate: version.maximum_discount_rate,
              rounding_mode: version.rounding_mode,
              rounding_step: version.rounding_step,
              notes: version.notes,
            }}
            onSubmit={(data) => void handleSaveDraft(data)}
            onCancel={() => setEditing(false)}
            submitLabel="Salvar alterações"
          />
        </div>
      ) : (
        <>
          <div style={{ ...cardStyle, padding: "var(--space-4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)" }}>
              {metaItem("Método", methodLabel)}
              {version.pricing_method === "target_margin" && metaItem("Margem-alvo", formatPercent(version.target_margin_rate))}
              {version.pricing_method === "markup" && metaItem("Markup", formatPercent(version.markup_rate))}
              {version.pricing_method === "fixed_price" && metaItem("Preço fixo", formatCurrency(version.fixed_price))}
              {version.minimum_margin_rate !== null && metaItem("Margem mínima", formatPercent(version.minimum_margin_rate))}
              {version.maximum_discount_rate !== null && metaItem("Desconto máximo", formatPercent(version.maximum_discount_rate))}
              {metaItem("Arredondamento", version.rounding_mode === "none" ? "Sem arredondamento" : `${roundingLabel} (passo ${formatCurrency(version.rounding_step)})`)}
              {metaItem("Vigência", `${formatDate(version.valid_from)} — ${formatDate(version.valid_to)}`)}
              {metaItem("Criada em", formatDateTime(version.created_at))}
              {version.approved_at && metaItem("Aprovada em", formatDateTime(version.approved_at))}
              {version.published_at && metaItem("Publicada em", formatDateTime(version.published_at))}
            </div>
            {version.notes && (
              <div style={{ marginTop: "var(--space-4)", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
                <p style={labelStyle}>Observações</p>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text)", margin: 0 }}>{version.notes}</p>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <PolicyComponentEditor
              versionId={version.id}
              components={version.components ?? []}
              onAdd={handleAddComponent}
              onDelete={onDeleteComponent}
              disabled={!canEditDraft}
            />
          </div>
        </>
      )}

      <PolicyWorkflowActions
        status={version.status}
        permissions={permissions}
        pending={workflowPending}
        onAction={onWorkflowAction}
      />
    </div>
  );
}