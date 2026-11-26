/**
 * Lê dados públicos de um anúncio de hospedagem a partir do HTML da página:
 * metatags Open Graph e dados estruturados (JSON-LD, schema.org).
 * Função pura (sem rede), para ser testada.
 */

export type DadosAnuncio = {
  nome?: string;
  descricao?: string;
  fotos: string[];
  precoCentavos?: number;
  capacidade?: number;
  endereco?: string;
  lat?: number;
  lng?: number;
};

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodificar(texto: string): string {
  return texto
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m)
    .trim();
}

function atributos(tag: string): Record<string, string> {
  const r: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    r[m[1].toLowerCase()] = decodificar(m[3] ?? m[4] ?? "");
  }
  return r;
}

function metatags(html: string): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = atributos(m[0]);
    const chave = (a.property ?? a.name ?? a.itemprop)?.toLowerCase();
    if (!chave || a.content === undefined) continue;
    mapa.set(chave, [...(mapa.get(chave) ?? []), a.content]);
  }
  return mapa;
}

type Json = Record<string, unknown>;

function blocosJsonLd(html: string): Json[] {
  const objetos: Json[] = [];
  const visitar = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visitar);
    else if (v && typeof v === "object") {
      objetos.push(v as Json);
      const grafo = (v as Json)["@graph"];
      if (grafo) visitar(grafo);
    }
  };
  for (const m of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visitar(JSON.parse(m[1].trim()));
    } catch {
      // JSON-LD inválido: ignora.
    }
  }
  return objetos;
}

function primeiroTexto(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return decodificar(v);
  if (Array.isArray(v)) return primeiroTexto(v[0]);
  return undefined;
}

function urlsDeImagem(v: unknown): string[] {
  if (!v) return [];
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(urlsDeImagem);
  if (typeof v === "object") return urlsDeImagem((v as Json).url ?? (v as Json).contentUrl);
  return [];
}

function numero(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** "R$ 1.234,56", "1234.56" → centavos. Só valores positivos plausíveis. */
function precoParaCentavos(v: unknown): number | undefined {
  if (typeof v === "number") return v > 0 ? Math.round(v * 100) : undefined;
  if (typeof v !== "string") return undefined;
  const s = v.replace(/[^\d.,]/g, "");
  if (!s) return undefined;
  const normalizado = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(s)
      ? s.replace(/\./g, "")
      : s;
  const n = Number(normalizado);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : undefined;
}

function enderecoDoJson(v: unknown): string | undefined {
  if (typeof v === "string") return decodificar(v);
  if (v && typeof v === "object") {
    const a = v as Json;
    const partes = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode]
      .map((p) => primeiroTexto(p))
      .filter(Boolean);
    return partes.length ? partes.join(", ") : undefined;
  }
  return undefined;
}

const TIPOS_HOSPEDAGEM =
  /^(LodgingBusiness|Hotel|Motel|Hostel|Resort|BedAndBreakfast|Campground|VacationRental|Accommodation|House|Apartment|SingleFamilyResidence|Product|Place|LocalBusiness)$/i;

/** Extrai o que der do HTML. Campos ausentes ficam undefined. */
export function extrairDadosDoAnuncio(html: string, urlBase: string): DadosAnuncio {
  const meta = metatags(html);
  const m = (k: string) => meta.get(k)?.[0];
  const dados: DadosAnuncio = { fotos: [] };

  // JSON-LD: o objeto de hospedagem mais completo.
  const objetos = blocosJsonLd(html);
  const tipos = (o: Json) => [o["@type"]].flat().map(String);
  const hospedagem = objetos.find((o) => tipos(o).some((t) => TIPOS_HOSPEDAGEM.test(t)));
  if (hospedagem) {
    dados.nome = primeiroTexto(hospedagem.name);
    dados.descricao = primeiroTexto(hospedagem.description);
    dados.fotos.push(...urlsDeImagem(hospedagem.image ?? hospedagem.photo));
    dados.endereco = enderecoDoJson(hospedagem.address);
    const geo = (hospedagem.geo ?? {}) as Json;
    dados.lat = numero(geo.latitude);
    dados.lng = numero(geo.longitude);
    const oferta = [hospedagem.offers].flat()[0] as Json | undefined;
    dados.precoCentavos = precoParaCentavos(oferta?.price ?? oferta?.lowPrice);
    const ocupacao = hospedagem.occupancy as Json | undefined;
    dados.capacidade = numero(ocupacao?.maxValue ?? hospedagem.maximumAttendeeCapacity ?? hospedagem.numberOfGuests);
  }

  // Open Graph e outras metatags completam o que faltou.
  dados.nome ??=
    m("og:title") ??
    m("twitter:title") ??
    decodificar(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") ??
    undefined;
  dados.descricao ??= m("og:description") ?? m("description") ?? m("twitter:description");
  dados.fotos.push(
    ...(meta.get("og:image") ?? []),
    ...(meta.get("og:image:secure_url") ?? []),
    ...(meta.get("twitter:image") ?? []),
  );
  dados.lat ??= numero(m("place:location:latitude") ?? m("og:latitude"));
  dados.lng ??= numero(m("place:location:longitude") ?? m("og:longitude"));
  dados.precoCentavos ??= precoParaCentavos(m("product:price:amount") ?? m("og:price:amount"));
  dados.endereco ??= [m("og:street-address"), m("og:locality"), m("og:region")].filter(Boolean).join(", ") || undefined;

  // Capacidade escrita no título/descrição ("10 hóspedes", "acomoda 12 pessoas").
  if (dados.capacidade === undefined) {
    const texto = `${dados.nome ?? ""} ${dados.descricao ?? ""}`;
    const c = texto.match(/(\d{1,3})\s*(h[óo]spedes|guests|pessoas)/i);
    if (c) dados.capacidade = Number(c[1]);
  }

  if (!dados.nome) delete dados.nome;
  if (dados.nome) dados.nome = dados.nome.slice(0, 120);
  if (dados.descricao) dados.descricao = dados.descricao.slice(0, 2000);
  if (dados.capacidade !== undefined && !(dados.capacidade > 0 && dados.capacidade < 1000)) delete dados.capacidade;
  if (dados.lat !== undefined && Math.abs(dados.lat) > 90) delete dados.lat;
  if (dados.lng !== undefined && Math.abs(dados.lng) > 180) delete dados.lng;
  if (dados.lat === undefined || dados.lng === undefined) {
    delete dados.lat;
    delete dados.lng;
  }

  // Fotos: URLs absolutas https, sem repetir, no máximo 8.
  const vistas = new Set<string>();
  dados.fotos = dados.fotos
    .map((f) => {
      try {
        return new URL(f, urlBase).toString();
      } catch {
        return "";
      }
    })
    .filter((f) => f.startsWith("https://") && !vistas.has(f) && vistas.add(f))
    .slice(0, 8);

  return dados;
}
