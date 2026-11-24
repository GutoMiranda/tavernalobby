/** Tempos de viagem: formatação e "índice de justiça" (tempo médio e máximo do grupo por estalagem). */

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

/**
 * Índice de justiça de uma estalagem: tempo médio e máximo de viagem entre os núcleos considerados.
 * Ignora núcleos sem rota calculada. Retorna null se nenhum tiver tempo.
 */
export function indiceJustica(
  tempos: Tempo[],
  estalagemId: string,
  nucleos?: Set<string>,
): { mediaSegundos: number; maximoSegundos: number; nucleos: number } | null {
  const validos = tempos.filter(
    (t) =>
      t.accommodation_id === estalagemId && t.duration_seconds !== null && (!nucleos || nucleos.has(t.household_id)),
  );
  if (validos.length === 0) return null;
  const segundos = validos.map((t) => t.duration_seconds as number);
  const soma = segundos.reduce((a, b) => a + b, 0);
  return {
    mediaSegundos: Math.round(soma / segundos.length),
    maximoSegundos: Math.max(...segundos),
    nucleos: validos.length,
  };
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
