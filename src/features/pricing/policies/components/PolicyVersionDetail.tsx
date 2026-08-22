import { useState } from "react";
import type {
  PricingPolicyVersionDetail,
} from "../types/pricing-policy.types";
import { PRICING_METHODS, ROUNDING_MODES } from "../types/pricing-policy.types";
import { StatusBadge, Badge, Button } from "@/components/ui";
import { DetailGrid, DetailField } from "@/components/ui/DetailGrid";
import { Alert } from "@/components/ui/Alert";
import { FormSection } from "@/components/ui/FormSection";
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-5)" }}>
      <div className="eg-entity-chips">
        <StatusBadge status={version.status} />
        {version.policy?.code ? <Badge mono>{version.policy.code}</Badge> : null}
        {version.pricing_method ? <Badge tone="accent">{methodLabel}</Badge> : null}
        <span style={{ fontSize: "var(--md-sys-typescale-body-medium-size)", color: "var(--md-sys-color-on-surface-variant)" }}>
          {version.policy?.name ?? "Política"}
        </span>
      </div>

      {workflowError ? <Alert tone="negative" title={workflowError} /> : null}

      {canEditDraft && !editing ? (
        <div>
          <Button variant="outlined" onClick={() => setEditing(true)}>Editar rascunho</Button>
        </div>
      ) : null}

      {editing && canEditDraft ? (
        <FormSection title="Editar rascunho">
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
        </FormSection>
      ) : (
        <>
          <section className="eg-section" aria-labelledby="version-meta">
            <h3 id="version-meta" className="eg-section__title">Metadados da versão</h3>
            <DetailGrid columns={3}>
              <DetailField label="Método" value={methodLabel} />
              {version.pricing_method === "target_margin" ? <DetailField label="Margem-alvo" value={formatPercent(version.target_margin_rate)} /> : null}
              {version.pricing_method === "markup" ? <DetailField label="Markup" value={formatPercent(version.markup_rate)} /> : null}
              {version.pricing_method === "fixed_price" ? <DetailField label="Preço fixo" value={formatCurrency(version.fixed_price)} /> : null}
              {version.minimum_margin_rate !== null ? <DetailField label="Margem mínima" value={formatPercent(version.minimum_margin_rate)} /> : null}
              {version.maximum_discount_rate !== null ? <DetailField label="Desconto máximo" value={formatPercent(version.maximum_discount_rate)} /> : null}
              <DetailField
                label="Arredondamento"
                value={version.rounding_mode === "none" ? "Sem arredondamento" : `${roundingLabel} (passo ${formatCurrency(version.rounding_step)})`}
              />
              <DetailField label="Vigência" value={`${formatDate(version.valid_from)} — ${formatDate(version.valid_to)}`} span={2} />
              <DetailField label="Criada em" value={formatDateTime(version.created_at)} />
              {version.approved_at ? <DetailField label="Aprovada em" value={formatDateTime(version.approved_at)} /> : null}
              {version.published_at ? <DetailField label="Publicada em" value={formatDateTime(version.published_at)} /> : null}
              {version.notes ? <DetailField label="Observações" value={version.notes} span={3} /> : null}
            </DetailGrid>
          </section>

          <section className="eg-section" aria-labelledby="version-components">
            <h3 id="version-components" className="eg-section__title">Componentes de custo</h3>
            <PolicyComponentEditor
              versionId={version.id}
              components={version.components ?? []}
              onAdd={handleAddComponent}
              onDelete={onDeleteComponent}
              disabled={!canEditDraft}
            />
          </section>
        </>
      )}

      {saveError ? <Alert tone="negative" title={saveError} /> : null}

      <PolicyWorkflowActions
        status={version.status}
        permissions={permissions}
        pending={workflowPending}
        onAction={onWorkflowAction}
      />
    </div>
  );
}
