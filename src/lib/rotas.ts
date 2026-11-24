import "server-only";

import { duracaoDaApi } from "./viagem";

/** Um ponto com coordenadas. */
export type Ponto = { id: string; lat: number; lng: number };
export type ResultadoRota = { origemId: string; destinoId: string; segundos: number | null; metros: number | null };

const CHAVE = () => process.env.GOOGLE_MAPS_SERVER_KEY ?? "";

/**
 * Matriz de tempos de viagem de carro (origens × destinos), calculada no servidor.
 * Usa a Routes API (Compute Route Matrix). Se ela não estiver ativada, tenta a Distance Matrix API.
 * Retorna [] se não houver chave do servidor.
 */
export async function calcularMatriz(origens: Ponto[], destinos: Ponto[]): Promise<ResultadoRota[]> {
  if (!CHAVE() || origens.length === 0 || destinos.length === 0) return [];
  const resultados: ResultadoRota[] = [];
  // Lotes pequenos respeitam os limites das duas APIs (até 100 elementos por chamada).
  for (const lote of lotes(origens, 10)) {
    for (const loteDestinos of lotes(destinos, 10)) {
      let parcial = await viaRoutesApi(lote, loteDestinos);
      if (parcial === null) parcial = await viaDistanceMatrix(lote, loteDestinos);
      if (parcial === null) return resultados;
      resultados.push(...parcial);
    }
  }
  return resultados;
}

function lotes<T>(itens: T[], tamanho: number): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) r.push(itens.slice(i, i + tamanho));
  return r;
}

async function viaRoutesApi(origens: Ponto[], destinos: Ponto[]): Promise<ResultadoRota[] | null> {
  const ponto = (p: Ponto) => ({ waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } } });
  try {
    const res = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": CHAVE(),
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition",
      },
      body: JSON.stringify({
        origins: origens.map(ponto),
        destinations: destinos.map(ponto),
        travelMode: "DRIVE",
        languageCode: "pt-BR",
        regionCode: "BR",
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const elementos = (await res.json()) as {
      originIndex: number;
      destinationIndex: number;
      duration?: string;
      distanceMeters?: number;
      condition?: string;
    }[];
    return elementos.map((e) => {
      const existe = e.condition === "ROUTE_EXISTS";
      return {
        origemId: origens[e.originIndex].id,
        destinoId: destinos[e.destinationIndex].id,
        segundos: existe ? duracaoDaApi(e.duration) : null,
        metros: existe ? (e.distanceMeters ?? null) : null,
      };
    });
  } catch {
    return null;
  }
}

async function viaDistanceMatrix(origens: Ponto[], destinos: Ponto[]): Promise<ResultadoRota[] | null> {
  const lista = (ps: Ponto[]) => ps.map((p) => `${p.lat},${p.lng}`).join("|");
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", lista(origens));
  url.searchParams.set("destinations", lista(destinos));
  url.searchParams.set("mode", "driving");
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "br");
  url.searchParams.set("key", CHAVE());
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status: string;
      rows?: { elements: { status: string; duration?: { value: number }; distance?: { value: number } }[] }[];
    };
    if (json.status !== "OK" || !json.rows) return null;
    return json.rows.flatMap((linha, i) =>
      linha.elements.map((el, j) => ({
        origemId: origens[i].id,
        destinoId: destinos[j].id,
        segundos: el.status === "OK" ? (el.duration?.value ?? null) : null,
        metros: el.status === "OK" ? (el.distance?.value ?? null) : null,
      })),
    );
  } catch {
    return null;
  }
}
