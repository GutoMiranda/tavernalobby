import { describe, expect, it } from "vitest";

import {
  ehDepositoNovo,
  escalaDoTesouro,
  metaAlcancadaAgora,
  MOEDAS_MAXIMAS,
  moedasDaPilha,
  nivelDoTesouro,
  posicoesDaPilha,
} from "./tesouro";

describe("pilha de ouro", () => {
  it("cresce com o progresso da meta", () => {
    expect(MOEDAS_MAXIMAS).toBe(36);
    expect(moedasDaPilha(0)).toBe(0);
    expect(moedasDaPilha(0.5)).toBe(1);
    expect(moedasDaPilha(50)).toBe(18);
    expect(moedasDaPilha(100)).toBe(36);
    expect(moedasDaPilha(250)).toBe(36);
    expect(moedasDaPilha(Number.NaN)).toBe(0);
  });

  it("enche de baixo para cima", () => {
    const p = posicoesDaPilha(10);
    expect(p).toHaveLength(10);
    expect(p.slice(0, 8).every((m) => m.linha === 0)).toBe(true);
    expect(p[8]).toEqual({ linha: 1, coluna: 0 });
    expect(posicoesDaPilha(99)).toHaveLength(36);
    expect(posicoesDaPilha(36).at(-1)).toEqual({ linha: 7, coluna: 0 });
  });
});

describe("explosão de moedas", () => {
  const conhecidos = new Set(["velho"]);
  it("dispara só para entrada recém-confirmada", () => {
    expect(ehDepositoNovo({ id: "novo", kind: "entrada", status: "confirmado" }, conhecidos)).toBe(true);
    expect(ehDepositoNovo({ id: "velho", kind: "entrada", status: "confirmado" }, conhecidos)).toBe(false);
    expect(ehDepositoNovo({ id: "novo", kind: "entrada", status: "pendente" }, conhecidos)).toBe(false);
    expect(ehDepositoNovo({ id: "novo", kind: "saida", status: "confirmado" }, conhecidos)).toBe(false);
    expect(ehDepositoNovo({ id: "novo", kind: "estorno", status: "confirmado" }, conhecidos)).toBe(false);
    expect(ehDepositoNovo(null, conhecidos)).toBe(false);
  });

  it("celebra a meta só quando cruza os 100%", () => {
    expect(metaAlcancadaAgora(90, 100)).toBe(true);
    expect(metaAlcancadaAgora(100, 100)).toBe(false);
    expect(metaAlcancadaAgora(40, 60)).toBe(false);
  });
});

describe("baú desenhado que cresce", () => {
  it("segue o progresso da meta: abre com qualquer valor e sobe a cada 10%", () => {
    expect(nivelDoTesouro(0)).toBe(0);
    expect(nivelDoTesouro(0.04)).toBe(1);
    expect(nivelDoTesouro(10)).toBe(1);
    expect(nivelDoTesouro(10.5)).toBe(2);
    expect(nivelDoTesouro(55)).toBe(6);
    expect(nivelDoTesouro(100)).toBe(10);
    expect(nivelDoTesouro(180)).toBe(10);
    expect(nivelDoTesouro(Number.NaN)).toBe(0);
  });
  it("cresce de tamanho junto com o progresso", () => {
    expect(escalaDoTesouro(0)).toBeCloseTo(0.62);
    expect(escalaDoTesouro(50)).toBeCloseTo(0.81);
    expect(escalaDoTesouro(100)).toBeCloseTo(1);
    expect(escalaDoTesouro(300)).toBeCloseTo(1);
  });
});
