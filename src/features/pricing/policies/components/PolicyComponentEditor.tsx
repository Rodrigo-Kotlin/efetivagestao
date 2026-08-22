import { useState } from "react";
import { COMPONENT_TYPES } from "../types/pricing-policy.types";
import type { PricingComponentType } from "../types/pricing-policy.types";
import type { PricingPolicyComponent } from "../types/pricing-policy.types";
import { formatCurrency, formatPercent, parseNumber, parsePercent } from "../utils/format";
import { FormSection } from "@/components/ui/FormSection";
import { FormActions } from "@/components/ui/FormActions";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

interface Props {
  versionId: string;
  components: PricingPolicyComponent[];
  onAdd: (data: {
    name: string;
    componentType: PricingComponentType;
    fixedAmount: number | null;
    rate: number | null;
  }) => Promise<void>;
  onDelete: (componentId: string) => Promise<void>;
  disabled?: boolean;
}

export function PolicyComponentEditor({ versionId: _versionId, components, onAdd, onDelete, disabled = false }: Props) {
  const [name, setName] = useState("");
  const [componentType, setComponentType] = useState<PricingComponentType | "">("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const type = componentType as PricingComponentType;

  const handleAdd = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Informe um nome para o componente.");
      return;
    }

    if (!componentType) {
      setError("Selecione o tipo do componente.");
      return;
    }

    // UI-FORM05: fixed uses fixed_amount; percentage uses rate.
    if (type === "fixed" && fixedAmount.trim() === "") {
      setError("Informe o valor fixo do componente.");
      return;
    }

    if (type === "percentage_of_base_cost" && rate.trim() === "") {
      setError("Informe a taxa percentual do componente.");
      return;
    }

    const fixed = parseNumber(fixedAmount);
    const rateFrac = parsePercent(rate);

    if (type === "fixed" && (fixed === null || fixed < 0)) {
      setError("Informe um valor fixo válido (maior ou igual a zero).");
      return;
    }

    if (type === "percentage_of_base_cost" && (rateFrac === null || rateFrac < 0 || rateFrac > 1)) {
      setError("A taxa percentual deve estar entre 0% e 100%.");
      return;
    }

    setBusy(true);
    try {
      await onAdd({
        name: name.trim(),
        componentType: type,
        fixedAmount: type === "fixed" ? fixed : null,
        rate: type === "percentage_of_base_cost" ? rateFrac : null,
      });
      setName("");
      setComponentType("");
      setFixedAmount("");
      setRate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar componente");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {components.length > 0 ? (
        <Table caption="Componentes de custo" captionHidden>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Nome</th>
              <th style={{ textAlign: "left" }}>Tipo</th>
              <th style={{ textAlign: "right" }}>Valor</th>
              <th style={{ textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c) => {
              const typeLabel = COMPONENT_TYPES.find((t) => t.value === c.component_type)?.label ?? c.component_type;
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td><Badge>{typeLabel}</Badge></td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                    {c.component_type === "fixed" ? formatCurrency(c.fixed_amount) : formatPercent(c.rate)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {!disabled ? (
                      <Button
                        variant="text"
                        size="compact"
                        onClick={() => {
                          if (window.confirm(`Remover o componente "${c.name}"?`)) {
                            void onDelete(c.id).catch((err) => setError(err instanceof Error ? err.message : "Falha ao remover componente"));
                          }
                        }}
                      >
                        Remover
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          title="Nenhum componente de custo adicional"
          description="Esta versão não possui componentes além do custo base."
        />
      )}

      {!disabled ? (
        <FormSection title="Adicionar componente de custo" description="Acrescente valores fixos ou percentuais sobre o custo-base.">
          <FieldGroup columns={2}>
            <TextField
              label="Nome"
              required
              placeholder="Ex.: Taxa de coleta"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Select
              label="Tipo"
              required
              value={componentType}
              onChange={(e) => { setComponentType(e.target.value as PricingComponentType); setFixedAmount(""); setRate(""); }}
            >
              <option value="">Selecione o tipo...</option>
              {COMPONENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </FieldGroup>

          {type === "fixed" ? (
            <TextField
              label="Valor fixo (R$)"
              type="number"
              required
              min={0}
              step="0.01"
              placeholder="Ex.: 5.00"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
            />
          ) : null}

          {type === "percentage_of_base_cost" ? (
            <TextField
              label="Taxa percentual sobre custo-base (%)"
              type="number"
              required
              min={0}
              max={100}
              step="0.01"
              placeholder="Ex.: 5"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              supportingText="Percentual aplicado sobre o custo-base confirmado."
            />
          ) : null}

          {error ? <FormAlert tone="error">{error}</FormAlert> : null}

          <FormActions>
            <Button variant="filled" type="button" onClick={() => void handleAdd()} disabled={busy} loading={busy}>
              {busy ? "Adicionando..." : "Adicionar componente"}
            </Button>
          </FormActions>
        </FormSection>
      ) : null}
    </div>
  );
}
