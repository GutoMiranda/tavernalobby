/** Formatação no padrão do Brasil: R$ 1.234,56, dd/mm/aaaa, fuso America/Sao_Paulo. */

export const FUSO = "America/Sao_Paulo";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata um valor em centavos (inteiro) como "R$ 1.234,56". */
export function formatarCentavos(centavos: number): string {
  if (!Number.isInteger(centavos)) {
    throw new Error("Valores monetários devem ser inteiros em centavos.");
  }
  // Intl usa espaço não separável depois de "R$"; trocamos por espaço comum.
  return moeda.format(centavos / 100).replace(/ /g, " ");
}

const data = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Formata uma data como "dd/mm/aaaa" no fuso de São Paulo. */
export function formatarData(valor: Date | string): string {
  const d = typeof valor === "string" ? new Date(valor) : valor;
  return data.format(d);
}

/** Formata uma data sem horário ("2027-01-08", tipo `date` do banco) como "08/01/2027", sem mudar de dia por fuso. */
export function formatarDia(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Período "08/01 a 10/01/2027" (ou com anos diferentes, completo). */
export function formatarPeriodo(inicio: string, fim: string): string {
  if (inicio === fim) return formatarDia(inicio);
  if (inicio.slice(0, 4) === fim.slice(0, 4)) return `${formatarDia(inicio).slice(0, 5)} a ${formatarDia(fim)}`;
  return `${formatarDia(inicio)} a ${formatarDia(fim)}`;
}

/** Hoje em São Paulo, no formato "AAAA-MM-DD". */
export function hojeEmSaoPaulo(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}

/** Dias corridos entre duas datas "AAAA-MM-DD" (fim − início). */
export function diasEntre(inicio: string, fim: string): number {
  const ms = Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Número de dias de um período, contando o primeiro e o último (08 a 10 = 3 dias). */
export function diasDoPeriodo(inicio: string, fim: string): number {
  return diasEntre(inicio, fim) + 1;
}
