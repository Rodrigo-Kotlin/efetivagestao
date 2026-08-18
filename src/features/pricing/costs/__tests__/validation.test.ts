import { describe, it, expect } from "vitest";
import {
  validateCostTableForm,
  validateCostVersionForm,
  validateCostItemForm,
  getFieldError,
  hasErrors,
} from "../schemas/validation";

function makeValidCostTable() {
  return {
    supplier_company_id: "supplier-1",
    code: "TAB-001",
    name: "Tabela de Custos 2026",
    description: "Tabela principal de custos do fornecedor",
  };
}

function makeValidCostVersion() {
  return {
    valid_from: "2026-01-01",
    valid_to: "2026-12-31",
    version_label: "Versão 1",
    source_date: "2025-12-15",
    notes: "Primeira versão do ano",
  };
}

function makeValidCostItem() {
  return {
    supplier_catalog_item_id: "mapping-1",
    catalog_item_id: "item-1",
    cost_status: "provided" as const,
    amount: 25.5,
    currency_code: "BRL",
    notes: "",
  };
}

describe("validateCostTableForm", () => {
  it("accepts valid data", () => {
    expect(validateCostTableForm(makeValidCostTable())).toHaveLength(0);
  });

  it("requires supplier_company_id", () => {
    const errors = validateCostTableForm({ ...makeValidCostTable(), supplier_company_id: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("supplier_company_id");
  });

  it("requires code", () => {
    const errors = validateCostTableForm({ ...makeValidCostTable(), code: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("code");
  });

  it("rejects long code", () => {
    const errors = validateCostTableForm({ ...makeValidCostTable(), code: "A".repeat(51) });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("code");
  });

  it("rejects invalid code characters", () => {
    const errors = validateCostTableForm({ ...makeValidCostTable(), code: "TAB 001!" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("code");
  });

  it("accepts code with dots, hyphens, underscores", () => {
    const errors = validateCostTableForm({ ...makeValidCostTable(), code: "TAB-001_v2.0" });
    expect(errors).toHaveLength(0);
  });

  it("requires name", () => {
    const errors = validateCostTableForm({ ...makeValidCostTable(), name: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("name");
  });

  it("rejects long name", () => {
    const errors = validateCostTableForm({ ...makeValidCostTable(), name: "A".repeat(256) });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("name");
  });

  it("rejects long description", () => {
    const errors = validateCostTableForm({ ...makeValidCostTable(), description: "A".repeat(2001) });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("description");
  });

  it("accepts empty description", () => {
    const errors = validateCostTableForm({ ...makeValidCostTable(), description: "" });
    expect(errors).toHaveLength(0);
  });
});

describe("validateCostVersionForm", () => {
  it("accepts valid data", () => {
    expect(validateCostVersionForm(makeValidCostVersion())).toHaveLength(0);
  });

  it("requires valid_from", () => {
    const errors = validateCostVersionForm({ ...makeValidCostVersion(), valid_from: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("valid_from");
  });

  it("rejects valid_to before valid_from", () => {
    const errors = validateCostVersionForm({
      ...makeValidCostVersion(),
      valid_from: "2026-12-31",
      valid_to: "2026-01-01",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("valid_to");
  });

  it("accepts empty valid_to (open-ended)", () => {
    const errors = validateCostVersionForm({ ...makeValidCostVersion(), valid_to: "" });
    expect(errors).toHaveLength(0);
  });

  it("rejects long version_label", () => {
    const errors = validateCostVersionForm({ ...makeValidCostVersion(), version_label: "A".repeat(101) });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("version_label");
  });

  it("rejects long notes", () => {
    const errors = validateCostVersionForm({ ...makeValidCostVersion(), notes: "A".repeat(2001) });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("notes");
  });
});

describe("validateCostItemForm", () => {
  it("accepts valid provided cost", () => {
    expect(validateCostItemForm(makeValidCostItem())).toHaveLength(0);
  });

  it("accepts valid confirmed_zero cost", () => {
    const errors = validateCostItemForm({ ...makeValidCostItem(), cost_status: "confirmed_zero", amount: 0 });
    expect(errors).toHaveLength(0);
  });

  it("requires supplier_catalog_item_id", () => {
    const errors = validateCostItemForm({ ...makeValidCostItem(), supplier_catalog_item_id: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("supplier_catalog_item_id");
  });

  it("requires cost_status", () => {
    const errors = validateCostItemForm({ ...makeValidCostItem(), cost_status: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("cost_status");
  });

  it("requires amount for provided", () => {
    const errors = validateCostItemForm({ ...makeValidCostItem(), amount: null });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("amount");
  });

  it("rejects negative amount for provided", () => {
    const errors = validateCostItemForm({ ...makeValidCostItem(), amount: -5 });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("amount");
  });

  it("accepts zero amount for provided", () => {
    const errors = validateCostItemForm({ ...makeValidCostItem(), amount: 0 });
    expect(errors).toHaveLength(0);
  });

  it("rejects non-zero amount for confirmed_zero", () => {
    const errors = validateCostItemForm({ ...makeValidCostItem(), cost_status: "confirmed_zero", amount: 5 });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("amount");
  });

  it("does not require amount for not_provided", () => {
    const errors = validateCostItemForm({
      ...makeValidCostItem(),
      cost_status: "not_provided",
      amount: null,
    });
    expect(errors).toHaveLength(0);
  });

  it("does not require amount for awaiting_quote", () => {
    const errors = validateCostItemForm({
      ...makeValidCostItem(),
      cost_status: "awaiting_quote",
      amount: null,
    });
    expect(errors).toHaveLength(0);
  });

  it("does not require amount for discontinued", () => {
    const errors = validateCostItemForm({
      ...makeValidCostItem(),
      cost_status: "discontinued",
      amount: null,
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects invalid currency code length", () => {
    const errors = validateCostItemForm({ ...makeValidCostItem(), currency_code: "BR" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("currency_code");
  });

  it("rejects long notes", () => {
    const errors = validateCostItemForm({ ...makeValidCostItem(), notes: "A".repeat(2001) });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("notes");
  });
});

describe("getFieldError", () => {
  it("finds error by field", () => {
    const errors = [{ field: "code", message: "Required" }];
    expect(getFieldError(errors, "code")).toBe("Required");
  });

  it("returns undefined for missing field", () => {
    expect(getFieldError([], "code")).toBeUndefined();
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
