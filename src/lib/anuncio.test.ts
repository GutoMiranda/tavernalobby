import { describe, expect, it } from "vitest";

import { extrairDadosDoAnuncio } from "./anuncio";

describe("extrairDadosDoAnuncio", () => {
  it("lê Open Graph (como os anúncios mostram no WhatsApp)", () => {
    const html = `<html><head>
      <title>Ignorado</title>
      <meta property="og:title" content="Chácara Recanto do Sol &amp; Lago · 10 hóspedes">
      <meta property="og:description" content="Casa inteira com piscina, 4 quartos.">
      <meta property="og:image" content="https://fotos.exemplo.com/1.jpg">
      <meta property="og:image" content="/2.jpg">
      <meta property="og:image" content="http://inseguro.com/3.jpg">
      <meta property="place:location:latitude" content="-22.9">
      <meta property="place:location:longitude" content="-47.06">
    </head></html>`;
    const d = extrairDadosDoAnuncio(html, "https://www.exemplo.com/rooms/1");
    expect(d.nome).toBe("Chácara Recanto do Sol & Lago · 10 hóspedes");
    expect(d.descricao).toBe("Casa inteira com piscina, 4 quartos.");
    expect(d.capacidade).toBe(10);
    expect(d.fotos).toEqual(["https://fotos.exemplo.com/1.jpg", "https://www.exemplo.com/2.jpg"]);
    expect(d.lat).toBe(-22.9);
    expect(d.lng).toBe(-47.06);
  });

  it("lê JSON-LD de hospedagem com endereço, coordenadas, preço e capacidade", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "Página" },
        {
          "@type": "VacationRental",
          name: "Sítio das Águas",
          description: "Sítio com cachoeira",
          image: ["https://img.exemplo.com/a.jpg", { url: "https://img.exemplo.com/b.jpg" }],
          address: { streetAddress: "Estrada do Sítio, 100", addressLocality: "Socorro", addressRegion: "SP" },
          geo: { latitude: "-22.59", longitude: "-46.52" },
          offers: { price: "3.000,00", priceCurrency: "BRL" },
          occupancy: { maxValue: 14 },
        },
      ],
    })}</script>`;
    const d = extrairDadosDoAnuncio(html, "https://sitio.exemplo.com/");
    expect(d).toMatchObject({
      nome: "Sítio das Águas",
      descricao: "Sítio com cachoeira",
      endereco: "Estrada do Sítio, 100, Socorro, SP",
      lat: -22.59,
      lng: -46.52,
      precoCentavos: 300000,
      capacidade: 14,
    });
    expect(d.fotos).toHaveLength(2);
  });

  it("página sem dados úteis devolve só o título", () => {
    const d = extrairDadosDoAnuncio("<html><title>Acesso negado</title></html>", "https://x.com");
    expect(d).toEqual({ nome: "Acesso negado", fotos: [] });
  });

  it("ignora JSON-LD quebrado e coordenadas pela metade", () => {
    const html = `<script type="application/ld+json">{quebrado</script>
      <meta property="place:location:latitude" content="-22.9">`;
    const d = extrairDadosDoAnuncio(html, "https://x.com");
    expect(d.lat).toBeUndefined();
  });
});
