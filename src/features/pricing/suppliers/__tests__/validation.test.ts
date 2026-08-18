import { describe, it, expect } from "vitest";
import {
  validateCompanyForm,
  validateSupplierForm,
  validateMappingForm,
  getFieldError,
  hasErrors,
} from "../schemas/validation";

function makeValidCompany() {
  return { legal_name: "Laboratório XYZ Ltda", trade_name: "XYZ Lab", tax_id: "12.345.678/0001-90" };
}

function makeValidSupplier() {
  return { supplier_category: "laboratory" as const, payment_terms: "30 dias", contract_reference: "CTR-001", notes: "" };
}

function makeValidMapping() {
  return {
    catalog_item_id: "item-1",
    external_code: "HEM",
    external_name: "Hemograma Completo",
    external_unit: "unidade",
    is_preferred: false,
    valid_from: "",
    valid_to: "",
    notes: "",
  };
}

describe("validateCompanyForm", () => {
  it("accepts valid data", () => {
    expect(validateCompanyForm(makeValidCompany())).toHaveLength(0);
  });

  it("requires legal_name", () => {
    const errors = validateCompanyForm({ ...makeValidCompany(), legal_name: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("legal_name");
  });

  it("rejects short legal_name", () => {
    const errors = validateCompanyForm({ ...makeValidCompany(), legal_name: "A" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("legal_name");
  });

  it("rejects long legal_name", () => {
    const errors = validateCompanyForm({ ...makeValidCompany(), legal_name: "A".repeat(256) });
    expect(errors).toHaveLength(1);
  });

  it("validates CNPJ length", () => {
    const errors = validateCompanyForm({ ...makeValidCompany(), tax_id: "12345" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("tax_id");
  });

  it("accepts empty tax_id", () => {
    const errors = validateCompanyForm({ ...makeValidCompany(), tax_id: "" });
    expect(errors).toHaveLength(0);
  });

  it("accepts valid CPF", () => {
    const errors = validateCompanyForm({ ...makeValidCompany(), tax_id: "123.456.789-00" });
    expect(errors).toHaveLength(0);
  });
});

describe("validateSupplierForm", () => {
  it("accepts valid data", () => {
    expect(validateSupplierForm(makeValidSupplier())).toHaveLength(0);
  });

  it("requires supplier_category", () => {
    const errors = validateSupplierForm({ ...makeValidSupplier(), supplier_category: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("supplier_category");
  });

  it("rejects long payment_terms", () => {
    const errors = validateSupplierForm({ ...makeValidSupplier(), payment_terms: "A".repeat(256) });
    expect(errors).toHaveLength(1);
  });

  it("rejects long notes", () => {
    const errors = validateSupplierForm({ ...makeValidSupplier(), notes: "A".repeat(2001) });
    expect(errors).toHaveLength(1);
  });
});

describe("validateMappingForm", () => {
  it("accepts valid data", () => {
    expect(validateMappingForm(makeValidMapping())).toHaveLength(0);
  });

  it("requires catalog_item_id", () => {
    const errors = validateMappingForm({ ...makeValidMapping(), catalog_item_id: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("catalog_item_id");
  });

  it("requires external_name", () => {
    const errors = validateMappingForm({ ...makeValidMapping(), external_name: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("external_name");
  });

  it("rejects long external_name", () => {
    const errors = validateMappingForm({ ...makeValidMapping(), external_name: "A".repeat(256) });
    expect(errors).toHaveLength(1);
  });

  it("rejects long external_code", () => {
    const errors = validateMappingForm({ ...makeValidMapping(), external_code: "A".repeat(101) });
    expect(errors).toHaveLength(1);
  });

  it("rejects invalid validity range", () => {
    const errors = validateMappingForm({
      ...makeValidMapping(),
      valid_from: "2026-12-31",
      valid_to: "2026-01-01",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("valid_to");
  });

  it("accepts empty validity", () => {
    const errors = validateMappingForm({ ...makeValidMapping(), valid_from: "", valid_to: "" });
    expect(errors).toHaveLength(0);
  });
});

describe("getFieldError", () => {
  it("finds error by field", () => {
    const errors = [{ field: "name", message: "Required" }];
    expect(getFieldError(errors, "name")).toBe("Required");
  });

  it("returns undefined for missing field", () => {
    expect(getFieldError([], "name")).toBeUndefined();
  });
});

describe("hasErrors", () => {
  it("returns true when errors exist", () => {
    expect(hasErrors([{ field: "x", message: "y" }])).toBe(true);
  });

  it("returns false when empty", () => {
    expect(hasErrors([])).toBe(false);
  });
});
