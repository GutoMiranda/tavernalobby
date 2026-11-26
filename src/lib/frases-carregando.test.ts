import { describe, expect, it } from "vitest";

import { FRASES_CARREGANDO, proximaFrase } from "./frases-carregando";

describe("frases de carregamento", () => {
  it("são várias, sem repetição, e terminam em reticências", () => {
    expect(FRASES_CARREGANDO.length).toBeGreaterThanOrEqual(12);
    expect(new Set(FRASES_CARREGANDO).size).toBe(FRASES_CARREGANDO.length);
    expect(FRASES_CARREGANDO.every((f) => f.endsWith("…"))).toBe(true);
  });

  it("a próxima frase nunca é a mesma e fica dentro da lista", () => {
    for (const sorteio of [0, 0.3, 0.5, 0.99]) {
      for (const atual of [0, 5, FRASES_CARREGANDO.length - 1]) {
        const p = proximaFrase(atual, sorteio);
        expect(p).not.toBe(atual);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(FRASES_CARREGANDO.length);
      }
    }
    expect(proximaFrase(0, 0.5, 1)).toBe(0);
  });
});
