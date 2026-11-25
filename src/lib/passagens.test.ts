import { describe, expect, it } from "vitest";

import { aeroportoPorIata, aeroportosProximos, distanciaKm } from "./aeroportos";
import { cidadeDoEndereco, linkDeOnibus, linksDeVoo } from "./passagens";

const VCP = aeroportoPorIata("VCP")!;
const GIG = aeroportoPorIata("GIG")!;

describe("aeroportos", () => {
  it("acha os mais próximos de Campinas (Viracopos primeiro)", () => {
    const lista = aeroportosProximos({ lat: -22.9056, lng: -47.0608 });
    expect(lista[0].iata).toBe("VCP");
    expect(lista[0].km).toBeLessThan(25);
    expect(lista.map((a) => a.iata)).toContain("CGH");
  });

  it("acha o Galeão ou o Santos Dumont para Paraty e mede a distância em linha reta", () => {
    const [primeiro] = aeroportosProximos({ lat: -23.2178, lng: -44.7131 }, 1);
    expect(["GIG", "SDU", "CGH", "GRU"]).toContain(primeiro.iata);
    expect(Math.round(distanciaKm(VCP, GIG))).toBeGreaterThan(350);
  });
});

describe("links de voo", () => {
  it("montam ida e volta com os códigos dos aeroportos e as datas", () => {
    const [google, kayak, sky] = linksDeVoo(VCP, GIG, "2027-04-01", "2027-04-04");
    expect(decodeURIComponent(google.url)).toContain("Flights from VCP to GIG on 2027-04-01 through 2027-04-04");
    expect(kayak.url).toBe("https://www.kayak.com.br/flights/VCP-GIG/2027-04-01/2027-04-04?sort=price_a");
    expect(sky.url).toBe("https://www.skyscanner.com.br/transporte/passagens-aereas/vcp/gig/270401/270404/");
  });

  it("sem volta vira só ida; sem data abre sem data; volta antes da ida é ignorada", () => {
    expect(decodeURIComponent(linksDeVoo(VCP, GIG, "2027-04-01", null)[0].url)).toContain("one way");
    expect(linksDeVoo(VCP, GIG, null, null)[1].url).toBe("https://www.kayak.com.br/flights/VCP-GIG?sort=price_a");
    expect(linksDeVoo(VCP, GIG, "2027-04-04", "2027-04-01")[1].url).toBe(
      "https://www.kayak.com.br/flights/VCP-GIG/2027-04-04?sort=price_a",
    );
  });
});

describe("ônibus e cidade do endereço", () => {
  it("busca de ônibus com data em dd/mm/aaaa", () => {
    const l = linkDeOnibus("Campinas, SP", "Paraty, RJ", "2027-04-01");
    expect(decodeURIComponent(l!.url)).toContain("passagem de ônibus Campinas, SP para Paraty, RJ 01/04/2027");
    expect(linkDeOnibus("", "Paraty", null)).toBeNull();
  });

  it("tira a cidade de um endereço do Google", () => {
    expect(cidadeDoEndereco("Rua do Comércio, 10 - Centro, Paraty - RJ, 23970-000, Brasil")).toBe("Paraty, RJ");
    expect(cidadeDoEndereco("Estrada X, km 5, Monte Verde - MG")).toBe("Monte Verde, MG");
    expect(cidadeDoEndereco("Endereço sem padrão")).toBeNull();
    expect(cidadeDoEndereco(null)).toBeNull();
  });
});
