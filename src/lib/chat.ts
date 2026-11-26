/**
 * Regras puras do chat geral (fase 3): menções com @, destaque no texto, filtros e rótulos de dia.
 */
import { FUSO, hojeEmSaoPaulo } from "@/lib/format";

/** Sem acentos e em minúsculas, para buscar nomes ("Júlia" acha com "jul"). */
export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Menção sendo digitada: o trecho depois do último "@" antes do cursor, se ele começa uma palavra
 * e não tem quebra de linha. Ex.: "oi @Bi" → { inicio: 3, busca: "Bi" }. Sem menção em curso → null.
 */
export function mencaoEmCurso(textoAteCursor: string): { inicio: number; busca: string } | null {
  const m = /(^|\s)@([^\s@][^@\n]{0,29}|)$/u.exec(textoAteCursor);
  if (!m) return null;
  const busca = m[2];
  if (busca.split(" ").length > 3) return null;
  return { inicio: m.index + m[1].length, busca };
}

/** Membros que combinam com a busca: primeiro os que começam com ela, depois os que contêm. Máximo 6. */
export function sugerirMembros<T extends { id: string; name: string }>(
  busca: string,
  membros: T[],
  euId?: string,
): T[] {
  const b = semAcento(busca.trim());
  const outros = membros.filter((m) => m.id !== euId);
  const comeca = outros.filter((m) => semAcento(m.name).startsWith(b));
  const contem = outros.filter((m) => !comeca.includes(m) && semAcento(m.name).includes(b));
  return [...comeca, ...contem].slice(0, 6);
}

/** Mantém só as menções cujo "@Nome" ainda está no texto (a pessoa pode ter apagado). */
export function mencoesNoTexto<T extends { id: string; name: string }>(texto: string, mencionados: T[]): string[] {
  return [...new Set(mencionados.filter((m) => texto.includes(`@${m.name}`)).map((m) => m.id))];
}

export type Trecho = { texto: string; mencao?: string };

/** Quebra o texto em trechos, marcando cada "@Nome" de quem foi mencionado (nomes mais longos primeiro). */
export function trechosComMencoes(texto: string, mencionados: { id: string; name: string }[]): Trecho[] {
  const nomes = [...mencionados].sort((a, b) => b.name.length - a.name.length);
  if (nomes.length === 0) return [{ texto }];
  const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`@(${nomes.map((n) => escapar(n.name)).join("|")})`, "g");
  const trechos: Trecho[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(re)) {
    if (m.index > ultimo) trechos.push({ texto: texto.slice(ultimo, m.index) });
    const pessoa = nomes.find((n) => n.name === m[1]);
    trechos.push({ texto: m[0], mencao: pessoa?.id });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) trechos.push({ texto: texto.slice(ultimo) });
  return trechos;
}

const formatoDia = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const formatoHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
const diaIso = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(d);

/** "Hoje", "Ontem" ou "dd/mm/aaaa", no fuso de São Paulo. */
export function rotuloDoDia(instante: string, agora: Date = new Date()): string {
  const dia = diaIso(new Date(instante));
  const hoje = hojeEmSaoPaulo(agora);
  const ontem = diaIso(new Date(Date.parse(`${hoje}T12:00:00-03:00`) - 86_400_000));
  if (dia === hoje) return "Hoje";
  if (dia === ontem) return "Ontem";
  return formatoDia.format(new Date(instante));
}

export function horaDaMensagem(instante: string): string {
  return formatoHora.format(new Date(instante));
}

export type MensagemChat = {
  id: string;
  author_person_id: string;
  body: string;
  is_question: boolean;
  reply_to: string | null;
  resolved_at: string | null;
  deleted_at: string | null;
  created_at: string;
  mencoes: string[];
};

export type FiltroChat = "tudo" | "duvidas" | "mencoes";

export function filtrarMensagens(mensagens: MensagemChat[], filtro: FiltroChat, euId: string): MensagemChat[] {
  if (filtro === "duvidas") return mensagens.filter((m) => m.is_question && !m.resolved_at && !m.deleted_at);
  if (filtro === "mencoes") return mensagens.filter((m) => m.mencoes.includes(euId));
  return mensagens;
}
