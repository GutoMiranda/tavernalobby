import { describe, expect, it } from "vitest";

import {
  depositosDoNucleo,
  dividirEmParcelas,
  type Lancamento,
  mesesDeDeposito,
  nomeDoMes,
  planoDeEconomia,
} from "./economia";

const l = (extra: Partial<Lancamento>): Lancamento => ({
  id: Math.random().toString(),
  kind: "entrada",
  household_id: "n1",
  amount_cents: 1000,
  status: "confirmado",
  reverses_id: null,
  ...extra,
});

describe("meses de depósito: do mês atual até o mês anterior ao da viagem", () => {
  it("novembro/2026 até viagem em maio/2027 = 6 meses (nov a abr)", () => {
    expect(mesesDeDeposito("2026-11-24", "2027-05-21")).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
    ]);
  });
  it("o dia do mês não muda a conta", () => {
    expect(mesesDeDeposito("2026-11-01", "2027-05-31")).toHaveLength(6);
    expect(mesesDeDeposito("2026-11-30", "2027-05-01")).toHaveLength(6);
  });
  it("viagem no mês atual ou no passado: 1 mês (o atual)", () => {
    expect(mesesDeDeposito("2026-11-24", "2026-11-30")).toEqual(["2026-11"]);
    expect(mesesDeDeposito("2026-11-24", "2026-10-10")).toEqual(["2026-11"]);
  });
  it("viagem no mês seguinte: 1 mês", () => {
    expect(mesesDeDeposito("2026-12-15", "2027-01-05")).toEqual(["2026-12"]);
  });
});

describe("parcelas exatas em centavos", () => {
  it("valor que divide certinho", () => {
    expect(dividirEmParcelas(90000, ["a", "b", "c", "d", "e", "f"]).map((p) => p.centavos)).toEqual([
      15000, 15000, 15000, 15000, 15000, 15000,
    ]);
  });
  it("centavos que sobram vão para os primeiros meses e a soma fecha", () => {
    const p = dividirEmParcelas(32143, ["a", "b", "c", "d", "e", "f"]);
    expect(p.map((x) => x.centavos)).toEqual([5358, 5357, 5357, 5357, 5357, 5357]);
    expect(p.reduce((s, x) => s + x.centavos, 0)).toBe(32143);
  });
  it("a soma sempre fecha (vários valores e meses)", () => {
    for (const valor of [0, 1, 7, 99, 100001, 321429, 9999999]) {
      for (let n = 1; n <= 24; n++) {
        const p = dividirEmParcelas(
          valor,
          Array.from({ length: n }, (_, i) => String(i)),
        );
        expect(p.reduce((s, x) => s + x.centavos, 0)).toBe(valor);
        expect(Math.max(...p.map((x) => x.centavos)) - Math.min(...p.map((x) => x.centavos))).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("plano de economia", () => {
  it("exemplo: falta R$ 900,00 com 6 meses = R$ 150,00 por mês", () => {
    const r = planoDeEconomia(100000, 10000, "2026-11-24", "2027-05-21");
    expect(r.faltaCentavos).toBe(90000);
    expect(r.meses).toBe(6);
    expect(r.porMesCentavos).toBe(15000);
    expect(r.parcelas[0]).toEqual({ mes: "2026-11", centavos: 15000 });
  });
  it("sem data: tudo de uma vez, sem parcelas", () => {
    expect(planoDeEconomia(5000, 0, "2026-11-24", null)).toEqual({
      faltaCentavos: 5000,
      meses: null,
      porMesCentavos: 5000,
      parcelas: [],
    });
  });
  it("já pago: falta zero", () => {
    const r = planoDeEconomia(5000, 8000, "2026-11-24", "2027-01-01");
    expect(r.faltaCentavos).toBe(0);
    expect(r.porMesCentavos).toBe(0);
  });
  it("nome do mês", () => {
    expect(nomeDoMes("2027-01")).toBe("jan/2027");
  });
});

describe("depósitos do núcleo", () => {
  it("soma confirmados sem estorno e separa pendentes; ignora outros núcleos e recusados", () => {
    const estornado = l({ id: "x", amount_cents: 500 });
    const r = depositosDoNucleo(
      [
        l({ amount_cents: 2000 }),
        estornado,
        l({ kind: "estorno", reverses_id: "x", household_id: null, amount_cents: 500 }),
        l({ status: "pendente", amount_cents: 300 }),
        l({ status: "recusado", amount_cents: 999 }),
        l({ household_id: "n2", amount_cents: 7000 }),
      ],
      "n1",
    );
    expect(r).toEqual({ confirmadoCentavos: 2000, pendenteCentavos: 300 });
  });
});
