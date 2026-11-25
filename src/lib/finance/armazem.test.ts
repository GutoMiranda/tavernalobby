import { describe, expect, it } from "vitest";

import {
  consumoDeReferencia,
  custoDoItem,
  custosDoArmazem,
  pessoasDia,
  quantidadeSugerida,
  resumoDoArmazem,
} from "./armazem";
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
    const base = { quantity_per_person: null, quantity: null };
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
  it("conta itens e os sem custo", () => {
    const base = { quantity_per_person: null, quantity: null, is_alcoholic: false };
    expect(
      resumoDoArmazem([
        { ...base, cost_cents: 100 },
        { ...base, cost_cents: 0 },
      ]),
    ).toEqual({ total: 2, semCusto: 1 });
  });
});

describe("custoDoItem", () => {
  it("preço por unidade × quantidade, ao centavo", () => {
    expect(custoDoItem(5990, 8.5)).toBe(50915);
    expect(custoDoItem(333, 3)).toBe(999);
    expect(custoDoItem(1999, 0.35)).toBe(700); // 699,65 → 700
    expect(custoDoItem(null, 2)).toBe(0);
    expect(custoDoItem(100, null)).toBe(0);
  });
});

describe("consumoDeReferencia", () => {
  it("sugere pelo nome e pela unidade", () => {
    expect(consumoDeReferencia("Picanha", "kg")).toBe(0.4);
    expect(consumoDeReferencia("Cerveja Heineken", "lata")).toBe(4);
    expect(consumoDeReferencia("Pão de alho", "un")).toBe(1);
    expect(consumoDeReferencia("Pão francês", "un")).toBe(3);
    expect(consumoDeReferencia("Picanha", "un")).toBeNull();
    expect(consumoDeReferencia("Guarda-sol", "un")).toBeNull();
  });
});
