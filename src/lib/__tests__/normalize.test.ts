import { describe, it, expect } from "vitest";
import { normalizeText, matchesSearch } from "@/lib/normalize";

describe("normalizeText", () => {
  it("lowercases text", () => {
    expect(normalizeText("HELLO WORLD")).toBe("hello world");
  });

  it("trims whitespace", () => {
    expect(normalizeText("  hello  ")).toBe("hello");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeText("hello   world")).toBe("hello world");
  });

  it("removes accents", () => {
    expect(normalizeText("Hemograma Completo")).toBe("hemograma completo");
    expect(normalizeText("AÇÃO")).toBe("acao");
    expect(normalizeText("EXAME DE VISÃO")).toBe("exame de visao");
  });

  it("handles mixed case with accents", () => {
    expect(normalizeText("HemÓGRAMA COMPLETO")).toBe("hemograma completo");
  });

  it("preserves numbers", () => {
    expect(normalizeText("EXA-000001")).toBe("exa-000001");
  });

  it("handles empty string", () => {
    expect(normalizeText("")).toBe("");
  });
});

describe("matchesSearch", () => {
  it("matches exact text", () => {
    expect(matchesSearch("hemograma completo", "hemograma")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(matchesSearch("hemograma completo", "HEMOGRAMA")).toBe(true);
  });

  it("matches partial text", () => {
    expect(matchesSearch("hemograma completo", "compl")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesSearch("hemograma completo", "radiologia")).toBe(false);
  });

  it("handles accented search queries", () => {
    expect(matchesSearch("acao de graça", "ação")).toBe(true);
  });
});
