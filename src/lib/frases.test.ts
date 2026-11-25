import { describe, expect, it } from "vitest";

import { FRASES, sortearFrase } from "./frases";

describe("frases da taverna", () => {
  it("tem muitas frases, sem repetição", () => {
    expect(FRASES.length).toBeGreaterThanOrEqual(80);
    expect(new Set(FRASES.map((f) => f.texto)).size).toBe(FRASES.length);
  });
  it("sorteia dentro da lista, inclusive nas pontas", () => {
    expect(sortearFrase(() => 0)).toBe(FRASES[0]);
    expect(sortearFrase(() => 0.999999)).toBe(FRASES[FRASES.length - 1]);
  });
});
