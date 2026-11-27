/**
 * Passo a passo do transporte público (linhas de ônibus, metrô e trem) a partir da resposta da Routes API.
 * Funções puras, sem acesso à rede.
 */
import { duracaoDaApi, formatarDuracao } from "./viagem";

export type PassoTransporte =
  | { tipo: "a_pe"; segundos: number }
  | {
      tipo: "linha";
      /** Ônibus, Metrô, Trem… */
      veiculo: string;
      /** Código curto da linha (ex.: "381", "Linha 10") ou o nome. */
      linha: string;
      /** Nome por extenso ou sentido (ex.: "Rio Grande da Serra"). */
      sentido: string | null;
      de: string | null;
      para: string | null;
      paradas: number | null;
      partida: string | null;
      chegada: string | null;
      cor: string | null;
      corTexto: string | null;
    };

/** Formato (parcial) de um passo da Routes API pedido com transitDetails. */
export type PassoApi = {
  travelMode?: string;
  staticDuration?: string;
  transitDetails?: {
    stopDetails?: { departureStop?: { name?: string }; arrivalStop?: { name?: string } };
    localizedValues?: { departureTime?: { time?: { text?: string } }; arrivalTime?: { time?: { text?: string } } };
    headsign?: string;
    stopCount?: number;
    transitLine?: {
      name?: string;
      nameShort?: string;
      color?: string;
      textColor?: string;
      vehicle?: { type?: string; name?: { text?: string } };
    };
  };
};

const VEICULO: Record<string, string> = {
  BUS: "Ônibus",
  INTERCITY_BUS: "Ônibus",
  TROLLEYBUS: "Ônibus",
  SUBWAY: "Metrô",
  METRO_RAIL: "Metrô",
  HEAVY_RAIL: "Trem",
  COMMUTER_TRAIN: "Trem",
  RAIL: "Trem",
  HIGH_SPEED_TRAIN: "Trem",
  LONG_DISTANCE_TRAIN: "Trem",
  TRAM: "VLT",
  MONORAIL: "Monotrilho",
  FERRY: "Balsa",
};

/** Junta as caminhadas seguidas num passo só e transforma cada trecho de veículo numa linha. */
export function resumirPassos(passos: PassoApi[]): PassoTransporte[] {
  const r: PassoTransporte[] = [];
  for (const p of passos) {
    const t = p.transitDetails;
    if (p.travelMode === "TRANSIT" && t) {
      const linha = t.transitLine;
      const tipo = linha?.vehicle?.type ?? "";
      r.push({
        tipo: "linha",
        veiculo: VEICULO[tipo] ?? linha?.vehicle?.name?.text ?? "Transporte",
        linha: linha?.nameShort || linha?.name || "Linha",
        sentido: t.headsign || (linha?.nameShort && linha?.name ? linha.name : null),
        de: t.stopDetails?.departureStop?.name ?? null,
        para: t.stopDetails?.arrivalStop?.name ?? null,
        paradas: t.stopCount ?? null,
        partida: t.localizedValues?.departureTime?.time?.text ?? null,
        chegada: t.localizedValues?.arrivalTime?.time?.text ?? null,
        cor: linha?.color ?? null,
        corTexto: linha?.textColor ?? null,
      });
    } else {
      const s = duracaoDaApi(p.staticDuration) ?? 0;
      const ultimo = r[r.length - 1];
      if (ultimo?.tipo === "a_pe") ultimo.segundos += s;
      else r.push({ tipo: "a_pe", segundos: s });
    }
  }
  // Caminhadas de menos de 1 minuto só poluem a lista.
  return r.filter((p) => p.tipo !== "a_pe" || p.segundos >= 60);
}

/** Texto para compartilhar a rota (WhatsApp etc.): resumo, passo a passo do transporte e o link do Google Maps. */
export function textoDaRota(opcoes: {
  de: string;
  para: string;
  modo: string;
  segundos: number | null;
  passos?: PassoTransporte[];
  /** Ex.: "saindo em 27/11/2026, 08:30" (horários do transporte público). */
  quando?: string;
  link: string;
}): string {
  const linhas = [
    `🗺️ Rota de ${opcoes.de} até ${opcoes.para}`,
    `${opcoes.modo}${opcoes.segundos != null ? `: cerca de ${formatarDuracao(opcoes.segundos)}` : ""}${
      opcoes.quando ? `, ${opcoes.quando}` : ""
    }`,
  ];
  if (opcoes.passos?.length) {
    linhas.push("");
    opcoes.passos.forEach((p, i) => {
      linhas.push(
        p.tipo === "a_pe"
          ? `${i + 1}. A pé, ${formatarDuracao(p.segundos)}`
          : `${i + 1}. ${p.partida ? `${p.partida} · ` : ""}${p.veiculo} ${p.linha}${p.sentido ? ` (sentido ${p.sentido})` : ""}${
              p.de ? `: de ${p.de}` : ""
            }${p.para ? ` até ${p.para}` : ""}${p.paradas ? `, ${p.paradas} paradas` : ""}`,
      );
    });
  }
  linhas.push("", `Abrir no Google Maps: ${opcoes.link}`);
  return linhas.join("\n");
}
