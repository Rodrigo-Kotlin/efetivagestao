// ============================================================
// CUI-FMT01..CUI-FMT20 — formatting utility tests.
// pt-BR currency/date rendering and money-input parsing for the
// client pricing UI. Intl inserts NBSP (U+00A0) in pt-BR currency
// output; brl() normalizes it so expectations use plain spaces.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  describeProfileStatus,
  describeWorkflowStatus,
  formatCurrency,
  formatDate,
  formatDateExclusive,
  parseMoneyInput,
} from "../utils/format";

function brl(value: string): string {
  return value.replace(/\u00A0/g, " ");
}

describe("formatCurrency (CUI-FMT01..04)", () => {
  it("CUI-FMT01: formatCurrency(92) returns 'R$ 92,00'", () => {
    expect(brl(formatCurrency(92))).toBe("R$ 92,00");
  });

  it("CUI-FMT02: formatCurrency(92.5) returns 'R$ 92,50'", () => {
    expect(brl(formatCurrency(92.5))).toBe("R$ 92,50");
  });

  it("CUI-FMT03: formatCurrency(0) returns 'R$ 0,00'", () => {
    expect(brl(formatCurrency(0))).toBe("R$ 0,00");
  });

  it("CUI-FMT04: formatCurrency(null) returns '—'", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
  });
});

describe("formatDate (CUI-FMT05..06)", () => {
  it("CUI-FMT05: formatDate('2026-01-15') returns '15/01/2026'", () => {
    expect(formatDate("2026-01-15")).toBe("15/01/2026");
  });

  it("CUI-FMT06: formatDate(null) returns '—'", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
  });
});

describe("formatDateExclusive (CUI-FMT07..08)", () => {
  it("CUI-FMT07: formatDateExclusive('2027-01-01') returns 'até antes de 01/01/2027'", () => {
    expect(formatDateExclusive("2027-01-01")).toBe(
      "até antes de 01/01/2027"
    );
  });

  it("CUI-FMT08: formatDateExclusive(null) returns 'sem data final'", () => {
    expect(formatDateExclusive(null)).toBe("sem data final");
    expect(formatDateExclusive(undefined)).toBe("sem data final");
  });
});

describe("parseMoneyInput (CUI-FMT09..16)", () => {
  it("CUI-FMT09: parseMoneyInput('92') returns 92", () => {
    expect(parseMoneyInput("92")).toBe(92);
  });

  it("CUI-FMT10: parseMoneyInput('92,50') returns 92.5", () => {
    expect(parseMoneyInput("92,50")).toBe(92.5);
  });

  it("CUI-FMT11: parseMoneyInput('R$ 92,50') returns 92.5", () => {
    expect(parseMoneyInput("R$ 92,50")).toBe(92.5);
  });

  it("CUI-FMT12: parseMoneyInput('0') returns 0", () => {
    expect(parseMoneyInput("0")).toBe(0);
  });

  it("CUI-FMT13: parseMoneyInput('R$ 0,00') returns 0", () => {
    expect(parseMoneyInput("R$ 0,00")).toBe(0);
  });

  it("CUI-FMT14: parseMoneyInput('-5') returns null (negative rejected)", () => {
    expect(parseMoneyInput("-5")).toBeNull();
  });

  it("CUI-FMT15: parseMoneyInput('') returns null", () => {
    expect(parseMoneyInput("")).toBeNull();
  });

  it("CUI-FMT16: parseMoneyInput('abc') returns null", () => {
    expect(parseMoneyInput("abc")).toBeNull();
  });
});

describe("status descriptions (CUI-FMT17..20)", () => {
  it("CUI-FMT17: describeProfileStatus('active') returns 'Ativo'", () => {
    expect(describeProfileStatus("active")).toBe("Ativo");
  });

  it("CUI-FMT18: describeProfileStatus('blocked') returns 'Bloqueado'", () => {
    expect(describeProfileStatus("blocked")).toBe("Bloqueado");
  });

  it("CUI-FMT19: describeWorkflowStatus('draft') returns 'Rascunho'", () => {
    expect(describeWorkflowStatus("draft")).toBe("Rascunho");
  });

  it("CUI-FMT20: describeWorkflowStatus('superseded') returns 'Substituída'", () => {
    expect(describeWorkflowStatus("superseded")).toBe("Substituída");
  });
});
