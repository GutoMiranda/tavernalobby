import { describe, expect, it } from "vitest";

import { linkWhatsApp, mensagemCobrancaPresenca } from "./cobranca";

describe("Cobrar presença no WhatsApp", () => {
  it("lista só os núcleos com gente sem resposta e põe o link", () => {
    const t = mensagemCobrancaPresenca(
      "Serra 2027",
      [
        { nucleo: "Família Silva", pessoas: ["Ana", "Bia"] },
        { nucleo: "Família Souza", pessoas: [] },
      ],
      "https://x.app/aventuras/1/presenca",
    );
    expect(t).toContain("*Serra 2027*");
    expect(t).toContain("• Família Silva: Ana, Bia");
    expect(t).not.toContain("Souza");
    expect(t.endsWith("https://x.app/aventuras/1/presenca")).toBe(true);
  });

  it("codifica o texto no link do WhatsApp", () => {
    expect(linkWhatsApp("a b&c\n")).toBe("https://wa.me/?text=a%20b%26c%0A");
  });
});
