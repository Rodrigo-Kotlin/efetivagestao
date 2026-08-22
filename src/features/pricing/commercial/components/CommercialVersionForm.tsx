import { useState } from "react";
import { FormSection } from "@/components/ui/FormSection";
import { FormActions } from "@/components/ui/FormActions";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { Radio } from "@/components/ui/Radio";
import { Button } from "@/components/ui/Button";

interface Props {
  defaultValidFrom: string;
  defaultValidTo: string | null;
  sourceVersionLabel?: string;
  onSubmitEmpty: (input: {
    validFrom: string;
    validTo: string | null;
    versionLabel: string | null;
    notes: string | null;
  }) => Promise<void>;
  onSubmitClone: (input: {
    sourceVersionId: string;
    validFrom: string;
    validTo: string | null;
    versionLabel: string | null;
    notes: string | null;
  }) => Promise<void>;
  sourceVersionId?: string;
  cancelLabel?: string;
}

export function CommercialVersionForm({
  defaultValidFrom,
  defaultValidTo,
  sourceVersionId,
  sourceVersionLabel,
  onSubmitEmpty,
  onSubmitClone,
  cancelLabel,
}: Props) {
  const [validFrom, setValidFrom] = useState(defaultValidFrom);
  const [validTo, setValidTo] = useState(defaultValidTo ?? "");
  const [versionLabel, setVersionLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"empty" | "clone">(
    sourceVersionId ? "clone" : "empty"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validFrom) {
      setError("Informe a data de início de vigência.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "clone" && sourceVersionId) {
        await onSubmitClone({
          sourceVersionId,
          validFrom,
          validTo: validTo || null,
          versionLabel: versionLabel.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await onSubmitEmpty({
          validFrom,
          validTo: validTo || null,
          versionLabel: versionLabel.trim() || null,
          notes: notes.trim() || null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar versão");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
      {sourceVersionId ? (
        <FormSection
          title="Modo de criação"
          description="Preços e snapshots do catálogo são copiados. A linhagem é preservada. Exceções aprovadas ou negadas não são copiadas."
        >
          <Radio
            name="cvm-mode"
            label="Criar versão vazia"
            checked={mode === "empty"}
            onChange={() => setMode("empty")}
          />
          <Radio
            name="cvm-mode"
            label={`Clonar versão existente${sourceVersionLabel ? ` · ${sourceVersionLabel}` : ""}`}
            checked={mode === "clone"}
            onChange={() => setMode("clone")}
          />
        </FormSection>
      ) : null}

      <FormSection title="Vigência" description="Define o período de validade desta versão.">
        <FieldGroup columns={2}>
          <TextField
            label="Vigência inicial"
            type="date"
            required
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
          <TextField
            label="Vigência final"
            type="date"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            placeholder="Em aberto"
            supportingText="Pode ficar em aberto para versões sem data final."
          />
        </FieldGroup>
        <TextField
          label="Rótulo da versão"
          placeholder="Opcional"
          value={versionLabel}
          onChange={(e) => setVersionLabel(e.target.value)}
        />
      </FormSection>

      <FormSection title="Observações">
        <TextField
          label="Observações"
          placeholder="Opcional"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={3}
        />
      </FormSection>

      {error ? <FormAlert tone="error">{error}</FormAlert> : null}

      <FormActions>
        <Button variant="filled" type="submit" disabled={submitting} loading={submitting}>
          {submitting
            ? "Criando..."
            : mode === "clone"
              ? "Clonar versão"
              : "Criar versão vazia"}
        </Button>
        {cancelLabel ? (
          <Button variant="text" type="button" onClick={() => window.history.back()} disabled={submitting}>
            {cancelLabel}
          </Button>
        ) : null}
      </FormActions>
    </form>
  );
}
