import "server-only";

import { lookup } from "node:dns/promises";

import { type DadosAnuncio, extrairDadosDoAnuncio } from "./anuncio";
import { ipPrivado } from "./ip-seguro";

const LIMITE_BYTES = 2_000_000;

/** Baixa a página do anúncio com cuidado (só sites públicos, tempo e tamanho limitados). */
async function baixarHtml(link: string): Promise<{ html: string; url: string } | null> {
  let url = new URL(link);
  for (let redirecionamentos = 0; redirecionamentos < 4; redirecionamentos++) {
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const enderecos = await lookup(url.hostname, { all: true }).catch(() => []);
    if (enderecos.length === 0 || enderecos.some((e) => ipPrivado(e.address))) return null;

    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: {
        // Muitos sites só mostram as metatags de pré-visualização para robôs de link.
        "User-Agent": "Mozilla/5.0 (compatible; TavernaOLobby/1.0; +link-preview)",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    }).catch(() => null);
    if (!res) return null;

    if (res.status >= 300 && res.status < 400) {
      const destino = res.headers.get("location");
      if (!destino) return null;
      url = new URL(destino, url);
      continue;
    }
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html") || !res.body) return null;

    // Lê até o limite de tamanho.
    const leitor = res.body.getReader();
    const partes: Uint8Array[] = [];
    let total = 0;
    while (total < LIMITE_BYTES) {
      const { done, value } = await leitor.read();
      if (done) break;
      partes.push(value);
      total += value.length;
    }
    await leitor.cancel().catch(() => {});
    return { html: new TextDecoder().decode(Buffer.concat(partes)), url: url.toString() };
  }
  return null;
}

type LugarEncontrado = { endereco: string; lat: number; lng: number; placeId: string };

/** Procura um lugar pelo nome no Google (Places API New, Text Search), usando a chave do servidor. */
export async function buscarLugarPorTexto(texto: string): Promise<LugarEncontrado | null> {
  const chave = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!chave || !texto.trim()) return null;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": chave,
        "X-Goog-FieldMask": "places.id,places.formattedAddress,places.location",
      },
      body: JSON.stringify({ textQuery: texto, languageCode: "pt-BR", regionCode: "BR", pageSize: 1 }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      places?: { id: string; formattedAddress?: string; location?: { latitude: number; longitude: number } }[];
    };
    const p = json.places?.[0];
    if (!p?.location) return null;
    return {
      endereco: p.formattedAddress ?? texto,
      lat: p.location.latitude,
      lng: p.location.longitude,
      placeId: p.id,
    };
  } catch {
    return null;
  }
}

/** Endereço aproximado a partir de coordenadas (Geocoding API, chave do servidor). */
async function enderecoPorCoordenadas(lat: number, lng: number): Promise<string | null> {
  const chave = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!chave) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("key", chave);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    const json = (await res.json()) as { results?: { formatted_address: string }[] };
    return json.results?.[0]?.formatted_address ?? null;
  } catch {
    return null;
  }
}

export type ResultadoAnuncio = DadosAnuncio & {
  lugarId?: string;
  /** De onde veio a localização: do próprio anúncio ou da busca pelo nome no Google. */
  origemLocal?: "anuncio" | "busca";
  paginaLida: boolean;
};

/** Junta tudo: lê a página do anúncio e, se faltar localização, procura pelo nome no Google. */
export async function preencherPorAnuncio(link: string, nomeDigitado?: string): Promise<ResultadoAnuncio> {
  const pagina = await baixarHtml(link).catch(() => null);
  const dados: ResultadoAnuncio = pagina
    ? { ...extrairDadosDoAnuncio(pagina.html, pagina.url), paginaLida: true }
    : { fotos: [], paginaLida: false };

  if (dados.lat !== undefined && dados.lng !== undefined) {
    dados.origemLocal = "anuncio";
    dados.endereco ??= (await enderecoPorCoordenadas(dados.lat, dados.lng)) ?? undefined;
    return dados;
  }

  // Sem coordenadas: procura pelo endereço do anúncio ou pelo nome (o digitado vale mais).
  const termo = dados.endereco ?? nomeDigitado ?? dados.nome?.split(/[·|–-]/)[0];
  const lugar = termo ? await buscarLugarPorTexto(termo) : null;
  if (lugar) {
    Object.assign(dados, {
      endereco: lugar.endereco,
      lat: lugar.lat,
      lng: lugar.lng,
      lugarId: lugar.placeId,
      origemLocal: "busca",
    });
  }
  return dados;
}
