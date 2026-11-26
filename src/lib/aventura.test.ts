import { describe, expect, it } from "vitest";

import {
  contagemRegressiva,
  custoPorAdulto,
  pendencias,
  periodoEfetivo,
  placar,
  ranking,
  type Reacao,
} from "./aventura";
import { diasDoPeriodo, formatarDia, formatarPeriodo, hojeEmSaoPaulo } from "./format";

const r = (alvo_id: string, person_id: string, value: 1 | -1): Reacao => ({ alvo_id, person_id, value });

describe("placar e ranking", () => {
  const reacoes = [r("a", "p1", 1), r("a", "p2", -1), r("b", "p1", 1), r("b", "p2", 1), r("c", "p3", -1)];

  it("conta curtidas, descurtidas, saldo e a minha reação", () => {
    expect(placar(reacoes, "a", "p2")).toEqual({ curtidas: 1, descurtidas: 1, saldo: 0, minha: -1 });
    expect(placar(reacoes, "x", "p1")).toEqual({ curtidas: 0, descurtidas: 0, saldo: 0, minha: null });
  });

  it("ordena pelo saldo e desempata por curtidas e pela ordem original", () => {
    const itens = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    expect(ranking(itens, reacoes).map((i) => i.id)).toEqual(["b", "a", "d", "c"]);
    expect(ranking(itens, reacoes)[0].posicao).toBe(1);
  });
});

describe("contagem regressiva", () => {
  it("mostra dias, amanhã e hoje", () => {
    expect(contagemRegressiva("2027-01-20", "2027-01-08")).toBe("Faltam 12 dias");
    expect(contagemRegressiva("2027-01-09", "2027-01-08")).toBe("É amanhã!");
    expect(contagemRegressiva("2027-01-08", "2027-01-08")).toBe("É hoje!");
    expect(contagemRegressiva("2027-01-01", "2027-01-08")).toBeNull();
    expect(contagemRegressiva(null)).toBeNull();
  });
});

describe("custo estimado por adulto", () => {
  it("divide o total pelos adultos, arredondando o centavo para cima", () => {
    expect(custoPorAdulto(300000, 10)).toBe(30000);
    expect(custoPorAdulto(100000, 3)).toBe(33334);
    expect(custoPorAdulto(100000, 0)).toBeNull();
  });
});

describe("pendências", () => {
  const base = {
    eventoId: "e1",
    minhaPessoaId: "p1",
    podeCadastrarDatas: false,
    datas: [{ id: "d1" }, { id: "d2" }],
    reacoesDatas: [r("d1", "p1", 1)],
    estalagens: [{ id: "s1" }],
    reacoesEstalagens: [] as Reacao[],
    nucleoTemOrigem: false,
  };

  it("na votação de datas, lista as datas sem voto e a origem", () => {
    const lista = pendencias({ ...base, fase: "datas" });
    expect(lista.map((p) => p.texto)).toEqual([
      "Votar em 1 data candidata",
      "Informar o ponto de saída do seu núcleo",
    ]);
  });

  it("quem pode cadastrar datas recebe o atalho para o Salão do Mestre", () => {
    const lista = pendencias({ ...base, fase: "datas", datas: [], nucleoTemOrigem: true, podeCadastrarDatas: true });
    expect(lista).toEqual([{ texto: "Cadastrar as datas candidatas", href: "/mestre/aventuras/e1/datas" }]);
  });

  it("na fase de estalagens, lista as estalagens sem reação", () => {
    const lista = pendencias({ ...base, fase: "estalagens", nucleoTemOrigem: true });
    expect(lista).toEqual([{ texto: "Reagir a 1 estalagem (hospedagem)", href: "/aventuras/e1/estalagens" }]);
  });

  it("na fase de presença, pede para confirmar quem do núcleo falta", () => {
    const lista = pendencias({ ...base, fase: "presenca", nucleoTemOrigem: true, presencasPendentes: 2 });
    expect(lista).toEqual([
      { texto: "Confirmar a presença de 2 pessoas do seu núcleo", href: "/aventuras/e1/presenca" },
    ]);
  });

  it("lembra o depósito do mês atrasado do plano", () => {
    const lista = pendencias({ ...base, fase: "preparativos", nucleoTemOrigem: true, depositoAtrasado: "R$ 150,00" });
    expect(lista).toEqual([{ texto: "Fazer o depósito do mês no baú: R$ 150,00", href: "/aventuras/e1/bau" }]);
  });

  it("sem pendências quando está tudo feito", () => {
    expect(pendencias({ ...base, fase: "preparativos", nucleoTemOrigem: true })).toEqual([]);
  });
});

describe("datas sem fuso", () => {
  it("formata datas do banco sem mudar o dia", () => {
    expect(formatarDia("2027-01-08")).toBe("08/01/2027");
    expect(formatarPeriodo("2027-01-08", "2027-01-10")).toBe("08/01 a 10/01/2027");
    expect(formatarPeriodo("2026-12-30", "2027-01-02")).toBe("30/12/2026 a 02/01/2027");
    expect(diasDoPeriodo("2027-01-08", "2027-01-10")).toBe(3);
  });

  it("hoje em São Paulo vira o dia só à meia-noite de lá", () => {
    expect(hojeEmSaoPaulo(new Date("2027-01-09T02:30:00Z"))).toBe("2027-01-08");
    expect(hojeEmSaoPaulo(new Date("2027-01-09T03:30:00Z"))).toBe("2027-01-09");
  });
});

describe("período efetivo para as contas", () => {
  const datas = [
    { id: "b", start_date: "2027-06-10", end_date: "2027-06-12" },
    { id: "a", start_date: "2027-05-21", end_date: "2027-05-23" },
    { id: "c", start_date: "2027-07-01", end_date: "2027-07-04" },
  ];

  it("data fechada pelo admin vale sempre", () => {
    expect(periodoEfetivo({ start_date: "2027-08-01", end_date: "2027-08-03" }, datas, [r("c", "p1", 1)])).toEqual({
      inicio: "2027-08-01",
      fim: "2027-08-03",
      fonte: "fechada",
    });
  });

  it("sem data fechada, usa a mais votada (prévia)", () => {
    const p = periodoEfetivo({ start_date: null, end_date: null }, datas, [
      r("c", "p1", 1),
      r("c", "p2", 1),
      r("a", "p1", 1),
    ]);
    expect(p).toEqual({ inicio: "2027-07-01", fim: "2027-07-04", fonte: "mais_votada" });
  });

  it("empate no saldo: vence quem tem mais curtidas", () => {
    // a: +2 −2 (saldo 0, 2 curtidas); b: +1 −1 (saldo 0, 1 curtida)
    const p = periodoEfetivo({ start_date: null, end_date: null }, datas, [
      r("a", "p1", 1),
      r("a", "p2", 1),
      r("a", "p3", -1),
      r("a", "p4", -1),
      r("b", "p1", 1),
      r("b", "p2", -1),
    ]);
    expect(p?.inicio).toBe("2027-05-21");
  });

  it("empate total (ou sem votos): vence a data que começa antes", () => {
    expect(periodoEfetivo({ start_date: null, end_date: null }, datas, [])?.inicio).toBe("2027-05-21");
    expect(
      periodoEfetivo({ start_date: null, end_date: null }, datas, [r("b", "p1", 1), r("c", "p1", 1)])?.inicio,
    ).toBe("2027-06-10");
  });

  it("sem datas candidatas: sem período", () => {
    expect(periodoEfetivo({ start_date: null, end_date: null }, [], [])).toBeNull();
  });
});
