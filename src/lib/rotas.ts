import "server-only";

import { unstable_cache } from "next/cache";

import { type PassoApi, type PassoTransporte, resumirPassos } from "./transporte";
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

export type ModoRota = "DRIVE" | "TWO_WHEELER" | "TRANSIT" | "WALK";
export type RotaResumo = {
  modo: ModoRota;
  segundos: number | null;
  segundosSemTransito: number | null;
  metros: number | null;
  /** Traçado da rota (Encoded Polyline), para desenhar no mapa. */
  polyline: string | null;
  /** Transporte público: linhas e caminhadas, na ordem. */
  passos?: PassoTransporte[];
  /** Motivo quando o Google respondeu com erro (chave, API desativada, rede); diferente de "não existe rota". */
  erro?: string;
};

/**
 * Uma rota (Routes API, Compute Routes) para cada modo pedido. Carro e moto consideram o trânsito do momento.
 * Modos sem rota disponível (ex.: moto ou transporte público fora das áreas cobertas pelo Google) voltam com null.
 */
export async function calcularRotas(
  origem: Ponto,
  destino: Ponto,
  modos: ModoRota[],
  /** Horário de saída do transporte público (padrão: agora). */
  saida?: Date,
): Promise<RotaResumo[]> {
  const ponto = (p: Ponto) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
  return Promise.all(
    modos.map(async (modo): Promise<RotaResumo> => {
      const vazio: RotaResumo = { modo, segundos: null, segundosSemTransito: null, metros: null, polyline: null };
      if (!CHAVE()) return vazio;
      try {
        const comTransito = modo === "DRIVE" || modo === "TWO_WHEELER";
        const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": CHAVE(),
            "X-Goog-FieldMask":
              "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline" +
              (modo === "TRANSIT"
                ? ",routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.transitDetails"
                : ""),
          },
          body: JSON.stringify({
            origin: ponto(origem),
            destination: ponto(destino),
            travelMode: modo,
            ...(comTransito ? { routingPreference: "TRAFFIC_AWARE" } : {}),
            ...(modo === "TRANSIT" && saida ? { departureTime: saida.toISOString() } : {}),
            languageCode: "pt-BR",
            regionCode: "BR",
          }),
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });
        if (!res.ok) {
          const corpo = (await res.json().catch(() => null)) as {
            error?: { status?: string; message?: string };
          } | null;
          const motivo = `Routes API respondeu ${res.status} ${corpo?.error?.status ?? ""}: ${corpo?.error?.message ?? ""}`;
          console.error(`[rotas] ${modo}: ${motivo}`);
          return { ...(await viaDistanceMatrixUmModo(origem, destino, modo)), erro: motivo.slice(0, 300) };
        }
        const json = (await res.json()) as {
          routes?: {
            duration?: string;
            staticDuration?: string;
            distanceMeters?: number;
            polyline?: { encodedPolyline?: string };
            legs?: { steps?: PassoApi[] }[];
          }[];
        };
        const r = json.routes?.[0];
        if (!r) return vazio;
        return {
          modo,
          segundos: duracaoDaApi(r.duration),
          segundosSemTransito: duracaoDaApi(r.staticDuration),
          metros: r.distanceMeters ?? null,
          polyline: r.polyline?.encodedPolyline ?? null,
          ...(modo === "TRANSIT" ? { passos: resumirPassos((r.legs ?? []).flatMap((l) => l.steps ?? [])) } : {}),
        };
      } catch (e) {
        const motivo = `Routes API falhou: ${e instanceof Error ? e.message : String(e)}`;
        console.error(`[rotas] ${modo}: ${motivo}`);
        return { ...(await viaDistanceMatrixUmModo(origem, destino, modo)), erro: motivo.slice(0, 300) };
      }
    }),
  );
}

const emCache = unstable_cache(
  async (o: { lat: number; lng: number }, d: { lat: number; lng: number }, modos: ModoRota[]) => {
    const r = await calcularRotas({ id: "o", lat: o.lat, lng: o.lng }, { id: "d", lat: d.lat, lng: d.lng }, modos);
    // Falha do Google não entra no cache: assim a próxima visita tenta de novo.
    if (r.some((x) => x.erro)) throw Object.assign(new Error("rotas com erro"), { resultado: r });
    return r;
  },
  ["rotas-v4"],
  { revalidate: 1800 },
);

/** calcularRotas com cache de 30 minutos por par de coordenadas e modos (economiza a cota do Google). */
export async function rotasEmCache(
  o: { lat: number; lng: number },
  d: { lat: number; lng: number },
  modos: ModoRota[],
): Promise<RotaResumo[]> {
  try {
    return await emCache({ lat: o.lat, lng: o.lng }, { lat: d.lat, lng: d.lng }, modos);
  } catch (e) {
    const resultado = (e as { resultado?: RotaResumo[] }).resultado;
    if (resultado) return resultado;
    const motivo = `Falha ao calcular: ${e instanceof Error ? e.message : String(e)}`.slice(0, 300);
    console.error(`[rotas] ${motivo}`);
    return modos.map((modo) => ({
      modo,
      segundos: null,
      segundosSemTransito: null,
      metros: null,
      polyline: null,
      erro: motivo,
    }));
  }
}

/**
 * Ônibus e metrô consultados na hora, sem cache: as linhas e os horários dependem de quando a pessoa sai.
 * Saída no passado vira "agora".
 */
export async function transporteNaHora(
  o: { lat: number; lng: number },
  d: { lat: number; lng: number },
  saida?: Date,
): Promise<RotaResumo & { saida: string }> {
  const agora = new Date();
  const quando = saida && saida.getTime() > agora.getTime() ? saida : agora;
  const [r] = await calcularRotas({ id: "o", ...o }, { id: "d", ...d }, ["TRANSIT"], quando);
  return { ...r, saida: quando.toISOString() };
}

/**
 * Plano B quando a Routes API falha: a Distance Matrix API dá tempo e distância (sem o traçado no mapa).
 * Não tem modo moto.
 */
async function viaDistanceMatrixUmModo(origem: Ponto, destino: Ponto, modo: ModoRota): Promise<RotaResumo> {
  const vazio: RotaResumo = { modo, segundos: null, segundosSemTransito: null, metros: null, polyline: null };
  if (modo === "TWO_WHEELER") return vazio;
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", `${origem.lat},${origem.lng}`);
  url.searchParams.set("destinations", `${destino.lat},${destino.lng}`);
  url.searchParams.set("mode", modo === "TRANSIT" ? "transit" : modo === "WALK" ? "walking" : "driving");
  if (modo === "DRIVE") url.searchParams.set("departure_time", "now");
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "br");
  url.searchParams.set("key", CHAVE());
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return vazio;
    const json = (await res.json()) as {
      status: string;
      error_message?: string;
      rows?: {
        elements: {
          status: string;
          duration?: { value: number };
          duration_in_traffic?: { value: number };
          distance?: { value: number };
        }[];
      }[];
    };
    const el = json.rows?.[0]?.elements[0];
    if (json.status !== "OK" || !el || el.status !== "OK") {
      if (json.status !== "OK") console.error(`[rotas] Distance Matrix: ${json.status} ${json.error_message ?? ""}`);
      return vazio;
    }
    return {
      modo,
      segundos: el.duration_in_traffic?.value ?? el.duration?.value ?? null,
      segundosSemTransito: el.duration?.value ?? null,
      metros: el.distance?.value ?? null,
      polyline: null,
    };
  } catch {
    return vazio;
  }
}
