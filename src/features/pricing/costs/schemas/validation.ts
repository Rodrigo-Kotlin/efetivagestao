import type { CostItemStatus } from "@/types";

interface ValidationError {
  field: string;
  message: string;
}

export interface CostTableFormData {
  supplier_company_id: string;
  code: string;
  name: string;
  description: string;
}

export interface CostVersionFormData {
  valid_from: string;
  valid_to: string;
  version_label: string;
  source_date: string;
  notes: string;
}

export interface CostItemFormData {
  supplier_catalog_item_id: string;
  catalog_item_id: string;
  cost_status: CostItemStatus | "";
  amount: number | null;
  currency_code: string;
  notes: string;
}

export function validateCostTableForm(data: CostTableFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.supplier_company_id) {
    errors.push({ field: "supplier_company_id", message: "Fornecedor é obrigatório" });
  }

  if (!data.code.trim()) {
    errors.push({ field: "code", message: "Código é obrigatório" });
  } else if (data.code.trim().length > 50) {
    errors.push({ field: "code", message: "Código deve ter no máximo 50 caracteres" });
  } else if (!/^[A-Za-z0-9._-]+$/.test(data.code.trim())) {
    errors.push({ field: "code", message: "Código deve conter apenas letras, números, pontos, hífens ou underscores" });
  }

  if (!data.name.trim()) {
    errors.push({ field: "name", message: "Nome é obrigatório" });
  } else if (data.name.trim().length > 255) {
    errors.push({ field: "name", message: "Nome deve ter no máximo 255 caracteres" });
  }

  if (data.description && data.description.length > 2000) {
    errors.push({ field: "description", message: "Descrição deve ter no máximo 2000 caracteres" });
  }

  return errors;
}

export function validateCostVersionForm(data: CostVersionFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.valid_from) {
    errors.push({ field: "valid_from", message: "Data de vigência inicial é obrigatória" });
  }

  if (data.valid_from && data.valid_to && new Date(data.valid_from) >= new Date(data.valid_to)) {
    errors.push({ field: "valid_to", message: "Data de vigência final deve ser posterior à inicial" });
  }

  if (data.version_label && data.version_label.length > 100) {
    errors.push({ field: "version_label", message: "Rótulo deve ter no máximo 100 caracteres" });
  }

  if (data.notes && data.notes.length > 2000) {
    errors.push({ field: "notes", message: "Observações devem ter no máximo 2000 caracteres" });
  }

  return errors;
}

export function validateCostItemForm(data: CostItemFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.supplier_catalog_item_id) {
    errors.push({ field: "supplier_catalog_item_id", message: "Item de mapeamento é obrigatório" });
  }

  if (!data.cost_status) {
    errors.push({ field: "cost_status", message: "Status do custo é obrigatório" });
  }

  if (data.cost_status === "provided") {
    if (data.amount === null || data.amount === undefined) {
      errors.push({ field: "amount", message: "Valor é obrigatório para custo informado" });
    } else if (data.amount < 0) {
      errors.push({ field: "amount", message: "Valor deve ser maior ou igual a zero" });
    }
  }

  if (data.cost_status === "confirmed_zero") {
    if (data.amount !== 0) {
      errors.push({ field: "amount", message: "Valor deve ser zero para custo confirmado como zero" });
    }
  }

  if (data.currency_code && data.currency_code.length !== 3) {
    errors.push({ field: "currency_code", message: "Código de moeda deve ter 3 caracteres" });
  }

  if (data.notes && data.notes.length > 2000) {
    errors.push({ field: "notes", message: "Observações devem ter no máximo 2000 caracteres" });
  }

  return errors;
}

export function getFieldError(errors: ValidationError[], field: string): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

export function hasErrors(errors: ValidationError[]): boolean {
  return errors.length > 0;
}
