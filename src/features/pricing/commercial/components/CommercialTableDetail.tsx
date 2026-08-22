import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CommercialCodeBadge,
  CommercialTableStatusBadge,
  CommercialVersionStatusBadge,
} from "./CommercialBadges";
import type {
  CommercialPriceTableVersion,
  CommercialPriceTableWithCounts,
  CommercialTableStatus,
} from "../types/commercial.types";
import { formatDate } from "../utils/format";
import { Button } from "@/components/ui/Button";
import { DropdownMenu, MenuItem } from "@/components/ui/DropdownMenu";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { DetailGrid, DetailField } from "@/components/ui/DetailGrid";
import { FormSection } from "@/components/ui/FormSection";
import { FormActions } from "@/components/ui/FormActions";
import { TextField } from "@/components/ui/TextField";
import { FormAlert } from "@/components/ui/FormAlert";

interface Props {
  table: CommercialPriceTableWithCounts;
  versions: CommercialPriceTableVersion[];
  canEdit: boolean;
  canCreate: boolean;
  onSaveDetails: (input: { name: string; description: string | null }) => Promise<void>;
  onChangeStatus: (status: CommercialTableStatus) => Promise<void>;
}

export function CommercialTableDetail({
  table,
  versions,
  canEdit,
  canCreate,
  onSaveDetails,
  onChangeStatus,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(table.name);
  const [description, setDescription] = useState(table.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<CommercialTableStatus | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSaveDetails({ name: name.trim(), description: description.trim() || null });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (target: CommercialTableStatus) => {
    if (
      !window.confirm(
        target === "inactive"
          ? "Inativar a tabela impede novas versões, mas não apaga o histórico. Confirmar?"
          : "Reativar a tabela permitirá criar novas versões. Confirmar?"
      )
    ) {
      setStatusConfirm(null);
      return;
    }
    setStatusConfirm(target);
    try {
      await onChangeStatus(target);
    } finally {
      setStatusConfirm(null);
    }
  };

  const current = table.current_version;
  const scheduled = table.scheduled_version;
  const draftVersions = versions.filter((v) => v.status === "draft");
  const historicalVersions = versions.filter(
    (v) => v.status === "superseded" || v.status === "cancelled" || v.status === "active" || v.status === "scheduled" || v.status === "approved",
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-5)" }}>
      <div className="eg-entity-chips">
        <CommercialCodeBadge code={table.code} />
        <CommercialTableStatusBadge status={table.status} />
      </div>

      {canEdit && !editing ? (
        <div style={{ display: "flex", gap: "var(--md-sys-spacing-2)", flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={() => setEditing(true)}>Editar dados</Button>
          <Button
            variant="outlined"
            onClick={() => handleStatusChange(table.status === "active" ? "inactive" : "active")}
            disabled={statusConfirm !== null}
          >
            {table.status === "active" ? "Inativar tabela" : "Reativar tabela"}
          </Button>
        </div>
      ) : null}

      {error ? <Alert tone="negative" title={error} /> : null}

      {editing && canEdit ? (
        <FormSection title="Editar dados da tabela" description="O código não pode ser editado após a primeira versão.">
          <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
          />
          {error ? <FormAlert tone="error">{error}</FormAlert> : null}
          <FormActions>
            <Button variant="text" type="button" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
            <Button variant="filled" type="button" onClick={() => void handleSave()} disabled={saving} loading={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </FormActions>
        </FormSection>
      ) : (
        <section className="eg-section" aria-labelledby="table-info">
          <h3 id="table-info" className="eg-section__title">Informações</h3>
          <DetailGrid columns={3}>
            <DetailField label="Código" value={table.code} mono />
            <DetailField label="Descrição" value={table.description} />
            <DetailField label="Versões" value={versions.length} />
          </DetailGrid>
        </section>
      )}

      <section className="eg-section" aria-labelledby="current-version">
        <h3 id="current-version" className="eg-section__title">Versão atual</h3>
        {current ? (
          <VersionRow
            version={current}
            label="Atual"
            showClone={canCreate}
          />
        ) : (
          <p style={{ margin: 0, color: "var(--md-sys-color-on-surface-variant)" }}>
            Nenhuma versão ativa publicada.
          </p>
        )}
      </section>

      <section className="eg-section" aria-labelledby="scheduled-version">
        <h3 id="scheduled-version" className="eg-section__title">Próxima vigência</h3>
        {scheduled ? (
          scheduled.id !== current?.id ? (
            <VersionRow version={scheduled} showClone={canCreate} />
          ) : (
            <p style={{ margin: 0, color: "var(--md-sys-color-on-surface-variant)" }}>
              Sem versão agendada distinta da atual.
            </p>
          )
        ) : (
          <p style={{ margin: 0, color: "var(--md-sys-color-on-surface-variant)" }}>
            Nenhuma versão agendada.
          </p>
        )}
      </section>

      <section className="eg-section" aria-labelledby="draft-versions">
        <h3 id="draft-versions" className="eg-section__title">Rascunhos</h3>
        {draftVersions.length === 0 ? (
          <p style={{ margin: 0, color: "var(--md-sys-color-on-surface-variant)" }}>Nenhum rascunho.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-2)" }}>
            {draftVersions.map((v) => (
              <VersionRow key={v.id} version={v} showClone={canCreate} />
            ))}
          </div>
        )}
      </section>

      <section className="eg-section" aria-labelledby="historical-versions">
        <h3 id="historical-versions" className="eg-section__title">Histórico</h3>
        {(() => {
          const historical = historicalVersions.filter(
            (v) => v.id !== current?.id && v.id !== scheduled?.id && v.status !== "draft",
          );
          if (historical.length === 0) {
            return <p style={{ margin: 0, color: "var(--md-sys-color-on-surface-variant)" }}>Sem versões históricas.</p>;
          }
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--md-sys-spacing-2)" }}>
              {historical.map((v) => (
                <VersionRow key={v.id} version={v} showClone={canCreate} />
              ))}
            </div>
          );
        })()}
      </section>

      <div>
        <Link
          to={`/pricing/commercial/lookup?tableId=${table.id}`}
          style={{ color: "var(--md-sys-color-primary)", fontWeight: 500 }}
        >
          Consultar preço desta tabela
        </Link>
      </div>
    </div>
  );
}

function VersionRow({
  version,
  label,
  showClone,
}: {
  version: CommercialPriceTableVersion;
  label?: string;
  showClone: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "var(--md-sys-spacing-3)",
        border: "1px solid var(--md-sys-color-outline-variant)",
        borderRadius: "var(--md-sys-shape-corner-interactive)",
        flexWrap: "wrap",
        gap: "var(--md-sys-spacing-2)",
      }}
    >
      <div style={{ display: "flex", gap: "var(--md-sys-spacing-2)", alignItems: "center", flexWrap: "wrap" }}>
        <Link
          to={`/pricing/commercial/versions/${version.id}`}
          style={{ color: "var(--md-sys-color-primary)", fontWeight: 500, textDecoration: "none" }}
        >
          v{version.version_number}{version.version_label ? ` · ${version.version_label}` : ""}
        </Link>
        <CommercialVersionStatusBadge status={version.status} />
        {label ? (
          <Badge tone="info">{label}</Badge>
        ) : null}
        <span style={{ color: "var(--md-sys-color-on-surface-variant)", fontSize: "var(--md-sys-typescale-body-medium-size)" }}>
          Vigência: {formatDate(version.valid_from)} — {formatDate(version.valid_to)}
        </span>
      </div>
      {showClone ? (
        <Link
          to={`/pricing/commercial/${version.commercial_price_table_id}/versions/new?cloneFrom=${version.id}`}
          style={{ color: "var(--md-sys-color-on-surface-variant)", fontSize: "var(--md-sys-typescale-body-medium-size)", textDecoration: "underline" }}
        >
          Clonar
        </Link>
      ) : null}
    </div>
  );
}

// Silence unused warning when DropdownMenu is not directly referenced
void DropdownMenu;
void MenuItem;
void StatusBadge;

export function describeCommercialTableStatus(
  status: CommercialTableStatus
): string {
  return status === "active" ? "Ativa" : "Inativa";
}
