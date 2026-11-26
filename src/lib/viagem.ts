/** Tempos de viagem: formatação e distância de cada pessoa até a estalagem. */

export type Tempo = {
  household_id: string;
  accommodation_id: string;
  duration_seconds: number | null;
  distance_meters: number | null;
};

/** "3h20", "45 min". */
export function formatarDuracao(segundos: number): string {
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** "250 km", "800 m". */
export function formatarDistancia(metros: number): string {
  if (metros < 1000) return `${metros} m`;
  return `${Math.round(metros / 1000).toLocaleString("pt-BR")} km`;
}

/** Converte "12345s" (formato da Routes API) em segundos. */
export function duracaoDaApi(valor: string | undefined): number | null {
  if (!valor) return null;
  const n = Number(valor.replace(/s$/, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export type ModoMapa = "carro" | "moto" | "transporte" | "a_pe";

/** Link para abrir a rota no Google Maps (app ou site), com trânsito ao vivo e navegação. */
export function linkGoogleMaps(
  origem: { lat: number; lng: number },
  destino: { lat: number; lng: number },
  modo: ModoMapa,
): string {
  const travelmode = modo === "transporte" ? "transit" : modo === "a_pe" ? "walking" : "driving";
  const u = new URL("https://www.google.com/maps/dir/");
  u.searchParams.set("api", "1");
  u.searchParams.set("origin", `${origem.lat},${origem.lng}`);
  u.searchParams.set("destination", `${destino.lat},${destino.lng}`);
  u.searchParams.set("travelmode", travelmode);
  return u.toString();
}

/** Endereço do mapa embutido (Maps Embed API, gratuita) com a rota no modo escolhido. */
export function linkMapaEmbutido(
  chave: string,
  origem: { lat: number; lng: number },
  destino: { lat: number; lng: number },
  modo: ModoMapa,
): string {
  // O mapa embutido não tem modo moto; usa carro.
  const mode = modo === "transporte" ? "transit" : modo === "a_pe" ? "walking" : "driving";
  const u = new URL("https://www.google.com/maps/embed/v1/directions");
  u.searchParams.set("key", chave);
  u.searchParams.set("origin", `${origem.lat},${origem.lng}`);
  u.searchParams.set("destination", `${destino.lat},${destino.lng}`);
  u.searchParams.set("mode", mode);
  u.searchParams.set("language", "pt-BR");
  u.searchParams.set("region", "BR");
  return u.toString();
}

/** Decodifica uma polyline codificada do Google (algoritmo público "Encoded Polyline") em pontos. */
export function decodificarPolyline(codificada: string): { lat: number; lng: number }[] {
  const pontos: { lat: number; lng: number }[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const proximo = () => {
    let resultado = 0;
    let deslocamento = 0;
    let b: number;
    do {
      b = codificada.charCodeAt(i++) - 63;
      resultado |= (b & 0x1f) << deslocamento;
      deslocamento += 5;
    } while (b >= 0x20 && i < codificada.length + 1);
    return resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
  };
  while (i < codificada.length) {
    lat += proximo();
    lng += proximo();
    pontos.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pontos;
}

/** Converte o modo da Routes API para o modo usado nos links do Google Maps. */
export function modoParaMapa(modo: "DRIVE" | "TWO_WHEELER" | "TRANSIT" | "WALK"): ModoMapa {
  return modo === "TWO_WHEELER" ? "moto" : modo === "TRANSIT" ? "transporte" : modo === "WALK" ? "a_pe" : "carro";
}

export type OrigemDaRota = "cidade" | "encontro";

/**
 * De onde sai a rota desenhada no mapa: o que a pessoa escolheu, se existir; senão a cidade do núcleo;
 * senão o ponto de encontro. Sem nenhum dos dois, não há rota.
 */
export function origemDaRota(
  pedida: string | undefined,
  temCidade: boolean,
  temEncontro: boolean,
): OrigemDaRota | null {
  if (pedida === "encontro" && temEncontro) return "encontro";
  if (pedida === "cidade" && temCidade) return "cidade";
  if (temCidade) return "cidade";
  if (temEncontro) return "encontro";
  return null;
}

export type DistanciaDaGalera = { pessoaId: string; nome: string; metros: number | null; emLinhaReta: boolean };

/**
 * "Distância de onde a galera vem" até uma estalagem: uma linha por pessoa (usuário), pela cidade/endereço
 * do núcleo dela. Usa a distância de carro já calculada; sem ela, a distância em linha reta.
 * Quem não tem cidade cadastrada fica no fim, com metros = null. Ordem: do mais perto para o mais longe.
 */
export function distanciasDaGalera(
  pessoas: { id: string; name: string; household_id: string }[],
  nucleos: { id: string; origin_lat: number | null; origin_lng: number | null }[],
  tempos: Tempo[],
  estalagem: { id: string; lat: number | null; lng: number | null },
): DistanciaDaGalera[] {
  const nucleo = new Map(nucleos.map((n) => [n.id, n]));
  return pessoas
    .map((p): DistanciaDaGalera => {
      const n = nucleo.get(p.household_id);
      const carro = tempos.find((t) => t.household_id === p.household_id && t.accommodation_id === estalagem.id);
      if (carro?.distance_meters != null)
        return { pessoaId: p.id, nome: p.name, metros: carro.distance_meters, emLinhaReta: false };
      if (n?.origin_lat != null && n.origin_lng != null && estalagem.lat != null && estalagem.lng != null) {
        const metros = Math.round(linhaRetaKm(n.origin_lat, n.origin_lng, estalagem.lat, estalagem.lng) * 1000);
        return { pessoaId: p.id, nome: p.name, metros, emLinhaReta: true };
      }
      return { pessoaId: p.id, nome: p.name, metros: null, emLinhaReta: false };
    })
    .sort((a, b) => (a.metros ?? Infinity) - (b.metros ?? Infinity) || a.nome.localeCompare(b.nome, "pt-BR"));
}

function linhaRetaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const h =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
