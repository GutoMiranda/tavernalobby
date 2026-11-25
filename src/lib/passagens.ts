/** Busca de passagens: só links para sites de busca (o site não vende nem reserva) e o resumo dos preços do grupo. */

export type ModoPassagem = "onibus" | "aviao";

export const NOME_MODO_PASSAGEM: Record<ModoPassagem, string> = { onibus: "Ônibus", aviao: "Avião" };

export type BuscaPassagem = { de: string; para: string; ida: string | null; volta: string | null };

export type LinkBusca = { rotulo: string; url: string; detalhe: string };

/** "2027-04-01" → "01/04/2027" (para o texto da busca). */
function dataBr(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** Links de busca já preenchidos com origem, destino e datas quando o site aceita; senão, a página inicial. */
export function linksDeBusca(modo: ModoPassagem, b: BuscaPassagem): LinkBusca[] {
  const de = b.de.trim();
  const para = b.para.trim();
  const ida = dataBr(b.ida);
  const volta = dataBr(b.volta);
  if (modo === "aviao") {
    const texto = `Voos de ${de} para ${para}${b.ida ? ` em ${b.ida}` : ""}${b.volta ? ` volta em ${b.volta}` : ""}`;
    return [
      {
        rotulo: "Google Voos",
        url: `https://www.google.com/travel/flights?q=${encodeURIComponent(texto)}&hl=pt-BR&curr=BRL`,
        detalhe: "compara as companhias, com preço em R$",
      },
      { rotulo: "Skyscanner", url: "https://www.skyscanner.com.br/", detalhe: "busca em vários sites" },
      { rotulo: "Kayak", url: "https://www.kayak.com.br/", detalhe: "alerta de preço grátis" },
    ];
  }
  const texto = `passagem de ônibus de ${de} para ${para}${ida ? ` ${ida}` : ""}${volta ? ` volta ${volta}` : ""}`;
  return [
    {
      rotulo: "Busca no Google",
      url: `https://www.google.com/search?q=${encodeURIComponent(texto)}&hl=pt-BR`,
      detalhe: "mostra as empresas que fazem o trecho",
    },
    { rotulo: "ClickBus", url: "https://www.clickbus.com.br/", detalhe: "várias viações num lugar só" },
    { rotulo: "Buser", url: "https://www.buser.com.br/", detalhe: "fretamento, costuma sair mais barato" },
    { rotulo: "Quero Passagem", url: "https://queropassagem.com.br/", detalhe: "compara viações" },
  ];
}

export type PrecoPassagem = {
  id: string;
  mode: ModoPassagem;
  price_cents: number;
  household_id: string;
  created_at: string;
};

/** Preços ordenados do mais barato para o mais caro (empate: o mais recente primeiro). */
export function ordenarPrecos<T extends PrecoPassagem>(precos: T[]): T[] {
  return [...precos].sort((a, b) => a.price_cents - b.price_cents || b.created_at.localeCompare(a.created_at));
}

/** Menor preço por modo (null quando ninguém registrou). */
export function menorPorModo(precos: PrecoPassagem[]): Record<ModoPassagem, number | null> {
  const menor = (m: ModoPassagem) => {
    const lista = precos.filter((p) => p.mode === m).map((p) => p.price_cents);
    return lista.length ? Math.min(...lista) : null;
  };
  return { onibus: menor("onibus"), aviao: menor("aviao") };
}

/** Aceita só link https (o resto vira vazio). */
export function linkSeguro(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "https:" && t.length <= 500 ? u.toString() : null;
  } catch {
    return null;
  }
}
