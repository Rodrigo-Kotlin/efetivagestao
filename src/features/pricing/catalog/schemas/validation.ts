import type { ItemType, ExecutionType } from "@/types";

interface ValidationError {
  field: string;
  message: string;
}

export interface CatalogItemFormData {
  item_type: ItemType | "";
  name: string;
  short_name: string;
  category_id: string;
  commercial_unit: string;
  execution_type: ExecutionType | "";
  legacy_code: string;
  description: string;
  notes: string;
}

export function validateCatalogItem(data: CatalogItemFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.item_type) {
    errors.push({ field: "item_type", message: "Tipo é obrigatório" });
  }

  if (!data.name.trim()) {
    errors.push({ field: "name", message: "Nome é obrigatório" });
  } else if (data.name.trim().length < 2) {
    errors.push({ field: "name", message: "Nome deve ter pelo menos 2 caracteres" });
  } else if (data.name.trim().length > 255) {
    errors.push({ field: "name", message: "Nome deve ter no máximo 255 caracteres" });
  }

  if (data.short_name && data.short_name.length > 100) {
    errors.push({ field: "short_name", message: "Nome reduzido deve ter no máximo 100 caracteres" });
  }

  if (!data.commercial_unit.trim()) {
    errors.push({ field: "commercial_unit", message: "Unidade comercial é obrigatória" });
  }

  if (!data.execution_type) {
    errors.push({ field: "execution_type", message: "Tipo de execução é obrigatório" });
  }

  if (data.description && data.description.length > 2000) {
    errors.push({ field: "description", message: "Descrição deve ter no máximo 2000 caracteres" });
  }

  if (data.notes && data.notes.length > 2000) {
    errors.push({ field: "notes", message: "Observações devem ter no máximo 2000 caracteres" });
  }

  if (data.legacy_code && data.legacy_code.length > 50) {
    errors.push({ field: "legacy_code", message: "Código legado deve ter no máximo 50 caracteres" });
  }

  return errors;
}

export function getFieldError(errors: ValidationError[], field: string): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

export function hasErrors(errors: ValidationError[]): boolean {
  return errors.length > 0;
}
