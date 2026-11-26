import { describe, expect, it } from "vitest";

import { lerDatasCandidatas } from "./datas-candidatas";

function form(linhas: [string, string, string][]) {
  const d = new FormData();
  for (const [i, f, m] of linhas) {
    d.append("data_inicio", i);
    d.append("data_fim", f);
    d.append("data_motivo", m);
  }
  return d;
}

describe("lerDatasCandidatas", () => {
  it("lê as opções com motivo e ignora linhas vazias", () => {
    const r = lerDatasCandidatas(
      form([
        ["2027-02-13", "2027-02-17", "Carnaval"],
        ["", "", ""],
        ["2027-04-02", "", ""],
      ]),
    );
    expect(r).toEqual({
      datas: [
        { start_date: "2027-02-13", end_date: "2027-02-17", note: "Carnaval" },
        { start_date: "2027-04-02", end_date: "2027-04-02", note: null },
      ],
    });
  });

  it("recusa fim antes do início", () => {
    expect(lerDatasCandidatas(form([["2027-02-17", "2027-02-13", ""]]))).toEqual({
      erro: "Na opção 1, o fim precisa ser depois do início.",
    });
  });
});
