// ============================================================
// CommercialTableDetail — view + edit a single stable table.
// Shows all versions (current/scheduled/draft/historical).
// ============================================================

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

interface Props {
  table: CommercialPriceTableWithCounts;
  versions: CommercialPriceTableVersion[];
  canEdit: boolean;
  canCreate: boolean;
  onSaveDetails: (input: { name: string; description: string | null }) => Promise<void>;
  onChangeStatus: (status: CommercialTableStatus) => Promise<void>;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
  marginBottom: "var(--space-4)",
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
};

export function CommercialTableDetail({
  table,
  versions,
  canEdit,
  canCreate,
  onSaveDetails,
  onChangeStatus,
}: Props) {
  const navigate = useNavigate();
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
    (v) => v.status === "superseded" || v.status === "cancelled" || v.status === "active" || v.status === "scheduled" || v.status === "approved"
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "var(--space-6)",
          gap: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <button
            type="button"
            onClick={() => navigate("/pricing/commercial")}
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-primary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginBottom: "var(--space-2)",
            }}
          >
            ← Voltar para tabelas
          </button>
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)" }}>
              {table.name}
            </h1>
            <CommercialCodeBadge code={table.code} />
            <CommercialTableStatusBadge status={table.status} />
          </div>
        </div>

        {canEdit && !editing && (
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "transparent",
                color: "var(--color-primary)",
                border: "1px solid var(--color-primary)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
              }}
            >
              Editar dados
            </button>
            <button
              type="button"
              onClick={() =>
                handleStatusChange(table.status === "active" ? "inactive" : "active")
              }
              disabled={statusConfirm !== null}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "transparent",
                color:
                  table.status === "active"
                    ? "var(--color-text-secondary)"
                    : "var(--color-primary)",
                border: `1px solid ${
                  table.status === "active"
                    ? "var(--color-border)"
                    : "var(--color-primary)"
                }`,
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                cursor: statusConfirm ? "default" : "pointer",
                opacity: statusConfirm ? 0.5 : 1,
              }}
            >
              {table.status === "active" ? "Inativar tabela" : "Reativar tabela"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
          }}
        >
          <p style={{ color: "#991B1B", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
        </div>
      )}

      {editing ? (
        <div style={cardStyle}>
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div>
              <label htmlFor="ctd-name" style={{ ...labelStyle, fontWeight: "var(--font-medium)" }}>
                Nome
              </label>
              <input
                id="ctd-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="ctd-description" style={{ ...labelStyle, fontWeight: "var(--font-medium)" }}>
                Descrição
              </label>
              <textarea
                id="ctd-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
              O código da tabela não pode ser editado após a primeira versão.
            </p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-text-inverse)",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                cursor: saving ? "default" : "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div style={cardStyle}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)" }}>
            <div>
              <p style={labelStyle}>Código</p>
              <p style={valueStyle}>{table.code}</p>
            </div>
            <div>
              <p style={labelStyle}>Descrição</p>
              <p style={valueStyle}>{table.description ?? "—"}</p>
            </div>
            <div>
              <p style={labelStyle}>Versões</p>
              <p style={valueStyle}>{versions.length}</p>
            </div>
          </div>
        </div>
      )}

      <Section
        title="Versão atual"
        empty="Nenhuma versão ativa publicada."
        renderItem={(v) => (
          <VersionRow
            key={v.id}
            version={v}
            label={current === v ? "Atual" : undefined}
            showClone={canCreate}
          />
        )}
        items={current ? [current] : []}
      />

      <Section
        title="Versões agendadas"
        empty="Nenhuma versão agendada."
        renderItem={(v) => (
          <VersionRow key={v.id} version={v} showClone={canCreate} />
        )}
        items={scheduled ? [scheduled] : []}
      />

      <Section
        title="Rascunhos"
        empty="Nenhum rascunho."
        renderItem={(v) => (
          <VersionRow key={v.id} version={v} showClone={canCreate} />
        )}
        items={draftVersions}
      />

      <Section
        title="Histórico"
        empty="Sem versões históricas."
        renderItem={(v) => (
          <VersionRow key={v.id} version={v} showClone={canCreate} />
        )}
        items={historicalVersions.filter(
          (v) =>
            v.id !== current?.id &&
            v.id !== scheduled?.id &&
            v.status !== "draft"
        )}
      />

      <Link
        to={`/pricing/commercial/lookup?tableId=${table.id}`}
        style={{
          display: "inline-block",
          padding: "var(--space-2) var(--space-4)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-primary)",
          fontSize: "var(--text-sm)",
          textDecoration: "none",
          fontWeight: "var(--font-medium)",
        }}
      >
        Consultar preço desta tabela
      </Link>
    </div>
  );
}

function Section<T extends { id: string }>({
  title,
  items,
  renderItem,
  empty,
}: {
  title: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  empty: string;
}) {
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-3)" }}>
        {title}
      </h3>
      {items.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>{empty}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "var(--space-2)" }}>
          {items.map(renderItem)}
        </ul>
      )}
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
    <li
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "var(--space-3)",
        border: "1px solid var(--color-border-light, #F1F5F9)",
        borderRadius: "var(--radius-md)",
        flexWrap: "wrap",
        gap: "var(--space-2)",
      }}
    >
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
        <Link
          to={`/pricing/commercial/versions/${version.id}`}
          style={{
            color: "var(--color-primary)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
            textDecoration: "none",
          }}
        >
          v{version.version_number} {version.version_label ? `· ${version.version_label}` : ""}
        </Link>
        <CommercialVersionStatusBadge status={version.status} />
        {label && (
          <span
            style={{
              fontSize: "var(--text-xs)",
              padding: "2px 6px",
              backgroundColor: "var(--color-primary-50, #F0FDF4)",
              color: "var(--color-primary)",
              borderRadius: "var(--radius-full)",
            }}
          >
            {label}
          </span>
        )}
        <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-xs)" }}>
          Vigência: {formatDate(version.valid_from)} — {formatDate(version.valid_to)}
        </span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        {showClone && (
          <Link
            to={`/pricing/commercial/${version.commercial_price_table_id}/versions/new?cloneFrom=${version.id}`}
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-secondary)",
              textDecoration: "underline",
            }}
          >
            Clonar
          </Link>
        )}
      </div>
    </li>
  );
}

export function describeCommercialTableStatus(
  status: CommercialTableStatus
): string {
  return status === "active" ? "Ativa" : "Inativa";
}
