import type { SupplierCategory } from "@/types";

interface ValidationError {
  field: string;
  message: string;
}

export interface CompanyFormData {
  legal_name: string;
  trade_name: string;
  tax_id: string;
}

export interface SupplierProfileFormData {
  supplier_category: SupplierCategory | "";
  payment_terms: string;
  contract_reference: string;
  notes: string;
}

export interface SupplierFormData extends CompanyFormData, SupplierProfileFormData {}

export function validateCompanyForm(data: CompanyFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.legal_name.trim()) {
    errors.push({ field: "legal_name", message: "Razão Social é obrigatória" });
  } else if (data.legal_name.trim().length < 2) {
    errors.push({ field: "legal_name", message: "Razão Social deve ter pelo menos 2 caracteres" });
  } else if (data.legal_name.trim().length > 255) {
    errors.push({ field: "legal_name", message: "Razão Social deve ter no máximo 255 caracteres" });
  }

  if (data.trade_name && data.trade_name.length > 255) {
    errors.push({ field: "trade_name", message: "Nome Fantasia deve ter no máximo 255 caracteres" });
  }

  if (data.tax_id && data.tax_id.replace(/\D/g, "").length !== 14 && data.tax_id.replace(/\D/g, "").length !== 11) {
    errors.push({ field: "tax_id", message: "CNPJ/CPF deve ter 14 ou 11 dígitos" });
  }

  return errors;
}

export function validateSupplierForm(data: SupplierProfileFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.supplier_category) {
    errors.push({ field: "supplier_category", message: "Categoria é obrigatória" });
  }

  if (data.payment_terms && data.payment_terms.length > 255) {
    errors.push({ field: "payment_terms", message: "Condições de pagamento devem ter no máximo 255 caracteres" });
  }

  if (data.contract_reference && data.contract_reference.length > 255) {
    errors.push({ field: "contract_reference", message: "Referência do contrato deve ter no máximo 255 caracteres" });
  }

  if (data.notes && data.notes.length > 2000) {
    errors.push({ field: "notes", message: "Observações devem ter no máximo 2000 caracteres" });
  }

  return errors;
}

export function validateSupplierFormData(data: SupplierFormData): ValidationError[] {
  return [...validateCompanyForm(data), ...validateSupplierForm(data)];
}

export interface MappingFormData {
  catalog_item_id: string;
  external_code: string;
  external_name: string;
  external_unit: string;
  is_preferred: boolean;
  valid_from: string;
  valid_to: string;
  notes: string;
}

export function validateMappingForm(data: MappingFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.catalog_item_id) {
    errors.push({ field: "catalog_item_id", message: "Item do catálogo é obrigatório" });
  }

  if (!data.external_name.trim()) {
    errors.push({ field: "external_name", message: "Nome externo é obrigatório" });
  } else if (data.external_name.trim().length > 255) {
    errors.push({ field: "external_name", message: "Nome externo deve ter no máximo 255 caracteres" });
  }

  if (data.external_code && data.external_code.length > 100) {
    errors.push({ field: "external_code", message: "Código externo deve ter no máximo 100 caracteres" });
  }

  if (data.external_unit && data.external_unit.length > 50) {
    errors.push({ field: "external_unit", message: "Unidade externa deve ter no máximo 50 caracteres" });
  }

  if (data.valid_from && data.valid_to && new Date(data.valid_from) > new Date(data.valid_to)) {
    errors.push({ field: "valid_to", message: "Data de término deve ser posterior à data de início" });
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
