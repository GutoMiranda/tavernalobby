import { describe, expect, it } from "vitest";

import { caminhoDeFotoValido, corDoAvatar, iniciais, lerPersonagem, papelDe, recorteQuadrado } from "./personagem";

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

describe("foto do avatar", () => {
  const u = "11111111-1111-1111-1111-111111111111";
  const nova = `${u}/22222222-2222-2222-2222-222222222222.webp`;
  it("aceita vazio, a atual ou uma nova na pasta de quem está logado", () => {
    expect(caminhoDeFotoValido("", u, null)).toBeNull();
    expect(caminhoDeFotoValido(nova, u, null)).toBe(nova);
    expect(caminhoDeFotoValido("outra/coisa.webp", u, "outra/coisa.webp")).toBe("outra/coisa.webp");
    expect(
      caminhoDeFotoValido(`33333333-3333-3333-3333-333333333333/22222222-2222-2222-2222-222222222222.webp`, u, null),
    ).toBe(false);
    expect(caminhoDeFotoValido(`${u}/../x.webp`, u, null)).toBe(false);
  });
  it("recorte quadrado central", () => {
    expect(recorteQuadrado(400, 300)).toEqual({ x: 50, y: 0, lado: 300 });
    expect(recorteQuadrado(300, 500)).toEqual({ x: 0, y: 100, lado: 300 });
  });
});
