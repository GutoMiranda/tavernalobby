import { describe, expect, it } from "vitest";

import { centavosParaCampo, reaisParaCentavos } from "./dinheiro";

describe("reaisParaCentavos", () => {
  it("entende o formato brasileiro", () => {
    expect(reaisParaCentavos("1.234,56")).toBe(123456);
    expect(reaisParaCentavos("R$ 3.000,00")).toBe(300000);
    expect(reaisParaCentavos("321,4")).toBe(32140);
    expect(reaisParaCentavos("300")).toBe(30000);
    expect(reaisParaCentavos("1.500")).toBe(150000);
  });

  it("aceita ponto decimal", () => {
    expect(reaisParaCentavos("300.50")).toBe(30050);
  });

  it("recusa textos inválidos", () => {
    expect(reaisParaCentavos("")).toBeNull();
    expect(reaisParaCentavos("abc")).toBeNull();
    expect(reaisParaCentavos("1,234")).toBeNull();
    expect(reaisParaCentavos("-10")).toBeNull();
  });

  it("volta para o campo", () => {
    expect(centavosParaCampo(123456)).toBe("1234,56");
  });
});
