import { describe, expect, it } from "vitest";

import { diasEfetivos, type ItemRateio, type PessoaRateio, ratearItem, ratearTudo } from "./rateio";

const adulto = (id: string, extra: Partial<PessoaRateio> = {}): PessoaRateio => ({
  id,
  nome: id,
  nucleoId: `n-${id}`,
  crianca: false,
  vai: true,
  dias: null,
  alcool: false,
  ...extra,
});

const item = (extra: Partial<ItemRateio> = {}): ItemRateio => ({
  id: "i",
  categoria: "acomodacao",
  descricao: "Casa",
  valorCentavos: 300000,
  elegibilidade: "presentes",
  proporcionalDias: true,
  adesoes: [],
  pesos: {},
  ...extra,
});

const ADMIN = { pessoaId: "admin", nucleoId: "n-admin" };

describe("exemplo obrigatório do escopo: R$ 3.000, 3 dias, 28 dias-pessoa", () => {
  // 9 adultos ficam 3 dias (o admin entre eles) e 1 adulto fica 1 dia.
  const pessoas = [
    adulto("admin"),
    ...Array.from({ length: 8 }, (_, i) => adulto(`p${i}`)),
    adulto("curto", { dias: 1 }),
  ];
  const r = ratearItem(item(), pessoas, 3, ADMIN);
  const parte = (id: string) => r.partes.find((p) => p.pessoaId === id)!;

  it("soma 28 dias-pessoa", () => {
    expect(r.baseTotal).toBe(28);
  });
  it("quem fica 3 dias paga R$ 321,43 e quem fica 1 dia paga R$ 107,14", () => {
    expect(parte("p0").centavos).toBe(32143);
    expect(parte("curto").centavos).toBe(10714);
  });
  it("o centavo a mais sai do núcleo do admin e o total fecha em R$ 3.000,00", () => {
    expect(parte("admin").centavos).toBe(32142);
    expect(parte("admin").ajusteCentavos).toBe(-1);
    expect(r.partes.reduce((s, p) => s + p.centavos, 0)).toBe(300000);
  });
});

describe("regras de rateio", () => {
  it("crianças e quem não vai ficam fora", () => {
    const r = ratearItem(
      item({ proporcionalDias: false, valorCentavos: 10000 }),
      [adulto("a"), adulto("b"), adulto("c", { crianca: true }), adulto("d", { vai: false })],
      3,
      ADMIN,
    );
    expect(r.partes.map((p) => [p.pessoaId, p.centavos])).toEqual([
      ["a", 5000],
      ["b", 5000],
    ]);
  });

  it("alimentação é divisão igual, mesmo para quem vai só 1 dia", () => {
    const r = ratearItem(
      item({ categoria: "alimentacao", proporcionalDias: false, valorCentavos: 9000 }),
      [adulto("a"), adulto("b", { dias: 1 }), adulto("c")],
      3,
      ADMIN,
    );
    expect(r.partes.every((p) => p.centavos === 3000)).toBe(true);
  });

  it("álcool só entre quem marcou opt-in", () => {
    const r = ratearItem(
      item({ categoria: "alcool", proporcionalDias: false, valorCentavos: 10000 }),
      [adulto("a", { alcool: true }), adulto("b"), adulto("c", { alcool: true })],
      3,
      ADMIN,
    );
    expect(r.partes.map((p) => p.pessoaId)).toEqual(["a", "c"]);
  });

  it("extra opt-in só entre quem aderiu", () => {
    const r = ratearItem(
      item({
        categoria: "extra",
        elegibilidade: "opt_in",
        proporcionalDias: false,
        valorCentavos: 6000,
        adesoes: ["b"],
      }),
      [adulto("a"), adulto("b")],
      3,
      ADMIN,
    );
    expect(r.partes).toHaveLength(1);
    expect(r.partes[0]).toMatchObject({ pessoaId: "b", centavos: 6000 });
  });

  it("peso ajustado (0,5) paga metade de uma parte cheia", () => {
    const r = ratearItem(
      item({ proporcionalDias: false, valorCentavos: 15000, pesos: { b: 0.5 } }),
      [adulto("a"), adulto("b")],
      3,
      ADMIN,
    );
    expect(r.partes.find((p) => p.pessoaId === "a")!.centavos).toBe(10000);
    expect(r.partes.find((p) => p.pessoaId === "b")!.centavos).toBe(5000);
  });

  it("peso zero tira a pessoa do rateio", () => {
    const r = ratearItem(item({ pesos: { b: 0 } }), [adulto("a"), adulto("b")], 3, ADMIN);
    expect(r.partes.map((p) => p.pessoaId)).toEqual(["a"]);
  });

  it("diferença vai para alguém do núcleo do admin quando o admin não participa", () => {
    const r = ratearItem(
      item({ proporcionalDias: false, valorCentavos: 10000 }),
      [adulto("a"), adulto("b"), adulto("conjuge", { nucleoId: "n-admin" })],
      3,
      ADMIN,
    );
    expect(r.partes.find((p) => p.pessoaId === "conjuge")!.centavos).toBe(3334);
    expect(r.partes.reduce((s, p) => s + p.centavos, 0)).toBe(10000);
  });

  it("sem núcleo do admin no item, a diferença vai para a maior parte e o total fecha", () => {
    const r = ratearItem(
      item({ proporcionalDias: false, valorCentavos: 100 }),
      [adulto("a"), adulto("b"), adulto("c")],
      3,
      ADMIN,
    );
    expect(r.partes.reduce((s, p) => s + p.centavos, 0)).toBe(100);
  });

  it("dias ficam entre 1 e o total do período", () => {
    expect(diasEfetivos(null, 3)).toBe(3);
    expect(diasEfetivos(5, 3)).toBe(3);
    expect(diasEfetivos(0, 3)).toBe(1);
  });

  it("ratearTudo soma por pessoa e núcleo e aponta itens sem participantes", () => {
    const pessoas = [adulto("a"), adulto("b", { nucleoId: "n-a" })];
    const r = ratearTudo(
      [
        item({ id: "casa", proporcionalDias: false, valorCentavos: 1000 }),
        item({ id: "cerveja", categoria: "alcool", proporcionalDias: false, valorCentavos: 500 }),
      ],
      pessoas,
      3,
      ADMIN,
    );
    expect(r.porNucleo.get("n-a")).toBe(1000);
    expect(r.semParticipantes).toEqual(["cerveja"]);
    expect(r.totalCentavos).toBe(1500);
  });
});
