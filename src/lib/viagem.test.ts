import { describe, expect, it } from "vitest";

import {
  decodificarPolyline,
  origemDaRota,
  duracaoDaApi,
  modoParaMapa,
  formatarDistancia,
  formatarDuracao,
  linkGoogleMaps,
  distanciasDaGalera,
  linkMapaEmbutido,
} from "./viagem";

describe("formatação", () => {
  it("formata duração e distância", () => {
    expect(formatarDuracao(45 * 60)).toBe("45 min");
    expect(formatarDuracao(3 * 3600 + 20 * 60)).toBe("3h20");
    expect(formatarDuracao(2 * 3600)).toBe("2h");
    expect(formatarDistancia(800)).toBe("800 m");
    expect(formatarDistancia(250_400)).toBe("250 km");
    expect(formatarDistancia(1_250_000)).toBe("1.250 km");
  });

  it("lê a duração da Routes API", () => {
    expect(duracaoDaApi("12345s")).toBe(12345);
    expect(duracaoDaApi(undefined)).toBeNull();
  });
});

describe("links do Google Maps", () => {
  const a = { lat: -22.9, lng: -47.06 };
  const b = { lat: -22.59, lng: -46.52 };

  it("abre a rota no Google Maps no modo certo", () => {
    const u = new URL(linkGoogleMaps(a, b, "transporte"));
    expect(u.searchParams.get("origin")).toBe("-22.9,-47.06");
    expect(u.searchParams.get("destination")).toBe("-22.59,-46.52");
    expect(u.searchParams.get("travelmode")).toBe("transit");
    expect(new URL(linkGoogleMaps(a, b, "moto")).searchParams.get("travelmode")).toBe("driving");
  });

  it("monta o mapa embutido", () => {
    const u = new URL(linkMapaEmbutido("CHAVE", a, b, "a_pe"));
    expect(u.pathname).toBe("/maps/embed/v1/directions");
    expect(u.searchParams.get("mode")).toBe("walking");
  });
});

describe("decodificarPolyline", () => {
  it("decodifica o exemplo oficial do Google", () => {
    const pts = decodificarPolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(pts).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
  });
  it("vazio vira lista vazia", () => {
    expect(decodificarPolyline("")).toEqual([]);
  });
});

describe("modoParaMapa", () => {
  it("converte os modos", () => {
    expect(modoParaMapa("DRIVE")).toBe("carro");
    expect(modoParaMapa("TWO_WHEELER")).toBe("moto");
    expect(modoParaMapa("TRANSIT")).toBe("transporte");
    expect(modoParaMapa("WALK")).toBe("a_pe");
  });
});

describe("origem da rota no mapa", () => {
  it("respeita a escolha quando existe e cai para a cidade, depois para o encontro", () => {
    expect(origemDaRota("encontro", true, true)).toBe("encontro");
    expect(origemDaRota("encontro", true, false)).toBe("cidade");
    expect(origemDaRota(undefined, true, true)).toBe("cidade");
    expect(origemDaRota("cidade", false, true)).toBe("encontro");
    expect(origemDaRota(undefined, false, false)).toBeNull();
  });
});

describe("distância de onde a galera vem", () => {
  const nucleos = [
    { id: "n1", origin_lat: -22.9056, origin_lng: -47.0608 },
    { id: "n2", origin_lat: -8.0476, origin_lng: -34.877 },
    { id: "n3", origin_lat: null, origin_lng: null },
  ];
  const estalagem = { id: "e1", lat: -22.8625, lng: -46.0386 };
  const pessoas = [
    { id: "p1", name: "Gus", household_id: "n1" },
    { id: "p2", name: "Bia", household_id: "n2" },
    { id: "p3", name: "Caio", household_id: "n3" },
    { id: "p4", name: "Ana", household_id: "n1" },
  ];

  it("usa a distância de carro quando existe e a linha reta quando não; sem cidade vai para o fim", () => {
    const r = distanciasDaGalera(
      pessoas,
      nucleos,
      [{ household_id: "n1", accommodation_id: "e1", duration_seconds: 7000, distance_meters: 140000 }],
      estalagem,
    );
    expect(r.map((x) => x.nome)).toEqual(["Ana", "Gus", "Bia", "Caio"]);
    expect(r[0]).toMatchObject({ metros: 140000, emLinhaReta: false });
    expect(r[2].emLinhaReta).toBe(true);
    expect(r[2].metros! / 1000).toBeGreaterThan(1800);
    expect(r[3]).toMatchObject({ metros: null });
  });
});
