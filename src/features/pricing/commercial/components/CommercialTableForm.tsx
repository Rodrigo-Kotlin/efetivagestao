import { useState } from "react";
import { FormSection } from "@/components/ui/FormSection";
import { FormActions } from "@/components/ui/FormActions";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

interface Props {
  onSubmit: (data: { code: string; name: string; description: string | null }) => Promise<void>;
  onCancel: () => void;
}

export function CommercialTableForm({ onSubmit, onCancel }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError("Código e nome são obrigatórios.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar tabela");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
    >
      <FormSection title="Nova tabela comercial" description="Defina código e nome. O código não poderá ser editado após a primeira versão.">
        <TextField
          label="Código"
          required
          placeholder="Ex: TAB-PADRAO"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <TextField
          label="Nome"
          required
          placeholder="Ex: Tabela Padrão"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Descrição"
          placeholder="Opcional"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={3}
        />
      </FormSection>

      {error ? <FormAlert tone="error">{error}</FormAlert> : null}

      <FormActions>
        <Button variant="text" type="button" onClick={onCancel} disabled={submitting}>Cancelar</Button>
        <Button variant="filled" type="submit" disabled={submitting} loading={submitting}>
          {submitting ? "Criando..." : "Criar tabela"}
        </Button>
      </FormActions>
    </form>
  );
}
