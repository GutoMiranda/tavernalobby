import { describe, expect, it } from "vitest";

import { inicioDoMes, linkSeguro, rotuloNotificacao } from "./notificacoes";

describe("notificações", () => {
  it("rótulo com termo e palavra comum, e genérico para tipos novos", () => {
    expect(rotuloNotificacao("loot_guardado")).toBe("Baú · depósito confirmado");
    expect(rotuloNotificacao("mencao_chat")).toBe("Aviso");
  });
  it("início do mês no fuso de São Paulo", () => {
    expect(inicioDoMes("2026-11-25")).toBe("2026-11-01T00:00:00-03:00");
  });
  it("só segue links internos", () => {
    expect(linkSeguro("/aventuras/x/bau")).toBe("/aventuras/x/bau");
    expect(linkSeguro("https://golpe.com")).toBe("/notificacoes");
    expect(linkSeguro("//golpe.com")).toBe("/notificacoes");
    expect(linkSeguro(null)).toBe("/notificacoes");
  });
});
