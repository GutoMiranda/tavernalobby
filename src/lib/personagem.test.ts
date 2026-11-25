import { describe, expect, it } from "vitest";

import { corDoAvatar, iniciais, lerPersonagem, papelDe } from "./personagem";

describe("personagem", () => {
  it("papel mais alto decora o nome", () => {
    expect(papelDe({ is_admin: true }, ["Tesoureiro"])).toBe("mestre");
    expect(papelDe({ is_admin: false }, ["Despensa", "Tesoureiro"])).toBe("tesoureiro");
    expect(papelDe({ is_admin: false }, ["Despensa"])).toBe("despensa");
    expect(papelDe({ is_admin: false }, [])).toBe("membro");
  });

  it("iniciais do nome", () => {
    expect(iniciais("Gustavo Marques de Miranda")).toBe("GM");
    expect(iniciais("bia")).toBe("B");
    expect(iniciais("  ")).toBe("?");
  });

  it("cor escolhida ou sempre a mesma para o mesmo nome", () => {
    expect(corDoAvatar("Bia", "vinho")).toBe("#6b2440");
    expect(corDoAvatar("Bia", null)).toBe(corDoAvatar("Bia", "inexistente"));
  });

  it("valida o formulário do personagem", () => {
    expect(lerPersonagem({ avatar: "bardo", cor: "vinho", epiteto: "  a  Bardo " })).toEqual({
      avatar: "bardo",
      cor: "vinho",
      epiteto: "a Bardo",
    });
    expect(lerPersonagem({ avatar: "unicornio", cor: "", epiteto: "" })).toEqual({
      avatar: null,
      cor: null,
      epiteto: null,
    });
    expect(lerPersonagem({ epiteto: "x".repeat(41) })).toHaveProperty("erro");
  });
});
