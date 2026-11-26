/** Busca de passagens: links que abrem a busca já preenchida (o site não vende nem reserva). */

import type { Aeroporto } from "./aeroportos";

export type LinkBusca = { rotulo: string; url: string; detalhe: string };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Busca de voo entre dois aeroportos, com ida e volta opcionais (aaaa-mm-dd). Sem ida, abre sem data. */
export function linksDeVoo(
  origem: Aeroporto,
  destino: Aeroporto,
  ida: string | null,
  volta: string | null,
): LinkBusca[] {
  const de = origem.iata;
  const para = destino.iata;
  const temIda = !!ida && DATA.test(ida);
  const temVolta = temIda && !!volta && DATA.test(volta) && volta >= ida!;
  const curta = (d: string) => d.slice(2).replaceAll("-", ""); // 2027-04-01 → 270401
  const google = `Flights from ${de} to ${para}${temIda ? ` on ${ida}` : ""}${temVolta ? ` through ${volta}` : ""}${temIda && !temVolta ? " one way" : ""}`;
  const kayak = `https://www.kayak.com.br/flights/${de}-${para}${temIda ? `/${ida}` : ""}${temVolta ? `/${volta}` : ""}?sort=price_a`;
  const skyscanner = `https://www.skyscanner.com.br/transporte/passagens-aereas/${de.toLowerCase()}/${para.toLowerCase()}/${
    temIda ? `${curta(ida!)}/` : ""
  }${temVolta ? `${curta(volta!)}/` : ""}`;
  return [
    {
      rotulo: "Google Voos",
      url: `https://www.google.com/travel/flights?q=${encodeURIComponent(google)}&hl=pt-BR&curr=BRL`,
      detalhe: "todas as companhias, com gráfico de preço por data",
    },
    { rotulo: "Kayak", url: kayak, detalhe: "ordenado do mais barato" },
    { rotulo: "Skyscanner", url: skyscanner, detalhe: "compara agências e companhias" },
  ];
}

/** "2027-04-01" → "01/04/2027". */
function dataBr(iso: string | null): string {
  if (!iso || !DATA.test(iso)) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** Ônibus: busca do Google pelo trecho e data (mostra as viações e os sites de venda do trecho). */
export function linkDeOnibus(de: string, para: string, ida: string | null): LinkBusca | null {
  if (!de.trim() || !para.trim()) return null;
  const texto = `passagem de ônibus ${de.trim()} para ${para.trim()}${ida ? ` ${dataBr(ida)}` : ""}`;
  return {
    rotulo: "Ônibus no Google",
    url: `https://www.google.com/search?q=${encodeURIComponent(texto)}&hl=pt-BR`,
    detalhe: "mostra as viações e onde comprar o trecho",
  };
}

/**
 * Cidade de um endereço do Google ("Rua X, 10 - Centro, Paraty - RJ, 23970-000, Brasil" → "Paraty, RJ").
 * Sem o padrão "Cidade - UF", devolve null.
 */
export function cidadeDoEndereco(endereco: string | null | undefined): string | null {
  if (!endereco) return null;
  const partes = endereco.split(",").map((p) => p.trim());
  for (const parte of partes) {
    const m = parte.match(/^(.+?)\s+-\s+([A-Z]{2})$/);
    if (m && !/\d/.test(m[1])) return `${m[1]}, ${m[2]}`;
  }
  return null;
}
