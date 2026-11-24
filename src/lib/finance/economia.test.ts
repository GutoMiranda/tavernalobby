import { describe, expect, it } from "vitest";

import { depositosDoNucleo, type Lancamento, mesesAte, planoDeEconomia } from "./economia";

const l = (extra: Partial<Lancamento>): Lancamento => ({
  id: Math.random().toString(),
  kind: "entrada",
  household_id: "n1",
  amount_cents: 1000,
  status: "confirmado",
  reverses_id: null,
  ...extra,
});

describe("plano de economia", () => {
  it("conta meses até a data, com mês parcial contando como mais um", () => {
    expect(mesesAte("2026-11-24", "2027-05-21")).toBe(6);
    expect(mesesAte("2026-11-24", "2027-05-24")).toBe(6);
    expect(mesesAte("2026-11-24", "2027-05-25")).toBe(7);
    expect(mesesAte("2026-11-24", "2026-11-30")).toBe(1);
  });

  it("divide o que falta pelos meses, arredondando para cima", () => {
    expect(planoDeEconomia(100000, 10000, "2026-11-24", "2027-05-24")).toEqual({
      faltaCentavos: 90000,
      meses: 6,
      porMesCentavos: 15000,
    });
    expect(planoDeEconomia(100, 0, "2026-11-24", "2027-02-24").porMesCentavos).toBe(34);
  });

  it("sem data ou já pago", () => {
    expect(planoDeEconomia(5000, 0, "2026-11-24", null)).toEqual({
      faltaCentavos: 5000,
      meses: null,
      porMesCentavos: 5000,
    });
    expect(planoDeEconomia(5000, 8000, "2026-11-24", "2027-01-01").faltaCentavos).toBe(0);
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
