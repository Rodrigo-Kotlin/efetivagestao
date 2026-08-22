import { useNavigate } from "react-router-dom";
import type { PricingPolicyWithVersions } from "../types/pricing-policy.types";
import { POLICY_SCOPE_TYPES } from "../types/pricing-policy.types";
import { StatusBadge } from "@/components/ui";
import { DetailGrid, DetailField } from "@/components/ui/DetailGrid";
import { Button } from "@/components/ui/Button";
import { PolicyVersionTimeline } from "./PolicyVersionTimeline";
import { formatDate, formatDateTime } from "../utils/format";

interface Props {
  policy: PricingPolicyWithVersions;
  canCreateVersion: boolean;
}

export function PolicyDetail({ policy, canCreateVersion }: Props) {
  const navigate = useNavigate();

  const scopeTarget = policy.scope_type === "category"
    ? "Categoria"
    : policy.scope_type === "catalog_item"
      ? "Item do catálogo"
      : "Toda a organização";

  const scopeLabel = POLICY_SCOPE_TYPES.find((s) => s.value === policy.scope_type)?.label ?? policy.scope_type;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-5)" }}>
      {policy.description ? (
        <section className="eg-section" aria-labelledby="policy-description">
          <h3 id="policy-description" className="eg-section__title">Descrição</h3>
          <p style={{ margin: 0 }}>{policy.description}</p>
        </section>
      ) : null}

      <section className="eg-section" aria-labelledby="policy-meta">
        <h3 id="policy-meta" className="eg-section__title">Informações</h3>
        <DetailGrid columns={3}>
          <DetailField label="Escopo" value={scopeLabel} />
          <DetailField label="Alvo" value={scopeTarget} />
          <DetailField label="Status" value={<StatusBadge status={policy.status} />} />
          <DetailField label="Criada em" value={formatDateTime(policy.created_at)} />
          <DetailField label="Atualizada em" value={formatDate(policy.updated_at)} />
        </DetailGrid>
      </section>

      <section className="eg-section" aria-labelledby="policy-versions">
        <h3 id="policy-versions" className="eg-section__title">Versões</h3>
        <PolicyVersionTimeline versions={policy.versions ?? []} />
      </section>

      {canCreateVersion ? (
        <div>
          <Button variant="filled" onClick={() => navigate(`/pricing/policies/${policy.id}/versions/new`)}>
            Nova Versão
          </Button>
        </div>
      ) : null}
    </div>
  );
}
