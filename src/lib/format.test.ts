import { describe, expect, it } from "vitest";

import { formatarCentavos, formatarData, formatarDataHora } from "./format";

describe("formatarCentavos", () => {
  it("formata no padrão R$ 1.234,56", () => {
    expect(formatarCentavos(123456)).toBe("R$ 1.234,56");
    expect(formatarCentavos(32143)).toBe("R$ 321,43");
    expect(formatarCentavos(0)).toBe("R$ 0,00");
  });

  it("recusa valores que não são centavos inteiros", () => {
    expect(() => formatarCentavos(10.5)).toThrow();
  });
});

describe("formatarData", () => {
  it("usa dd/mm/aaaa no fuso de São Paulo", () => {
    // 02:00 UTC do dia 1º ainda é dia 31 em São Paulo (UTC−3).
    expect(formatarData("2026-01-01T02:00:00Z")).toBe("31/12/2025");
    expect(formatarData(new Date("2026-03-15T15:00:00Z"))).toBe("15/03/2026");
  });
});

describe("formatarDataHora", () => {
  it("usa o fuso de São Paulo", () => {
    expect(formatarDataHora("2026-11-24T15:30:00Z")).toBe("24/11/2026, 12:30");
  });
});
