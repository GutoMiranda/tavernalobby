import { describe, expect, it } from "vitest";

import { avisoPixAtivo, lembreteDoPlano, saldoDoBau } from "./bau";
import type { Lancamento } from "./economia";
import { crc16, pixCopiaECola, textoPix } from "./pix";

const l = (extra: Partial<Lancamento>): Lancamento => ({
  id: Math.random().toString(),
  kind: "entrada",
  household_id: "n1",
  amount_cents: 1000,
  status: "confirmado",
  reverses_id: null,
  ...extra,
});

describe("saldo do baú", () => {
  it("entradas confirmadas − saídas, com estornos e sem pendentes/recusados", () => {
    const r = saldoDoBau([
      l({ id: "e1", amount_cents: 50000 }),
      l({ id: "e2", amount_cents: 20000 }),
      l({ status: "pendente", amount_cents: 99999 }),
      l({ status: "recusado", amount_cents: 77777 }),
      l({ id: "s1", kind: "saida", household_id: null, amount_cents: 30000 }),
      l({ kind: "estorno", reverses_id: "e2", amount_cents: 20000 }),
      l({ id: "s2", kind: "saida", household_id: null, amount_cents: 5000 }),
      l({ kind: "estorno", reverses_id: "s2", household_id: null, amount_cents: 5000 }),
    ]);
    expect(r).toEqual({ saldoCentavos: 20000, entradasCentavos: 50000, saidasCentavos: 30000 });
  });
});

describe("lembrete do plano de depósitos", () => {
  const plano = { amount_cents: 15000, day_of_month: 10 };
  it("antes do dia: próximo", () => {
    expect(lembreteDoPlano(plano, [], "2026-11-05")).toEqual({
      situacao: "proximo",
      data: "2026-11-10",
      valorCentavos: 15000,
    });
  });
  it("no dia ou depois, sem depósito no mês: atrasado", () => {
    expect(lembreteDoPlano(plano, [], "2026-11-10").situacao).toBe("atrasado");
    expect(
      lembreteDoPlano(plano, [{ kind: "entrada", status: "confirmado", occurred_on: "2026-10-10" }], "2026-11-24")
        .situacao,
    ).toBe("atrasado");
  });
  it("com depósito no mês (pendente conta, recusado não): feito, próximo no mês seguinte", () => {
    expect(
      lembreteDoPlano(plano, [{ kind: "entrada", status: "pendente", occurred_on: "2026-12-02" }], "2026-12-20"),
    ).toEqual({
      situacao: "feito",
      data: "2027-01-10",
      valorCentavos: 15000,
    });
    expect(
      lembreteDoPlano(plano, [{ kind: "entrada", status: "recusado", occurred_on: "2026-11-02" }], "2026-11-20")
        .situacao,
    ).toBe("atrasado");
  });
});

describe("aviso de troca de Pix", () => {
  const agora = new Date("2026-11-24T12:00:00Z");
  it("dura 7 dias", () => {
    expect(avisoPixAtivo("2026-11-20T12:00:00Z", agora)).toBe(true);
    expect(avisoPixAtivo("2026-11-17T11:00:00Z", agora)).toBe(false);
    expect(avisoPixAtivo(null, agora)).toBe(false);
  });
});

describe("Pix copia e cola (BR Code)", () => {
  it("CRC16-CCITT confere com o vetor de teste padrão", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
  it("monta os campos na ordem do padrão e termina com CRC válido", () => {
    const codigo = pixCopiaECola({ chave: "Fulano@Exemplo.com", nome: "João da Silva", valorCentavos: 15050 });
    expect(codigo.startsWith("000201")).toBe(true);
    expect(codigo).toContain("0014br.gov.bcb.pix0118fulano@exemplo.com");
    expect(codigo).toContain("5303986540615050".replace("15050", "150.50"));
    expect(codigo).toContain("5913JOAO DA SILVA");
    expect(codigo).toContain("6006BRASIL");
    const corpo = codigo.slice(0, -4);
    expect(corpo.endsWith("6304")).toBe(true);
    expect(codigo.slice(-4)).toBe(crc16(corpo));
  });
  it("sem valor, não inclui o campo 54", () => {
    expect(pixCopiaECola({ chave: "+5511999998888", nome: "Ana" })).not.toContain("5406");
  });
  it("limpa acentos e limita o tamanho do nome", () => {
    expect(textoPix("Ação Ótima de Muito Longo Nome Grande", 25)).toBe("ACAO OTIMA DE MUITO LONGO");
  });
});
