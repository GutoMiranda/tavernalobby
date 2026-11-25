import { describe, expect, it } from "vitest";

import { linkSeguro, linksDeBusca, menorPorModo, ordenarPrecos } from "./passagens";

describe("busca de passagens", () => {
  it("monta a busca de voos já com origem, destino e datas", () => {
    const [google] = linksDeBusca("aviao", { de: "Campinas", para: "Recife", ida: "2027-04-01", volta: "2027-04-04" });
    expect(google.rotulo).toBe("Google Voos");
    expect(decodeURIComponent(google.url)).toContain("Voos de Campinas para Recife em 2027-04-01 volta em 2027-04-04");
    expect(google.url).toContain("curr=BRL");
  });

  it("monta a busca de ônibus com data em dd/mm/aaaa e sem volta quando não há", () => {
    const [google] = linksDeBusca("onibus", { de: "Campinas", para: "Paraty", ida: "2027-04-01", volta: null });
    expect(decodeURIComponent(google.url)).toContain("passagem de ônibus de Campinas para Paraty 01/04/2027");
    expect(decodeURIComponent(google.url)).not.toContain("volta");
  });

  it("ordena do mais barato e acha o menor por modo", () => {
    const precos = [
      { id: "a", mode: "onibus" as const, price_cents: 30000, household_id: "n", created_at: "2026-11-01" },
      { id: "b", mode: "aviao" as const, price_cents: 90000, household_id: "n", created_at: "2026-11-01" },
      { id: "c", mode: "onibus" as const, price_cents: 25000, household_id: "n", created_at: "2026-11-02" },
    ];
    expect(ordenarPrecos(precos).map((p) => p.id)).toEqual(["c", "a", "b"]);
    expect(menorPorModo(precos)).toEqual({ onibus: 25000, aviao: 90000 });
    expect(menorPorModo([])).toEqual({ onibus: null, aviao: null });
  });

  it("só aceita link https", () => {
    expect(linkSeguro("https://www.buser.com.br/x")).toBe("https://www.buser.com.br/x");
    expect(linkSeguro("http://site.com")).toBeNull();
    expect(linkSeguro("javascript:alert(1)")).toBeNull();
    expect(linkSeguro("  ")).toBeNull();
  });
});
