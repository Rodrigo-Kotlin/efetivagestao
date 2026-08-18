import { describe, it, expect } from "vitest";
import { validateCatalogItem, getFieldError, type CatalogItemFormData } from "../schemas/validation";

function makeValidForm(overrides: Partial<CatalogItemFormData> = {}): CatalogItemFormData {
  return {
    item_type: "laboratory_exam",
    name: "Hemograma Completo",
    short_name: "",
    category_id: "",
    commercial_unit: "exame",
    execution_type: "own",
    legacy_code: "",
    description: "",
    notes: "",
    ...overrides,
  };
}

describe("validateCatalogItem", () => {
  it("returns no errors for valid form", () => {
    const errors = validateCatalogItem(makeValidForm());
    expect(errors).toHaveLength(0);
  });

  it("requires item_type", () => {
    const errors = validateCatalogItem(makeValidForm({ item_type: "" }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "item_type" }),
      ])
    );
  });

  it("requires name", () => {
    const errors = validateCatalogItem(makeValidForm({ name: "" }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "name" }),
      ])
    );
  });

  it("rejects name shorter than 2 chars", () => {
    const errors = validateCatalogItem(makeValidForm({ name: "A" }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "name", message: expect.stringContaining("2 caracteres") }),
      ])
    );
  });

  it("rejects name longer than 255 chars", () => {
    const errors = validateCatalogItem(makeValidForm({ name: "A".repeat(256) }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "name" }),
      ])
    );
  });

  it("requires commercial_unit", () => {
    const errors = validateCatalogItem(makeValidForm({ commercial_unit: "" }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "commercial_unit" }),
      ])
    );
  });

  it("requires execution_type", () => {
    const errors = validateCatalogItem(makeValidForm({ execution_type: "" }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "execution_type" }),
      ])
    );
  });

  it("validates short_name length", () => {
    const errors = validateCatalogItem(makeValidForm({ short_name: "A".repeat(101) }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "short_name" }),
      ])
    );
  });

  it("validates description length", () => {
    const errors = validateCatalogItem(makeValidForm({ description: "A".repeat(2001) }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "description" }),
      ])
    );
  });

  it("validates notes length", () => {
    const errors = validateCatalogItem(makeValidForm({ notes: "A".repeat(2001) }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "notes" }),
      ])
    );
  });

  it("validates legacy_code length", () => {
    const errors = validateCatalogItem(makeValidForm({ legacy_code: "A".repeat(51) }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "legacy_code" }),
      ])
    );
  });
});

describe("getFieldError", () => {
  it("returns error message for field", () => {
    const errors = [{ field: "name", message: "Obrigatório" }];
    expect(getFieldError(errors, "name")).toBe("Obrigatório");
  });

  it("returns undefined for missing field", () => {
    const errors = [{ field: "name", message: "Obrigatório" }];
    expect(getFieldError(errors, "other")).toBeUndefined();
  });
});
