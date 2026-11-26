import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { caminhoSeguro } from "./auth";
import { mensagemErro } from "./erros";

describe("caminhoSeguro", () => {
  it("aceita caminhos internos", () => {
    expect(caminhoSeguro("/familia")).toBe("/familia");
    expect(caminhoSeguro("/familia/convite/abc?x=1")).toBe("/familia/convite/abc?x=1");
  });

  it("recusa endereços externos", () => {
    expect(caminhoSeguro("https://golpe.com")).toBe("/");
    expect(caminhoSeguro("//golpe.com")).toBe("/");
    expect(caminhoSeguro("/\\golpe.com")).toBe("/");
    expect(caminhoSeguro(null)).toBe("/");
  });
});

describe("mensagemErro", () => {
  it("traduz erro de permissão", () => {
    expect(mensagemErro({ code: "42501", message: "new row violates row-level security policy" })).toBe(
      "Você não tem permissão para fazer isso.",
    );
  });

  it("repassa as mensagens das funções do banco", () => {
    expect(mensagemErro({ code: "42501", message: "Só o admin aprova membros." })).toBe("Só o admin aprova membros.");
  });

  it("esconde detalhes técnicos de erros desconhecidos", () => {
    expect(mensagemErro({ code: "XX000", message: "internal stack trace" })).toBe("Algo deu errado. Tente de novo.");
  });
});
