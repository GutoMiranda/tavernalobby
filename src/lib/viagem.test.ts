import { describe, expect, it } from "vitest";

import { duracaoDaApi, formatarDistancia, formatarDuracao, indiceJustica, type Tempo } from "./viagem";

describe("formatação", () => {
  it("formata duração e distância", () => {
    expect(formatarDuracao(45 * 60)).toBe("45 min");
    expect(formatarDuracao(3 * 3600 + 20 * 60)).toBe("3h20");
    expect(formatarDuracao(2 * 3600)).toBe("2h");
    expect(formatarDistancia(800)).toBe("800 m");
    expect(formatarDistancia(250_400)).toBe("250 km");
    expect(formatarDistancia(1_250_000)).toBe("1.250 km");
  });

  it("lê a duração da Routes API", () => {
    expect(duracaoDaApi("12345s")).toBe(12345);
    expect(duracaoDaApi(undefined)).toBeNull();
  });
});

describe("índice de justiça", () => {
  const t = (h: string, a: string, s: number | null): Tempo => ({
    household_id: h,
    accommodation_id: a,
    duration_seconds: s,
    distance_meters: null,
  });
  const tempos = [t("n1", "e1", 3600), t("n2", "e1", 7200), t("n3", "e1", null), t("n1", "e2", 600)];

  it("calcula média e máximo, ignorando quem não tem rota", () => {
    expect(indiceJustica(tempos, "e1")).toEqual({ mediaSegundos: 5400, maximoSegundos: 7200, nucleos: 2 });
  });

  it("pode considerar só alguns núcleos", () => {
    expect(indiceJustica(tempos, "e1", new Set(["n1"]))).toEqual({ mediaSegundos: 3600, maximoSegundos: 3600, nucleos: 1 });
  });

  it("sem tempos, sem índice", () => {
    expect(indiceJustica(tempos, "e9")).toBeNull();
  });
});
