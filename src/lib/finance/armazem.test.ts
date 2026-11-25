import { describe, expect, it } from "vitest";

import { custosDoArmazem, pessoasDia, quantidadeSugerida, resumoDoArmazem } from "./armazem";
import type { PessoaRateio } from "./rateio";

const p = (id: string, extra: Partial<PessoaRateio> = {}): PessoaRateio => ({
  id,
  nome: id,
  nucleoId: "n",
  crianca: false,
  vai: true,
  dias: null,
  alcool: false,
  ...extra,
});

// 9 adultos 3 dias + 1 adulto 1 dia (exemplo do escopo) + 1 criança 3 dias + 1 que não vai.
const pessoas = [
  ...Array.from({ length: 9 }, (_, i) => p(`a${i}`, { alcool: i < 4 })),
  p("um-dia", { dias: 1, alcool: true }),
  p("crianca", { crianca: true, alcool: true }),
  p("fora", { vai: false }),
];

describe("pessoasDia", () => {
  it("comida conta todos os presentes, inclusive crianças, pelos dias de cada um", () => {
    expect(pessoasDia(pessoas, false, 3)).toBe(9 * 3 + 1 + 3);
  });
  it("álcool conta só adultos com opt-in", () => {
    expect(pessoasDia(pessoas, true, 3)).toBe(4 * 3 + 1);
  });
});

describe("quantidadeSugerida", () => {
  it("multiplica e arredonda para cima em 1 casa", () => {
    expect(quantidadeSugerida(0.3, 28)).toBe(8.4);
    expect(quantidadeSugerida(0.33, 10)).toBe(3.3);
    expect(quantidadeSugerida(2, 13)).toBe(26);
  });
  it("sem quantidade por pessoa não sugere", () => {
    expect(quantidadeSugerida(null, 10)).toBeNull();
    expect(quantidadeSugerida(0, 10)).toBeNull();
  });
});

describe("custosDoArmazem", () => {
  it("separa alcoólicos de alimentação, em centavos", () => {
    const base = { quantity_per_person: null, quantity: null, purchased: false };
    expect(
      custosDoArmazem([
        { ...base, is_alcoholic: false, cost_cents: 25000 },
        { ...base, is_alcoholic: false, cost_cents: 1999 },
        { ...base, is_alcoholic: true, cost_cents: 12050 },
        { ...base, is_alcoholic: true, cost_cents: null },
      ]),
    ).toEqual({ alimentacaoCentavos: 26999, alcoolCentavos: 12050 });
  });
});

describe("resumoDoArmazem", () => {
  it("conta comprados e itens sem custo", () => {
    const base = { quantity_per_person: null, quantity: null, is_alcoholic: false };
    expect(
      resumoDoArmazem([
        { ...base, purchased: true, cost_cents: 100 },
        { ...base, purchased: false, cost_cents: null },
      ]),
    ).toEqual({ total: 2, comprados: 1, semCusto: 1 });
  });
});
