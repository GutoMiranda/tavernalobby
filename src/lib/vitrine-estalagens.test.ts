import { describe, expect, it } from "vitest";

import {
  FILTROS_VAZIOS,
  type ItemVitrineBase,
  maisCurtidas,
  montarVitrine,
  rotuloEstalagemNaRota,
} from "./vitrine-estalagens";

const item = (id: string, extra: Partial<ItemVitrineBase> = {}): ItemVitrineBase => ({
  id,
  nome: `Estalagem ${id}`,
  precoCentavos: 100_000,
  capacidade: 10,
  curtidas: 0,
  descurtidas: 0,
  minha: null,
  posicao: 1,
  temFotos: false,
  criadaEm: "2026-11-20T10:00:00Z",
  segundosDoEncontro: null,
  ...extra,
});

describe("Vitrine das estalagens", () => {
  it("destaca a mais curtida e, no empate, todas", () => {
    expect([...maisCurtidas([item("a", { curtidas: 3 }), item("b", { curtidas: 1 })])]).toEqual(["a"]);
    expect([...maisCurtidas([item("a", { curtidas: 2 }), item("b", { curtidas: 2 }), item("c")])].sort()).toEqual([
      "a",
      "b",
    ]);
    expect(maisCurtidas([item("a"), item("b")]).size).toBe(0);
  });

  it("o destaque fica em primeiro mesmo quando o filtro o esconderia", () => {
    const itens = [
      item("cara", { curtidas: 4, precoCentavos: 500_000, posicao: 1 }),
      item("barata", { curtidas: 1, precoCentavos: 90_000, posicao: 2 }),
      item("media", { precoCentavos: 200_000, posicao: 3 }),
    ];
    const v = montarVitrine(itens, { ...FILTROS_VAZIOS, precoMaxCentavos: 150_000 }, "ranking");
    expect(v.destaques.map((i) => i.id)).toEqual(["cara"]);
    expect(v.demais.map((i) => i.id)).toEqual(["barata"]);
    expect(v.escondidas).toBe(1);
  });

  it("filtra por nome sem acento, capacidade, reação e fotos", () => {
    const itens = [
      item("1", { nome: "Chalé da Serra", capacidade: 20, minha: 1, temFotos: true }),
      item("2", { nome: "Pousada Lago", capacidade: 8 }),
    ];
    const ids = (f: Partial<typeof FILTROS_VAZIOS>) =>
      montarVitrine(itens, { ...FILTROS_VAZIOS, ...f }, "ranking").demais.map((i) => i.id);
    expect(ids({ busca: "chale" })).toEqual(["1"]);
    expect(ids({ capacidadeMin: 10 })).toEqual(["1"]);
    expect(ids({ reacao: "curti" })).toEqual(["1"]);
    expect(ids({ reacao: "sem_voto" })).toEqual(["2"]);
    expect(ids({ soComFotos: true })).toEqual(["1"]);
  });

  it("ordena por preço, novidade e distância do ponto de encontro", () => {
    const itens = [
      item("a", { precoCentavos: 300, criadaEm: "2026-11-01", segundosDoEncontro: 900, posicao: 1 }),
      item("b", { precoCentavos: 100, criadaEm: "2026-11-03", segundosDoEncontro: null, posicao: 2 }),
      item("c", { precoCentavos: 200, criadaEm: "2026-11-02", segundosDoEncontro: 300, posicao: 3 }),
    ];
    const ordem = (o: Parameters<typeof montarVitrine>[2]) =>
      montarVitrine(itens, FILTROS_VAZIOS, o).demais.map((i) => i.id);
    expect(ordem("menor_preco")).toEqual(["b", "c", "a"]);
    expect(ordem("maior_preco")).toEqual(["a", "c", "b"]);
    expect(ordem("mais_novas")).toEqual(["b", "c", "a"]);
    expect(ordem("mais_perto")).toEqual(["c", "a", "b"]);
  });

  it("marca a definida, a mais votada e a posição na lista das rotas", () => {
    const base = { nome: "Chalé", definida: false, maisCurtida: false, empate: false, curtidas: 0, posicao: 3 };
    expect(rotuloEstalagemNaRota({ ...base, definida: true, curtidas: 2 })).toBe("✅ Estalagem definida: Chalé");
    expect(rotuloEstalagemNaRota({ ...base, maisCurtida: true, curtidas: 3 })).toBe(
      "⭐ Mais votada: Chalé (3 curtidas)",
    );
    expect(rotuloEstalagemNaRota({ ...base, maisCurtida: true, empate: true, curtidas: 1 })).toBe(
      "⭐ Mais votada (empate): Chalé (1 curtida)",
    );
    expect(rotuloEstalagemNaRota(base)).toBe("Estalagem 3º: Chalé");
  });
});
