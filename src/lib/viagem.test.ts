import { describe, expect, it } from "vitest";

import {
  decodificarPolyline,
  origemDaRota,
  duracaoDaApi,
  modoParaMapa,
  formatarDistancia,
  formatarDuracao,
  indiceJustica,
  linkGoogleMaps,
  linkMapaEmbutido,
  type Tempo,
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

describe("índice de justiça", () => {
  const t = (h: string, a: string, s: number | null): Tempo => ({
    household_id: h,
    accommodation_id: a,
    duration_seconds: s,
    distance_meters: null,
  });
  const tempos = [t("n1", "e1", 3600), t("n2", "e1", 7200), t("n3", "e1", null), t("n1", "e2", 600)];

  it("calcula média e máximo, ignorando quem não tem rota", () => {
    expect(indiceJustica(tempos, "e1")).toEqual({ mediaSegundos: 5400, maximoSegundos: 7200, nucleos: 2 });
  });

  it("pode considerar só alguns núcleos", () => {
    expect(indiceJustica(tempos, "e1", new Set(["n1"]))).toEqual({
      mediaSegundos: 3600,
      maximoSegundos: 3600,
      nucleos: 1,
    });
  });

  it("sem tempos, sem índice", () => {
    expect(indiceJustica(tempos, "e9")).toBeNull();
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
